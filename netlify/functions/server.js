const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-image-preview';

if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is required');
}

// 代理文本生成图片API
app.post('/api/generate-image', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 代理图片编辑API
app.post('/api/edit-image', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 代理多图生成API
app.post('/api/generate-multi-image', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // 验证请求体
        if (!req.body || !req.body.contents || !req.body.contents[0] || !req.body.contents[0].parts) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        const parts = req.body.contents[0].parts;
        
        // 验证至少有一张图片和一个文本部分
        const imageParts = parts.filter(part => part.inline_data);
        const textParts = parts.filter(part => part.text);
        
        if (imageParts.length === 0) {
            return res.status(400).json({ error: 'At least one image is required' });
        }
        
        if (textParts.length === 0) {
            return res.status(400).json({ error: 'Text prompt is required' });
        }
        
        if (imageParts.length > 3) {
            return res.status(400).json({ error: 'Maximum 3 images allowed' });
        }

        console.log(`Processing multi-image generation with ${imageParts.length} images and ${textParts.length} text parts`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        
        console.log('Multi-image generation successful');
        res.json(data);
    } catch (error) {
        console.error('Multi-image generation API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports.handler = serverless(app);