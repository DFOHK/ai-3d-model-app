require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // 新增

const app = express();
const port = process.env.PORT || 3000;
```
// 托管前端静态文件
app.use(express.static(path.join(__dirname))); 

// Explicitly serve index.html for the root URL to fix "Cannot GET /" on Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(cors());
```app.use(express.json());

const MESHY_API_KEY = process.env.MESHY_API_KEY;

if (!MESHY_API_KEY) {
    console.error('Error: MESHY_API_KEY is not defined. Please create a .env file and add your API key.');
    process.exit(1);
}

app.post('/api/text-to-3d', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
                const response = await axios.post('https://api.meshy.ai/openapi/v2/text-to-3d',
            { 
                prompt: prompt,
                art_style: 'realistic',
                output_format: 'stl'
            }, 
            {
                headers: {
                    'Authorization': `Bearer ${MESHY_API_KEY}`
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to Meshy API:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Failed to generate model' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});