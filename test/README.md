# Examples of interactions with different operations of a thing description

## GET Examples

`$ curl -X GET http://192.168.178.20:4242/thing1/temperature`

`$ curl -X GET http://192.168.178.20:4242/thing2/temperature`

`$ curl -X GET http://192.168.178.20:4242/thing2/status`

`$ curl -X GET http://192.168.178.20:4242/thing3/temperature`

`$ curl -X GET http://192.168.178.20:4242/thing3/barommeter`

`$ curl -X GET http://192.168.178.20:4242/thing3/lightIntensity`

`$ curl -X GET http://192.168.178.20:4242/thing4/temperature`

`$ curl -X GET http://192.168.178.20:4242/thing5/rpm`

`$ curl -X GET http://192.168.178.20:4242/thing6/statusSimple`

## POST Examples: Requests for invokeaction, writeproperty and events

## InvokeAction

`$ curl -D headers_setTemperatureThreshold.txt -X POST -H "Content-Type: text/turtle" -d '@input.ttl' http://192.168.178.20:4242/thing5/setTemperatureThreshold`

`$ curl -D headers_getMotorStatus.txt -X POST -H "Content-Type: text/turtle" -d '@output.ttl' http://192.168.178.20:4242/thing5/getMotorStatus`

`$ curl -D headers_moveMotor.txt -X POST -H "Content-Type: text/turtle" -d '@input_output.ttl' http://192.168.178.20:4242/thing5/moveMotor`

`$ curl -D headers_stopMotor.txt -X POST -H "Content-Type: text/turtle" -d '@no_io.ttl' http://192.168.178.20:4242/thing5/stopMotor`

## WriteProperty

`$ curl -D headers_wp_statusWrite.txt -X POST -H "Content-Type: text/turtle" -d '@write_statusWrite.ttl' http://192.168.178.20:4242/thing6/statusWrite`

## SubscribeEvent

`$ curl -D headers_events.txt -X POST -H "Content-Type: text/turtle" -d '@events.ttl' http://192.168.178.20:4242/thing1/overheating`

## DELETE Example: UnsubscribeEvent

`$ curl -X DELETE http://192.168.178.20:4242/thing1/overheating/91e968f3-c5fa-45ae-aeb0-75715b553540`
