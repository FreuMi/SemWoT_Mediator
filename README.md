# SemWoT Mediator

In this project, the SemWoT Mediator is presented. The SemWoT Mediator integrates Web of Things Devices into the Semantic Web by mapping the interaction affordances of WoT devices accessable via a RESTful Read-Write Linked Data HTTP interface. The RESTful HTTP interface is generated mapping IoT protcols to HTTP and data to RDF. 

## Preconditions

- node v20.8.0
- npm 10.1.0

## Installation

- Download the project
- Install all packages with `npm install`

## Configuration

1. Open the Mediator in 'src/mediator.js'.
2. Change the variables IP (`ip` or `ip_med`) and PORT (`port_med`) according to the server on which Mediator should run.
3. Change the variables IP (`ip_thing`) and PORT (`port_thing`) according to the server on which the Thing communicates.
4. Add the paths to the Thing itself as well as the access paths to ReadProperty of the TD to the variable `whitelist` and then only the access paths for ReadProperty to the variable `href_list`. In this way, both the TD itself can be queried and the read properties can be accessed. For the interactions WriteProperty, ActionInvocation as well as SubscribeEvent insert the paths into the variable `post_whitelist`.

## Start Mediator

Start the mediator in the src folder with: `node mediator.js`

## Interactions

The following example represents a possible ReadProperty interaction using a GET request. The response is returned as an RDF file.

![Running Example](pictures/running_example_mediator.svg)

Similarly, the interactions such as WriteProperty, ActionInvocation and SubscribeEvent are provided with a Thing via a POST interface and UnsubscribeEvent via a DELETE interface. RDF templates are sent for these interactions. For more examples, go to the folder `test/`.
