// Vercel Serverless Function for image generation
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
        
        return res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}