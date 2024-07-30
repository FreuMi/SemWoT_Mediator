const { performance } = require('perf_hooks');
const fetch = require('node-fetch');

const url = 'http://192.168.178.20:4242/thing1/temperature';

// number 25 runs
const numberOfRuns = 25;

// function to perform the request and measure the time
const performRequest = (i) => {
    const startTime = performance.now();

    // send GET-Requests
    fetch(url).then(response => {
        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        //console.log(i, " ", elapsedTime);
        console.log(elapsedTime);
        // Schedule the next request after a 1-second delay
        if (i < numberOfRuns) {
            setTimeout(() => {
                performRequest(i + 1);
            }, 1000); // 1000 milliseconds = 1 second
        }
    }).catch(error => {
        console.error('Fehler:', error);
    });
};

performRequest(1); // start the first request

/*for (let i = 1; i <= numberOfRuns; i++) {
    performRequest(i);
}*/

