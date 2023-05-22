const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
// const cors = require("cors");
const https = require('https');

const app = express();
app.disable("x-powered-by");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var listType = ["httpRequest", "command"];

var listMethod = ["GET", "POST", "PUT", "DELETE"];

const jobs = [];
const jobsString = [];

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
        jobsString.push({ id: uuid, type, data, schedule, created_at: formattedDatetime });
        res.status(201).json({ message: "Task added!", data: { id: uuid, type, data, schedule, created_at: formattedDatetime } });
    }
});

// delete job
app.delete('/job/:id', (req, res) => {
    const id = req.params.id;
    const job = jobs.find((job) => job.id === id);
    if (job) {
        // stop cron job
        job.task.stop();
        const index = jobs.indexOf(job);
        jobs.splice(index, 1);
        jobsString.splice(index, 1);
        res.json({ success: true, message: `Job ${id} deleted` });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
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

    const job = jobs.find((job) => job.id === id);
    if (job) {
        // stop cron job
        job.task.stop();
        const index = jobs.indexOf(job);
        jobs.splice(index, 1);
        jobsString.splice(index, 1);

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

            // // validate url format must http or https
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
            jobsString.push({ id: uuid, type, data, schedule, created_at: formattedDatetime });
            res.status(201).json({ message: "Task updated!", data: { id: uuid, type, data, schedule, created_at: formattedDatetime } });
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
            res.status(201).json({ message: "Task updated!", data: { id: uuid, type, data, schedule, created_at: formattedDatetime, status: "running" } });
        }

    } else {
        res.status(404).json({ message: 'Job not found' });
    }
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
});

// Read the SSL/TLS certificate and private key
const options = {
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem'),
};

// Create an HTTPS server
const appHttps = https.createServer(options, app);

appHttps.listen(3000, () => {
    console.log('Server running on port 3000');
});
