# Simulation Sensor

The sensor simulation simulates six different devices with six different Things Descriptions (TD). Each of these simulated devices has different interaction possibilities. These can be read out of the respective TD - found in **/examples**. It is possible, for example, to address readproperties, writeproperties, invokeactions or events. To start the sensor simulation, you can either access the script `test.sh`, which must then be adapted again with regard to the path. Or you can simply use the following command
`$ node sensor-simulation.js`
After the simulator and then the mediator have been started, queries can be sent. See the folder **../test** for this.

## tl;dr

`test.sh` is a simple script that allows me to start, stop or restart the sensor-simulation server in a faster way. For that I just added the following line to my `.zshrc` file:

`alias go="~/git-repos/SWOT_Gateway/simulation/.test.sh start"`

`alias no="~/git-repos/SWOT_Gateway/simulation/.test.sh stop"`

`alias re="~/git-repos/SWOT_Gateway/simulation/.test.sh restart"`
