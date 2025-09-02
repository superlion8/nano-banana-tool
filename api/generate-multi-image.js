// Vercel Serverless Function for multi-image generation
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = 'gemini-2.5-flash-image-preview';

    if (!API_KEY) {
        console.error('GEMINI_API_KEY environment variable is required');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        // Import fetch for Node.js environment
        const fetch = (await import('node-fetch')).default;

        // Validate request body
        if (!req.body || !req.body.contents || !req.body.contents[0] || !req.body.contents[0].parts) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        const parts = req.body.contents[0].parts;
        
        // Validate that we have at least one image and one text part
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

        // Check total payload size
        const requestSize = JSON.stringify(req.body).length;
        const maxSize = 4 * 1024 * 1024; // 4MB limit for Vercel
        
        if (requestSize > maxSize) {
            return res.status(413).json({ 
                error: 'Payload too large', 
                message: 'Total image size exceeds 4MB limit. Please compress your images or use fewer images.',
                currentSize: `${(requestSize / 1024 / 1024).toFixed(2)}MB`,
                maxSize: '4MB'
            });
        }

        console.log(`Processing multi-image generation with ${imageParts.length} images and ${textParts.length} text parts`);
        
        // 记录请求详情用于调试
        console.log('Request details:', {
            model: MODEL,
            imageCount: imageParts.length,
            textCount: textParts.length,
            imageTypes: imageParts.map(part => part.inline_data.mime_type),
            textLength: textParts.map(part => part.text.length)
        });

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
            console.error('Gemini API Error:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('Multi-image generation successful');
        return res.json(data);
    } catch (error) {
        console.error('Multi-image generation API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
