const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// 托管前端静态文件
app.use(express.static(path.join(__dirname)));

// 明确为根 URL 提供 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(cors());
app.use(express.json());

const MESHY_API_KEY = process.env.MESHY_API_KEY;

if (!MESHY_API_KEY) {
    console.error("MESHY_API_KEY is not set. Please add it to your environment variables.");
}

app.post('/api/text-to-3d', async (req, res) => {
    const { prompt, art_style } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // 1. 创建任务
        const createResponse = await fetch('https://api.meshy.ai/v1/text-to-3d', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                art_style: art_style,
                mode: "preview"
            }),
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('Meshy API error (create):', errorText);
            return res.status(createResponse.status).json({ error: `Failed to create 3D task: ${errorText}` });
        }

        const { result: task_id } = await createResponse.json();

        // 2. 轮询结果
        let attempts = 0;
        const maxAttempts = 100;
        const interval = 10000; // 10 秒

        while (attempts < maxAttempts) {
            const getResponse = await fetch(`https://api.meshy.ai/v1/text-to-3d/${task_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` },
            });

            if (!getResponse.ok) {
                const errorText = await getResponse.text();
                console.error('Meshy API error (get):', errorText);
                return res.status(getResponse.status).json({ error: `Failed to get 3D task status: ${errorText}` });
            }

            const data = await getResponse.json();

            if (data.status === 'SUCCEEDED') {
                return res.json({ model_url: data.model_urls.glb });
            } else if (data.status === 'FAILED') {
                return res.status(500).json({ error: '3D model generation failed.' });
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        return res.status(504).json({ error: 'Gateway Timeout: Model generation took too long.' });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 为 Vercel 的无服务器环境导出 app 句柄
module.exports = app;