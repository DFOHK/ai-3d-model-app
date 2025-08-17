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
        // Step 1: Create the 3D generation task
        const createResponse = await fetch('https://api.meshy.ai/v1/text-to-3d', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                art_style: 'realistic', // Hardcoded as frontend doesn't provide it
                mode: "preview"
            }),
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('Meshy API error (create task):', errorText);
            // The error from Meshy might be JSON, try to parse it.
            try {
                const errorJson = JSON.parse(errorText);
                return res.status(createResponse.status).json({ error: `Failed to create 3D task: ${errorJson.message || errorText}` });
            } catch (e) {
                return res.status(createResponse.status).json({ error: `Failed to create 3D task: ${errorText}` });
            }
        }

        const { result: task_id } = await createResponse.json();

        // Step 2: Poll for the result
        let attempts = 0;
        const maxAttempts = 100; // Poll for a long time
        const interval = 10000; // 10 seconds

        while (attempts < maxAttempts) {
            const getResponse = await fetch(`https://api.meshy.ai/v1/text-to-3d/${task_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` },
            });

            if (!getResponse.ok) {
                const errorText = await getResponse.text();
                console.error('Meshy API error (get task status):', errorText);
                return res.status(getResponse.status).json({ error: `Failed to get 3D task status: ${errorText}` });
            }

            const data = await getResponse.json();

            if (data.status === 'SUCCEEDED') {
                // Success! Send the model URL back to the frontend.
                return res.json({ model_url: data.model_urls.glb });
            } else if (data.status === 'FAILED') {
                console.error('Meshy task failed:', data);
                return res.status(500).json({ error: '3D model generation failed on Meshy\'s side.' });
            }

            // If not succeeded or failed, it's still processing. Wait and try again.
            attempts++;
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        // If the loop finishes, it timed out.
        return res.status(504).json({ error: 'Gateway Timeout: Model generation took too long.' });

    } catch (error) {
        console.error('Server error in /api/text-to-3d:', error);
        res.status(500).json({ error: 'Internal Server Error on our side.' });
    }
});

// Export the app for Vercel
module.exports = app;