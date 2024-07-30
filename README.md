# SWOT_Gateway

In this project, the SWoT-Mediator is presented. On the one hand, this mediator provides a user-friendly RESTful API and at the same time integrates its own scripting API, which enables programming-language-independent interaction with things. On the other hand, a semantic enrichment of the raw data is done in RDF Turtle format, which enables a direct interpretation. This project contributes to improving efficiency and interoperability in the IoT field, and opens up new possibilities for the integration of IoT devices and the further processing of the exchanged data.

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
