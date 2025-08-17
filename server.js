const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serve static files from the root

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_API_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';

app.post('/api/text-to-3d', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!MESHY_API_KEY) {
        return res.status(500).json({ message: 'API key is not configured on the server.' });
    }

    try {
        console.log(`Creating Meshy task for prompt: "${prompt}"`);
        // Step 1: Create the task
        const createResponse = await fetch(MESHY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                mode: "preview",
                art_style: 'realistic',
            }),
        });

        const createData = await createResponse.json();
        if (!createResponse.ok) {
            console.error('Meshy API error (create):', createData);
            return res.status(createResponse.status).json({ message: `Failed to create 3D task: ${createData.message || 'Unknown error'}` });
        }

        const taskId = createData.result;
        console.log(`Task created with ID: ${taskId}. Starting to poll for results...`);

        // Step 2: Poll for the result
        let attempts = 0;
        const maxAttempts = 100;
        const interval = 10000; // 10 seconds

        while (attempts < maxAttempts) {
            const getResponse = await fetch(`${MESHY_API_URL}/${taskId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` },
            });

            const data = await getResponse.json();

            if (!getResponse.ok) {
                 console.error('Meshy API error (polling):', data);
                 return res.status(getResponse.status).json({ message: `Failed to get task status: ${data.message || 'Unknown error'}` });
            }
            
            console.log(`Polling attempt ${attempts + 1}: Task status is ${data.status}`);

            if (data.status === 'SUCCEEDED') {
                console.log('Task succeeded! Model URLs:', data.model_urls);
                // User wants STL, but GLB is the primary format for web viewers.
                // Let's return both if available, but prioritize GLB for the viewer.
                return res.json({ 
                    model_url: data.model_urls.glb, // For the viewer
                    download_urls: data.model_urls // For the download button
                });
            } else if (data.status === 'FAILED') {
                console.error('Meshy task failed:', data.error);
                return res.status(500).json({ message: `Model generation failed: ${data.error.message}` });
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        return res.status(504).json({ message: 'Gateway Timeout: Model generation took too long.' });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

module.exports = app;