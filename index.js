const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();

const jobs = [];

app.get('/', (req, res) => {
    res.send('<h1>Node Scheduler</h1>');
});

app.get('/jobs', (req, res) => {
    res.json(jobs);
});

app.post('/jobs', (req, res) => {
    const { url, cronTime } = req.body;
    const task = cron.schedule(cronTime, async () => {
        try {
            const response = await axios.get(url);
            console.log(response.data);
        } catch (error) {
            console.error(error);
        }
    });
    jobs.push({ url, cronTime, task });
    res.status(201).json({ success: true });
});

app.delete('/jobs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const job = jobs.find((job) => job.id === id);
    if (job) {
        job.task.destroy();
        const index = jobs.indexOf(job);
        jobs.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
