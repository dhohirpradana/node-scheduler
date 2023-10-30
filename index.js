const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
// const cors = require("cors");

const app = express();
app.disable("x-powered-by");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var listType = ["httpRequest", "command"];

var listMethod = ["GET", "POST", "PUT", "DELETE"];

const jobs = [];
var jobsString = [];

// Function to save jobs data to a JSON file
function saveJobsToFile() {
    console.log("Jobs:", jobsString);
    fs.writeFileSync('jobsData.json', JSON.stringify(jobsString), 'utf8');
}

// Load jobs data from a JSON file, if it exists
if (fs.existsSync('jobsData.json')) {
    const fileData = fs.readFileSync('jobsData.json', 'utf8');
    if (fileData) {
        try {
            const parsedData = JSON.parse(fileData);
            jobsString = parsedData;

            // loop jobsString to create jobs
            for (var i = 0; i < jobsString.length; i++) {
                const { id, type, data, schedule } = jobsString[i];

                var cronTime = schedule;

                if (!cronTime || !cron.validate(cronTime)) {
                    return res.status(400).json({ message: 'cronTime is required' });
                }

                if (!listType.includes(type)) {
                    return res.status(400).json({ message: 'type is not valid' });
                }

                if (type == "httpRequest") {
                    // parse data body
                    var httpData = data;

                    // validate data must object and have url, method, headers, body
                    if (!httpData || !httpData.url || !httpData.method || !httpData.headers || !httpData.body) {
                        return res.status(400).json({ message: 'data is not valid, must object have url, method, headers, body' });
                    }

                    if (!listMethod.includes(httpData.method.toUpperCase())) {
                        return res.status(400).json({ message: 'method is not valid' });
                    }

                    // validate headers must object
                    if (typeof httpData.headers !== 'object') {
                        return res.status(400).json({ message: 'headers is not valid, must object' });
                    }

                    // validate body must object
                    if (typeof httpData.body !== 'object') {
                        return res.status(400).json({ message: 'body is not valid, must object' });
                    }

                    // create http request every method
                    var url = httpData.url;

                    // validate url format must start with http:// or https://
                    if (!url.startsWith("https://") && !url.startsWith("http://")) {
                        return res.status(400).json({ message: 'url is not valid' });
                    }

                    // create job
                    var method = httpData.method;
                    var headers = httpData.headers;
                    var body = httpData.body;

                    const task = cron.schedule(cronTime, async () => {
                        try {
                            const response = await axios({
                                method: method,
                                url: url,
                                headers: headers,
                                data: body,
                                httpsAgent: httpsAgent
                            });
                            console.log(response.data);
                        } catch (error) {
                            console.error(error);
                        }
                    });
                    jobs.push({ id: id, task });
                } else if (type == "command") {
                    // validate data must string
                    if (typeof data !== 'string') {
                        return res.status(400).json({ message: 'data is not valid, must string' });
                    }

                    // create command
                    var command = data;

                    const task = cron.schedule(cronTime, async () => {
                        try {
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.log(`error: ${error.message}`);
                                    return;
                                }
                                if (stderr) {
                                    console.log(`stderr: ${stderr}`);
                                    return;
                                }
                                console.log(`stdout: ${stdout}`);
                            });
                        } catch (error) {
                            console.error(error);
                        }
                    });
                    jobs.push({ id: id, task });
                }
            }
        } catch (error) {
            console.error('Error parsing jobs data from the JSON file:', error);
        }
    }
}

// Create an instance of the HTTPS agent with SSL verification disabled
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// get version
app.get('/', (req, res) => {
    res.send('<h1>Node Scheduler v1.0.4</h1>');
});

// get all jobs
app.get('/jobs', (req, res) => {
    res.json(jobsString);
});

// get methods
app.get('/methods', (req, res) => {
    res.json(listMethod);
});

// get types
app.get('/types', (req, res) => {
    res.json(listType);
});

// create job
app.post('/job', (req, res) => {
    const uuid = uuidv4();

    // Get current datetime
    const now = new Date();

    // Adjust to GMT+7
    now.setHours(now.getHours() + 7);

    // Format the datetime
    const formattedDatetime = now.toISOString();

    // console.log(formattedDatetime);

    // validate if no body
    if (!req.body) {
        return res.status(400).json({ message: 'body is required' });
    }

    const { type, data, schedule } = req.body;

    if (!type || !data || !schedule) {
        return res.status(400).json({ message: 'type, data and schedule are required' });
    }

    var cronTime = schedule;

    if (!cronTime || !cron.validate(cronTime)) {
        return res.status(400).json({ message: 'cronTime is required' });
    }

    if (!listType.includes(type)) {
        return res.status(400).json({ message: 'type is not valid' });
    }

    if (type == "httpRequest") {
        // parse data body
        var httpData = data;

        // validate data must object and have url, method, headers, body
        if (!httpData || !httpData.url || !httpData.method || !httpData.headers || !httpData.body) {
            return res.status(400).json({ message: 'data is not valid, must object have url, method, headers, body' });
        }

        if (!listMethod.includes(httpData.method.toUpperCase())) {
            return res.status(400).json({ message: 'method is not valid' });
        }

        // validate headers must object
        if (typeof httpData.headers !== 'object') {
            return res.status(400).json({ message: 'headers is not valid, must object' });
        }

        // validate body must object
        if (typeof httpData.body !== 'object') {
            return res.status(400).json({ message: 'body is not valid, must object' });
        }

        // create http request every method
        var url = httpData.url;

        // validate url format must start with http:// or https://
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            return res.status(400).json({ message: 'url is not valid' });
        }

        // var urlFormatHttps = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
        // var urlFormatHttp = /^http?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;

        // if (!urlFormatHttps.test(url) && !urlFormatHttp.test(url)) {
        //     return res.status(400).json({ message: 'url is not valid' });
        // }

        var method = httpData.method;
        var headers = httpData.headers;
        var body = httpData.body;

        const task = cron.schedule(cronTime, async () => {
            try {
                const response = await axios({
                    method: method,
                    url: url,
                    headers: headers,
                    data: body,
                    httpsAgent: httpsAgent
                });
                console.log(response.data);
            } catch (error) {
                console.error(error);
            }
        });

        jobs.push({ id: uuid, task });
        jobsString.push({ id: uuid, type, data, schedule, created_at: formattedDatetime, status: "running" });
        res.status(201).json({ message: "Job added!", data: { id: uuid, type, data, schedule, created_at: formattedDatetime, status: "running" } });
    } else if (type == "command") {
        // validate data must string
        if (typeof data !== 'string') {
            return res.status(400).json({ message: 'data is not valid, must string' });
        }

        // create command
        var command = data;

        const task = cron.schedule(cronTime, async () => {
            try {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                        return;
                    }
                    console.log(`stdout: ${stdout}`);
                });
            } catch (error) {
                console.error(error);
            }
        });

        jobs.push({ id: uuid, task });
        jobsString.push({ id: uuid, type, data, schedule, created_at: formattedDatetime, status: "running" });
        res.status(201).json({ message: "Task added!", data: { id: uuid, type, data, schedule, created_at: formattedDatetime, status: "running" } });
    }
    saveJobsToFile();
});

// delete job
app.delete('/job/:id', (req, res) => {
    const id = req.params.id;
    const index = jobs.findIndex((job) => job.id === id);

    if (index !== -1) {
        jobs.splice(index, 1);
        jobsString.splice(index, 1);
        res.json({ success: true, message: `Job ${id} deleted`, jobs, jobsString });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
    saveJobsToFile();
});

// update job
app.put('/job/:id', (req, res) => {
    const id = req.params.id;
    const uuid = id;
    // Get current datetime
    const now = new Date();

    // Adjust to GMT+7
    now.setHours(now.getHours() + 7);

    // Format the datetime
    const formattedDatetime = now.toISOString();

    // console.log(formattedDatetime);

    // validate if no body
    if (!req.body) {
        return res.status(400).json({ message: 'body is required' });
    }

    const { type, data, schedule } = req.body;

    if (type === undefined || data === undefined || schedule === undefined) {
        return res.status(400).json({ message: 'type, data, and schedule are required' });
    }

    const updatedJob = {
        id,
        type,
        data,
        schedule,
        updated_at: formattedDatetime,
    };

    const index = jobs.findIndex((job) => job.id === id);

    if (index !== -1) {
        jobs[index] = updatedJob;
        const jobsString = JSON.stringify(jobs);
        res.json({ success: true, message: `Job ${id} updated`, updatedJob, jobs, jobsString });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
    saveJobsToFile();
});

// stop job
app.put('/job/:id/stop', (req, res) => {
    const id = req.params.id;
    const job = jobs.find((job) => job.id === id);
    if (job) {
        // stop cron job
        job.task.stop();
        // update jobString status
        const index = jobs.indexOf(job);
        jobsString[index].status = "stopped";
        res.json({ success: true, message: `Job ${id} stopped` });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
    saveJobsToFile();
});

// start job
app.put('/job/:id/start', (req, res) => {
    const id = req.params.id;
    const job = jobs.find((job) => job.id === id);
    if (job) {
        // start cron job
        job.task.start();
        // update jobString status
        const index = jobs.indexOf(job);
        jobsString[index].status = "running";
        res.json({ success: true, message: `Job ${id} started` });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
    saveJobsToFile();
});

// Read the SSL/TLS certificate and private key
const options = {
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem'),
};

// Create an HTTPS server
const appHttps = https.createServer(options, app);

// appHttps.listen(3000, () => {
//     console.log('Server running on port 3000');
// });

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
