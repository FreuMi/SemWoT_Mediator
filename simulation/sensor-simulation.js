/* this http server simulates a sensor (a thing) that generates random (here) temperature values and returns them when queried.*/

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const port = 4200;
const ip = "192.168.178.20";

// function to generate random value between min and max in float
// to generate floating numbers JSON offers 'number' as datatype
function random_value_float() {
    let min = 0.0;
    let max = 200.0;
    return (Math.random() * (max-min) + min);
}

// function to generate random value between min and max in integer
// JSON include integer
function random_value_integer() {
    let min = 0;
    let max = 200;
    return Math.floor(Math.random() * (max-min) + min);
}

// function to generate an array with random values
// check: array with different data types as well as a mix of data types
function random_array() {
    const arr = [];
    for(let i = 0; i < 5; i++) {
        arr.push(random_value_integer());
    }
    return arr;
}

app.listen(port, () => {
    console.log(`listening at http://${ip}:${port}`);
})


// thing1: (number) integer
app.get('/thing1', (req, res) => {
    const td1_path = path.join(__dirname, 'examples/thing1.jsonld');
    fs.readFile(td1_path, (err, data) => {
        if (err) {
           console.error(err);
           res.status(500).send('Internal Server Error');
       } else {
           // converting JSON to JavaScript
           let td_thing1 = JSON.parse(data);
           td_thing1.properties.temperature.forms[0].href = `http://${ip}:${port}/thing1/temperature`;
           td_thing1.events.overheating.forms[0].href = `http://${ip}:${port}/thing1/overheating`;
           res.send(td_thing1);
       }
   });  
});

app.get('/thing1/temperature', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_value_integer());
});

let temp = 0;

// case: TD events
app.get('/thing1/overheating', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    temp += 20;
    res.send(temp);
});

// thing2: number (double)
app.get('/thing2', (req, res) => {
    const td2_path = path.join(__dirname, 'examples/thing2.jsonld');
    fs.readFile(td2_path, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // converting JSON to JavaScript
            let td_thing2 = JSON.parse(data);

            // just for readproperty 'temperature'
            td_thing2.properties.temperature.forms[0].href = `http://${ip}:${port}/thing2/temperature`;

            // 'status' for readproperty and writeproperty
            td_thing2.properties.status.forms[0].href = `http://${ip}:${port}/thing2/status`;
            res.send(td_thing2);
        }
    });
});

app.get('/thing2/temperature', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_value_float());
});

let thing2_status = "on";

app.get('/thing2/status', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(thing2_status);
});



// thing3: two properties: number
app.get('/thing3', (req, res) => {
    const td2_path = path.join(__dirname, 'examples/thing3.jsonld');
    fs.readFile(td2_path, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // converting JSON to JavaScript
            let td_thing3 = JSON.parse(data);
            td_thing3.properties.temperature.forms[0].href = `http://${ip}:${port}/thing3/temperature`;
            td_thing3.properties.barometer.forms[0].href = `http://${ip}:${port}/thing3/pressure`;
            td_thing3.properties.lightIntensity.forms[0].href = `http://${ip}:${port}/thing3/lightIntensity`;
            res.send(td_thing3);
        }
    });
});

app.get('/thing3/temperature', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_value_float());
});
app.get('/thing3/pressure', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_value_float());
});
app.get('/thing3/lightIntensity', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_value_integer());
});


// thing4: array
app.get('/thing4', (req, res) => {
    const td4_path = path.join(__dirname, 'examples/thing4.jsonld');
    fs.readFile(td4_path, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // converting JSON to JavaScript
            let td_thing4 = JSON.parse(data);
            td_thing4.properties.temperature.forms[0].href = `http://${ip}:${port}/thing4/temperature`;
            res.send(td_thing4);
        }
    });
});

app.get('/thing4/temperature', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(random_array());
});

// INVOKEACTION - test
// thing5: motor
app.get('/thing5', (req, res) => {
    const td5_path = path.join(__dirname, 'examples/thing5.jsonld');
    fs.readFile(td5_path, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // converting JSON to JavaScript
            let td_thing5 = JSON.parse(data);

            // set `ip` and `port` in hyperlink
            td_thing5.properties.rpm.forms[0].href = `http://${ip}:${port}/thing5/rpm`;
            td_thing5.actions.moveMotor.forms[0].href = `http://${ip}:${port}/thing5/moveMotor`;
            td_thing5.actions.setTemperatureThreshold.forms[0].href = `http://${ip}:${port}/thing5/setTemperatureThreshold`;
            td_thing5.actions.stopMotor.forms[0].href = `http://${ip}:${port}/thing5/stopMotor`;
            td_thing5.actions.getMotorStatus.forms[0].href = `http://${ip}:${port}/thing5/getMotorStatus`;
            res.send(td_thing5);
        }
    });
});

let motor_rpm = 0;
let motor_status = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// it takes some time until the motor is completely ready to run
async function activate_motor(speed) {
    for(let i = 0; i <= speed; i += 50) {
        await sleep(2000);
        motor_rpm = i;
    }
    motor_status = true;
};

// get the current state of rpm
app.get('/thing5/rpm', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(motor_rpm);
});

// functionallity: input + ouput
// @moveMotor 
// receives a value in rpm to which the motor was accelerated. 
// If the speed has been reached, the boolean true is returned.
app.post('/thing5/moveMotor', async (req, res) => {
    let value = parseInt(req.body.value);

    // check if the value is correct
    if(Number.isInteger(value) && value >= 0 && value <= 5000) {
        await activate_motor(value);
        res.status(200).send(true);
    } else {
        res.status(400).send("Invalid input");
    }
});

// functionallity: input
app.post('/thing5/setTemperatureThreshold', (req, res) => {
    let value = parseInt(req.body.value);

    // check if the value is correct
    if(Number.isInteger(value) && value >= 0 && value <= 1000) {
        tmp = value;
        res.status(200).send("Valid input");
    } else {
        res.status(400).send("Invalid input");
    }
});

// output (=boolean)
app.post('/thing5/getMotorStatus', (req, res) => {
    res.status(200).send(motor_status);
});

// no in-/output
app.post('/thing5/stopMotor', (req, res) => {
    motor_status = false;
    motor_rpm = 0;
    res.status(200).send("Stopped Motor");
});



// hasSimpleResult check and writeProperty Interaction
// you can get the status and you can write the status
app.get('/thing6', (req, res) => {
    const td6_path = path.join(__dirname, 'examples/thing6.jsonld');
    fs.readFile(td6_path, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // converting JSON to JavaScript
            let td_thing6 = JSON.parse(data);

            // set `ip` and `port` in hyperlink
            td_thing6.properties.statusSimple.forms[0].href = `http://${ip}:${port}/thing6/statusSimple`;
            td_thing6.properties.statusWrite.forms[0].href = `http://${ip}:${port}/thing6/statusWrite`;
            res.send(td_thing6);
        }
    });
});

let manipulate_variable = 42;

// hasSimpleResult
// type = integer
app.get('/thing6/statusSimple', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let test_result = manipulate_variable;
    res.status(200).send(test_result);
});

// writeProperty
// type = integer
app.post('/thing6/statusWrite', (req, res) => {
    let value = parseInt(req.body.value);
    manipulate_variable = value;
    res.status(200).send("Write value successfully");
});






