const fetch = require('node-fetch');
const fs = require('fs');

const url = 'http://192.168.178.20:4242/thing5/stopMotor';
const filePath = '../no_io.ttl';

const fileContent = fs.readFileSync(filePath, 'utf8');

const headers = {
    'Content-Type': 'text/turtle',
};

const requestOptions = {
    method: 'POST',
    headers: headers,
    body: fileContent,
};

const numberOfRuns = 25;

// function to perform the request and measure the time
const performRequest = async (i) => {

    try {
        // Sends POST requests
        const startTime = performance.now();

        const response = await fetch(url, requestOptions);

         // Check if the response has a 'Location' header
        if (response.headers.has('Location')) {
            const location = response.headers.get('Location');

            // Fetch the data from the 'Location' URL
            const dataResponse = await fetch(location);

            if (dataResponse.ok) {
                const turtleData = await dataResponse.text();

                // stop time
                const endTime = performance.now();
                const elapsedTime = endTime - startTime;
                console.log(i, " ", elapsedTime);
            } else {
                console.error("Error fetching data from Location URL");
            }

        } else {
            console.log(" Location not found in response headers");
        }
    } catch (error) {
        console.error('send post request: ', error);
    }
}

// Use a loop with await to ensure sequential execution
const runRequestsSequentially = async () => {
    for (let i = 1; i <= numberOfRuns; i++) {
        await performRequest(i);
    }
}

runRequestsSequentially();
