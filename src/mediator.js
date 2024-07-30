const { Servient, Helpers } = require('@node-wot/core');
const { HttpClientFactory } = require('@node-wot/binding-http');
const express = require('express');
const bodyParser = require('body-parser'); 

const urdf = require('urdf');
const { v4: uuidv4 } = require('uuid');

// it is smarter to use axios than to realise get requests with express
const axios = require('axios');

// N3 modules for creating turtle RDF
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, blankNode, defaultGraph, quad } = DataFactory;

//const fs = require('fs'); 
//const path = require('path');

const app = express();
app.use(bodyParser.text({ type: 'text/turtle' }));

// evaluation modulea and variables
//const {performance} = require('perf_hooks');
//let eval_counter_p = 1;
//let eval_counter_w = 1;
//let eval_counter_a = 1;

// communication protocols and ports between mediator and TD interface
// port of mediator
const port_med = 4242;
// port of thing
const port_thing = 4200;
// ip of mediator
const ip = "192.168.178.20";
const ip_med = ip;

// ip of thing simulator
const ip_thing = ip;

// create servient and use it as http client
const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
const WoTHelpers = new Helpers(servient);


// all TDs that should be load: just the names for initialization
const all_TDs = [
    "thing1",
    "thing2",
    "thing3",
    "thing4",
    "thing5",
    "thing6"
];

// includes all consumed TDs
const consumed_TDs = {};

// Static initialisation of the TDs
function initConnection() {
    for (const td_name of all_TDs) {
        WoTHelpers.fetch(`http://${ip_thing}:${port_thing}/${td_name}`).then(async (td_tmp) => {
            try {
                servient.start().then(async WoT => {
                    console.log(`Thing Description ${td_name} of simulated sensor is consumed...`);
                    const thing = await WoT.consume(td_tmp);
                    consumed_TDs[td_name] = thing;
                });
            } catch (err) {
                console.error("Script Error: initConnection() - ", err);
            }
        }).catch((err) => {
            console.error("Fetch Error: ", err);
        });
    }
}


/*   === MAPPING VALUES ===   */
// returns the UTC
function timeStamp() {
    return (new Date()).toISOString().slice(0,19);
}

// return the unit
async function getUnit(td_number, td_property) {
    return td_number.getThingDescription().properties[td_property].unit;
}

// returns the value of the thing
async function getValue(td_number, td_property) {
    // evaluation
    //let eval_start = performance.now();

    const read_value = await td_number.readProperty(td_property);
    
    // Evaluation Property
    //let eval_end    = performance.now();
    //let eval_result = eval_end - eval_start;
    //console.log(eval_result);
    //eval_counter_p += 1;
    
    return await read_value.value();
}

// return the data type of the thing property - it's a mapping from JSON to XSD
async function getDataType(td_number, td_property, td_value) {
    // special case for array as datatype: td_number and td_property are null in this case
    if(td_number === null && td_property === null) {
        if(typeof td_value === "number") {
            if(Number.isInteger(td_value)) {
                return "integer";
            } else {
                return "decimal";
            }
        } else {
            return
        }
    }

    let data_type = await td_number.getThingDescription().properties[td_property].type;

    // 'undefined' will be handled in function 'map_values_to_RDF' as well as 'null'
    if(!(data_type !== undefined) || data_type === null) return data_type;

    // mapped data type 'number' to 'integer' or 'decimal'
    if(data_type === "number") {
        if(Number.isInteger(td_value)) {
            return "integer";
        } else {
            return "decimal";
        }
    }
    return data_type;
}

// creates the 'Observation' triple
function createObservationQuad(writer, blankNodeId) {
    const predicate = namedNode('rdf:type');
    const object = namedNode('sosa:Observation');
    writer.addQuad(blankNodeId, predicate, object);
}

// creates the timestamp triple
function createTimeStampQuad(writer, blankNodeId, time) {
    const predicate = namedNode('sosa:resultTime');
    const object = literal(time, namedNode('xsd:dataTimeStamp'));
    writer.addQuad(quad(blankNodeId, predicate, object));
}

// merges all triples into one RDF file
function createResultTypeQuad(writer, listId, unit, value, dtype, list, blankNodeId) {
    const pred_rdf = namedNode('rdf:type');
    const obj_val = namedNode('qudt:QuantityValue');
    const pred_unit = namedNode('qudt:unit');
    const obj_unit = namedNode(`qudt-unit:${unit}`);
    const pred_val = namedNode('qudt:numericValue');

    let type_of_result = namedNode('sosa:hasSimpleResult');
    let type_of_value = literal(value);
    
    if(unit != null) {
        type_of_result = namedNode('sosa:hasResult');
    }
    type_of_value = literal(value, namedNode(`xsd:${dtype}`));

    if(list == true) {
        type_of_value = listId;
    }

    writer.addQuad(quad(
        blankNodeId, type_of_result, 
        writer.blank([
            { predicate: pred_rdf, object: obj_val },
            { predicate: pred_unit, object: obj_unit },
            { predicate: pred_val, object: type_of_value }
    ])));
}

// based on an array of data types in a TD, an RDF list is created here
async function createRDFList(writer, listId, values, dtype) {
    let lastListNode = listId;

    for (let i = 0; i < values.length; i++) {
        const currentListNode = blankNode();
        const pred_first = namedNode('rdf:first');
        const pred_rest = namedNode('rdf:rest');
        const pred_nil = namedNode('rdf:nil');
        let obj_curLsN = currentListNode;

        // last list element is rdf:nil
        if(i === values.length-1) {
            obj_curLsN = pred_nil;
        }

        dtype = await getDataType(null, null, values[i]);

        let obj_val = literal(values[i], namedNode(`xsd:${dtype}`));

        if(dtype == null) {
            obj_val = literal(values[i]);
        }

        writer.addQuad(quad(lastListNode, pred_first, obj_val));
        writer.addQuad(quad(lastListNode, pred_rest, obj_curLsN));

        lastListNode = currentListNode;
    }
}

// returns all property information in turtle format
async function map_values_to_RDF(td_number, td_property) {
    return new Promise(async (resolve, reject) => {
        let time = timeStamp();
        let unit = await getUnit(td_number, td_property);
        let value = await getValue(td_number, td_property);
        let dtype = await getDataType(td_number, td_property, value);

        const writer = new N3.Writer({ prefixes: {
            sosa: 'https://www.w3.org/ns/sosa/',
            rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            qudt: 'https://qudt.org/2.1/schema/qudt#',
            'qudt-unit': 'http://qudt.org/2.1/vocab/unit#',
            xsd: 'https://www.w3.org/2001/XMLSchema#'
        }});

        const blankNodeId = blankNode(); 
        createObservationQuad(writer, blankNodeId); 

        // check if array exisits
        list = false;
        const listId = blankNode();
        if(dtype === "array") {
            arr_dtype = await td_number.getThingDescription().properties[td_property].items.type; 
            await createRDFList(writer, listId, value, arr_dtype); 
            list = true;
        }
        
        createResultTypeQuad(writer, listId, unit, value, dtype, list, blankNodeId); 
        createTimeStampQuad(writer, blankNodeId, time); 

        writer.end((error, result) => {
            if(error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

/*   === HOSTING ===   */
// allowed URLs: represent the thing descriptions
const whitelist = [
    "/thing1", 
    "/thing1/temperature",
    "/thing2",
    "/thing2/temperature",
    "/thing2/status",
    "/thing3",
    "/thing3/temperature",
    "/thing3/barometer",
    "/thing3/lightIntensity",
    "/thing4",
    "/thing4/temperature",
    "/thing5",
    "/thing5/rpm",
    "/thing6",
    "/thing6/statusSimple"
];

// This whitelist contains the paths for GET requests
const href_list = [
    "/thing1/temperature",
    "/thing2/temperature",
    "/thing2/status",
    "/thing3/temperature",
    "/thing3/barometer",
    "/thing3/lightIntensity",
    "/thing4/temperature",
    "/thing5/rpm",
    "/thing6/statusSimple"
];

// client-side Requests: using express as http api
app.listen(port_med, () => {
    console.log(`Mediator listen at http://${ip_med}:${port_med}`);
    initConnection();
});

 
/**
 *  Two scenarios:
 *  1.  If the 'path' corresponds to a property query, it performs data mapping
 *      and sends the mapped data as a response to the client.
 *  2.  the second scenario provides the current ThingDescription but is not 
 *      essential for the core functionality.
 */
whitelist.forEach(path => {
    app.get(path, (req, res) => {
        if(href_list.includes(`${path}`)) {
            // split path in two components: first the name of the TD and second the property of the TD
            const cur_path = path;
            const split_path = cur_path.split("/");
            const td_nr = split_path[1];
            const td_prop = split_path[2];

            // call of data mapping function
            const res_rdf_mapping = map_values_to_RDF(consumed_TDs[td_nr], td_prop);

            // send mapped data as response to client
            res_rdf_mapping.then(value => {
                res.setHeader('Content-Type', 'text/turtle');
                res.status(200).send(value);
            }).catch(error => {
                console.error(error);
                res.status(500).send('Internal Server Error');
            });
        } else {
            axios.get(`http://${ip_thing}:${port_thing}${path}`)
                .then(response => {
                    res.status(200).send(response.data);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send('Internal Server Error');
                });
        }
    });
});

// Fallback-Handler: for all requests that are not in the whitelist
app.get('*', (req, res) => {
    console.log("get_link_whitelist: FALLBACK HANDLER: ", get_link_whitelist);
    res.status(404).send('Not Found');
});

// helper to map string to the right datatype of the value
function map_to_value(value, datatype) {
    switch(datatype) {
        case "string":
            return value;
        case "boolean":
            return (datatype === 'true');
        case "integer":
            return parseInt(value);
        case "double":
            return parseFloat(value);
        default:
            return null;
    }}

// execute SPARQL query
async function execute_SPARQL_query(turtle_req) {
    try {
        await urdf.load(turtle_req);
        const query = `
            PREFIX aio: <https://storage.inrupt.com/3bedf714-7aba-402e-af9b-1c2591bfcafd/ActionableIoTOntology.ttl#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

            SELECT ?input ?dtype ?io ?operation
            WHERE 
            {
                [] rdf:type ?operation ;
                aio:status "initialization" ;
                aio:resultTime "N/A" .
                OPTIONAL 
                { 
                    {
                    [] aio:hasInvocationOutput [ rdf:type ?dtype ; rdf:value "N/A" ] . 
                    BIND("aio:hasInvocationOutput" AS ?io) 
                    }
                    UNION
                    { 
                    [] aio:hasInvocationInput [ rdf:type ?dtype ; rdf:value ?input ] .
                    BIND("aio:hasInvocationInput" AS ?io)
                    }
                }
            }
        `;
        results = await urdf.query(query);

        // extract all relevant information
        let res_arr = [];

        // in case there are input and output, the array has at least two entries
        if(results.length <= 0) {
            console.error("No Input received!");
            return null;
        }
        for(let i = 0; i < results.length; i++) {
            let datatype = null;
            let ioValue = null;
            let inputValue = null;
            let opURI = null;

            const resultItem = results[i];
            
            // checks whether a valid operation was sent
            if(resultItem.hasOwnProperty('operation')) {
                opURI = resultItem.operation.value.split('#')[1];
                if(!(opURI === 'ActionInvocationInteraction') && !(opURI === 'WritePropertyInteraction') && !(opURI === 'EventSubscriptionInteraction')) {
                    console.error("Don't found ActionInvocationInteraction or WritePropertyInteraction or EventSubscriptionInteraction!");
                    return;
                }
            }
            
            // checks which datatype was sent
            if(resultItem.hasOwnProperty('dtype')) {
                const dtypeURI = resultItem.dtype.value;
                datatype = dtypeURI.split('#')[1];
            }

            // checks whether a ssn:input or ssn:output value was sent
            if(resultItem.hasOwnProperty('io')) {
                ioValue = resultItem.io.value;
            }

            // checks which value was sent
            if(resultItem.hasOwnProperty('input')) {
                let val = resultItem.input.value;
                inputValue = map_to_value(val, datatype);
                if(val === null) {
                    console.log("No valid datatype");
                    return null;
                }
            }
            res_arr.push([datatype, ioValue, inputValue, opURI]);
        }
        return res_arr;
    } catch(err) {
        console.error("executeSPARQLQuery", err);
    } finally {
        urdf.clear();
    }
} 

/**
 * Example of different cases for interactions:
 * moveMotor: in-/output
 * setTemperatureThreshold: input
 * getMotorStatus: output
 * stopMotor: no in/ouput
 * thing2/status: for writeproperty
 * thing1/overheating: for events
 */
const post_whitelist = [
    "/thing5/moveMotor",
    "/thing5/setTemperatureThreshold",
    "/thing5/getMotorStatus",
    "/thing5/stopMotor",
    "/thing2/status",
    "/thing1/overheating",
    "/thing6/statusWrite"
];

// Secures assigned unique numbers of requests
// req_map: map all unique paths with a rdf file
// del_map: save all paths and subscriptions of events to delete them later
let req_map = new Map();
let del_map = new Map();

// all current states of requests are stored here as path+UUID
// if you send a requests, it will store a specific path, where
// you can request your state of the thing
let get_link_whitelist = [];
let delete_link_whitelist = [];

function load_get_link_whitelist() {
    get_link_whitelist.forEach(path => {
        app.get(path, (req, res) => {
            // returns the current state of the turtle file: running or finished
            let rdf_cur_state = req_map.get(path);
            res.setHeader('Content-Type', 'text/turtle');
            res.status(200).send(rdf_cur_state);
        })
    });
}

// when an event is unsubscribed, the whitelist must be reloaded
function load_delete_link_whitelist() {
    delete_link_whitelist.forEach(path => {
        app.delete(path, async (req, res) => {
            const subscription = del_map.get(path);
            try{
                // 1. unsubscribe event
                await subscription.unsubscribeEvent();

                // 2. remove link_path from map
                req_map.delete(path);
                del_map.delete(path);

                // 2. remove link_path from get_link_whitelist
                let idx_to_remove_get = get_link_whitelist.indexOf(path);
                if(idx_to_remove_get !== -1) {
                    get_link_whitelist.splice(idx_to_remove_get, 1);
                }

                // 3. remove link_path from delete_link_whitelist
                let idx_to_remove_delete = delete_link_whitelist.indexOf(path);
                if(idx_to_remove_delete !== -1) {
                    delete_link_whitelist.splice(idx_to_remove_delete, 1);
                }
                res.status(204).send();
            } catch(error) {
                console.error("unsubscribeEvent failed:", error);
                res.status(500).send("Internal Server Error");
            }
        });
    });
}

// sets the state running to finished when the response of the server received
function set_status_finished(link_path) {
    let rdf_req_run = req_map.get(link_path);
    let rdf_req_fin = rdf_req_run.replace("running", "finished");
    req_map.set(link_path, rdf_req_fin);
}

// event Handler is executed by the function map_value_events as soon as a subscribeEvent occurs
async function handle_events(data, link_path) {
    let value = await data.value();
    let updated_output = update_value_rdf(link_path, value);
    let updated_timeStamp = update_time_rdf(updated_output);
    req_map.set(link_path, updated_timeStamp);
}

// initializied incoming values from event to RDF file
async function map_value_events(thing_name, thing_event, link_path) {
    try {
        const td = consumed_TDs[thing_name];
        const eventSubscription = await td.subscribeEvent(thing_event, (data) => {
            handle_events(data, link_path);
        });
        del_map.set(link_path, eventSubscription);
    } catch(error) {
        console.error("map_value_events failed:", error);
    }
}

// update value of rdf file
function update_value_rdf(link_path, value) {
    let received_output = req_map.get(link_path);
    let resultValueMatch = received_output.match(/rdf:value (.*?) /);
    resultValueMatch = resultValueMatch[0];
    let replaced_value = received_output.replace(resultValueMatch, `rdf:value ${value} `);
    return replaced_value;
}

// update timestamp of rdf file
function update_time_rdf(updated_output) {
    let resultTimeMatch = updated_output.match(/aio:resultTime .*xsd:dataTimeStamp /);
    resultTimeMatch = resultTimeMatch[0];
    let replaced_time = updated_output.replace(resultTimeMatch, `aio:resultTime "${timeStamp()}"^^xsd:dataTimeStamp `);
    return replaced_time;
}

/**
 * Main function for any POST requests. The function handles the interactions 
 * wirteProperty, actionInvocation as well as subscribeEvent.
 */
post_whitelist.forEach(path => {
    app.post(path, async (req, res) => {
        // *** PREPROCESSING ***
        const rdf_req = req.body;

        // returns the form: [[datatype, ioValue, inputValue, opURI]]
        let sparql_res = await execute_SPARQL_query(rdf_req);

        // generate unique ID for status
        // in the unlikely event that the uuid already exists, a new one is searched for in while-loop
        let requestId = uuidv4();
        while(req_map.has(requestId)) {
            requestId = uuidv4();
        }

        // set link for HTTP response-header
        let link_path = `${path}/${requestId}`;
        let full_link_path = `http://${ip_med}:${port_med}${link_path}`;

        // set new resource in location
        res.set('Location', `${full_link_path}`);

        // update status and timestamp and sets link to whitelist
        let rdf_req_run = rdf_req.replace("initialization", "running");
        rdf_req_run = rdf_req_run.replace(`aio:resultTime "N/A"`, `aio:resultTime "${timeStamp()}"^^xsd:dataTimeStamp`);
        req_map.set(link_path, rdf_req_run);
        get_link_whitelist.push(link_path);

        // just load the whitelist for new paths for GET requests
        load_get_link_whitelist();

        // send new Link (ressource) to client
        res.status(201).send("Resource created successfully");


        // *** INTERACTIONS ***
        // Event Subscribe Interaction
        if(sparql_res[0][3] === 'EventSubscriptionInteraction') {
            let split_path = path.split('/');
            let thing_name = split_path[1];
            let thing_event = split_path[2];

            // it is easier to remember the event paths directly in order to be able to tidy them up again later
            delete_link_whitelist.push(link_path);
            load_delete_link_whitelist();
            return map_value_events(thing_name, thing_event, link_path);
        }

        let i_value = undefined;
        // input_helper should help to find the right position of input field and if it is set as well
        // the problem is, that there is no order - that's the reason for this weird loop
        let input_helper = -1;
        let output_helper = -1;
        for(let i = 0; i < sparql_res.length; i++) {
            if(sparql_res[i][1] === "aio:hasInvocationInput") {
                i_value = sparql_res[i][2];
                input_helper = i;
            }
            if(sparql_res[i][1] === "aio:hasInvocationOutput") {
                output_helper = i;
            }
        }

        // Write Property Interaction
        if(sparql_res[0][3] === 'WritePropertyInteraction') {
            let split_path = path.split('/');
            let thing_name = split_path[1];
            let thing_action = split_path[2];
            const td = consumed_TDs[thing_name];

            try {
                // evaluation
                //let eval_start = performance.now();

                await td.writeProperty(thing_action, {value: i_value });

                // Evaluation Write
                //let eval_end    = performance.now();
                //let eval_result = eval_end - eval_start;
                //console.log(eval_result);
                //eval_counter_w += 1;
 
                set_status_finished(link_path);
            } catch(err) {
                req_map.delete(requestId);
                console.error("WritePropertyInteraction Error:", err);
            }
        }


        // Action Invocation Interaction
        if(sparql_res[0][3] === 'ActionInvocationInteraction') {
            let split_path = path.split('/');
            let thing_name = split_path[1];
            let thing_action = split_path[2];
            const td = consumed_TDs[thing_name];

            // case: no input and no output
            if(input_helper === -1 && output_helper === -1) {
                try {
                    // evaluation
                    //let eval_start = performance.now();

                    await td.invokeAction(thing_action);

                    // Evaluation Action
                    //let eval_end    = performance.now();
                    //let eval_result = eval_end - eval_start;
                    //console.log(eval_counter_a, " ", eval_result);
                    //eval_counter_a += 1;
                    set_status_finished(link_path);
                } catch (err) {
                    req_map.delete(requestId);
                    console.error("ActionInvocationInteraction: No Input No Output. Error:", err);
                }
            }
            // case: just input
            if(input_helper >= 0 && output_helper === -1) {
                try {
                    let send_input = {value: i_value};
                    await td.invokeAction(thing_action, send_input);
                    set_status_finished(link_path);
                } catch (err) {
                    req_map.delete(requestId);
                    console.error("ActionInvocationInteraction: Just Input. Error:", err);
                }
            }
            // case: just output
            if(output_helper >= 0 && input_helper === -1) {
                try {
                    let o_result = await td.invokeAction(thing_action);
                    let wait_o_result = await o_result.value();

                    // set output value
                    let received_output = req_map.get(link_path);
                    let updated_output = received_output.replace(`rdf:value "N/A"`, `rdf:value ${wait_o_result}`);

                    // update timestamp
                    let resultTimeMatch = updated_output.match(/aio:resultTime .*xsd:dataTimeStamp /);
                    let updated_timeStamp = updated_output.replace(resultTimeMatch, `aio:resultTime "${timeStamp()}"^^xsd:dataTimeStamp`);
                    req_map.set(link_path, updated_timeStamp);

                    // update status
                    set_status_finished(link_path);
                } catch (err) {
                    req_map.delete(requestId);
                    console.error("ActionInvocationInteraction: Just Output. Error:", err);
                }
            }
            // case: input and output
            if(input_helper >= 0 && output_helper >= 0) {
                try {
                    let send_input = {value: i_value};
                    let io_result = await td.invokeAction(thing_action, send_input);
                    let wait_io_result = await io_result.value();

                    // set output value
                    let received_output = req_map.get(link_path);
                    let updated_output = received_output.replace(`rdf:value "N/A"`, `rdf:value ${wait_io_result}`);

                    // update timestamp
                    let resultTimeMatch = updated_output.match(/aio:resultTime .*xsd:dataTimeStamp /);
                    let updated_timeStamp = updated_output.replace(resultTimeMatch, `aio:resultTime "${timeStamp()}"^^xsd:dataTimeStamp`);
                    req_map.set(link_path, updated_timeStamp);

                    // update status
                    set_status_finished(link_path);
                 } catch (err) {
                    req_map.delete(requestId);
                    console.error("ActionInvocationInteraction: Input and Output. Error:", err);
                }

            }
        }
    });
});



