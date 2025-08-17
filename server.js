const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Explicitly serve index.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(cors());
app.use(express.json());

const MESHY_API_KEY = process.env.MESHY_API_KEY;

if (!MESHY_API_KEY) {
    console.error("MESHY_API_KEY is not set. Please add it to your environment variables.");
}

// This is the route the frontend calls
app.post('/api/text-to-3d', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`Received request for prompt: "${prompt}"`);

        // Step 1: Create the 3D generation task with Meshy
        console.log('Sending request to Meshy API...');
        const meshyResponse = await fetch(MESHY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                mode: "preview", // Required by the v2 API
                art_style: 'realistic',
            }),
        });

        const meshyData = await meshyResponse.json();
        console.log('Received response from Meshy API:', meshyData);

        if (!meshyResponse.ok) {
            // If Meshy API returns an error, forward it to the client
            const errorDetail = meshyData.message || 'Unknown error from Meshy API';
            console.error(`Meshy API error: ${meshyResponse.status} - ${errorDetail}`);
            return res.status(meshyResponse.status).json({ 
                message: `Failed to create 3D task: ${errorDetail}` 
            });
        }

        // The v2 API directly returns the task ID in the 'result' field
        const taskId = meshyData.result;
        console.log(`Successfully created Meshy task with ID: ${taskId}`);

        // For now, we will just return the task ID.
        // The full implementation would require polling for the result.
        // Let's first confirm the creation works.
        res.status(200).json({ 
            message: "Task created successfully!",
            taskId: taskId 
        });

    } catch (error) {
        console.error('Server error in /api/text-to-3d:', error);
        res.status(500).json({ error: 'Internal Server Error on our side.' });
    }
});

// Export the app for Vercel
module.exports = app;

const MESHY_API_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';