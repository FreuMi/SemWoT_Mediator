#!/bin/bash

echo "A simple script to start simulation of sensor"
echo "Usage: ./test.sh <start | stop | restart>"

if [ $1 == "start" ]; then
    node ~/git-repos/SWOT_Gateway/simulation/sensor-simulation.js &
    echo "server sensor-simulation is started..."
    echo "listen at http://192.168.178.20:4200/thing*"
elif [ $1 == "stop" ]; then
    pkill node
    echo "server sensor-simulation is stopped..."
elif [ $1 == "restart" ]; then
    pkill node
    node ~/git-repos/SWOT_Gateway/simulation/sensor-simulation.js &
    echo "server sensor-simulation is restared..."
else
    echo "No valid input!"
fi
