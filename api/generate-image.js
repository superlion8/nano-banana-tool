const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 用户生成次数存储 (注意：Vercel无状态，需要外部存储)
const userGenerationCounts = new Map();
const DAILY_GENERATION_LIMIT = 200;

// 获取今日日期字符串
function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
}

// 验证Google JWT token
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        return {
            id: payload['sub'],
            email: payload['email'],
            name: payload['name']
        };
    } catch (error) {
        console.error('❌ Token验证失败:', error.message);
        throw new Error('Invalid token');
    }
}

// 增加用户生成计数
function incrementUserGenerationCount(userId) {
    const today = getTodayDateString();
    const countKey = `${userId}_${today}`;
    const currentCount = userGenerationCounts.get(countKey) || 0;
    const newCount = currentCount + 1;
    
    userGenerationCounts.set(countKey, newCount);
    console.log(`📊 用户 ${userId} 生成计数更新: ${newCount}/${DAILY_GENERATION_LIMIT}`);
    
    return newCount;
}

// Vercel Serverless Function for image generation with authentication
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    if (!GOOGLE_CLIENT_ID) {
        console.error('GOOGLE_CLIENT_ID environment variable is required');
        return res.status(500).json({ error: 'Google Client ID not configured' });
    }

    try {
        // 验证认证头
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Missing or invalid authorization header',
                message: '需要登录才能使用此功能' 
            });
        }

        const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
        
        // 验证Google JWT token
        const user = await verifyGoogleToken(token);
        
        // 检查每日限制
        const userId = user.id;
        const today = getTodayDateString();
        const countKey = `${userId}_${today}`;
        const currentCount = userGenerationCounts.get(countKey) || 0;
        
        if (currentCount >= DAILY_GENERATION_LIMIT) {
            return res.status(429).json({ 
                error: 'Daily limit exceeded',
                message: '今日生成超限，请明天再试',
                currentCount: currentCount,
                limit: DAILY_GENERATION_LIMIT
            });
        }

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
        
        // 检查是否成功生成图像
        const hasImageData = data.candidates && 
                             data.candidates[0] && 
                             data.candidates[0].content && 
                             data.candidates[0].content.parts &&
                             data.candidates[0].content.parts.some(part => 
                                 (part.inline_data || part.inlineData) && 
                                 (part.inline_data?.data || part.inlineData?.data)
                             );
        
        if (hasImageData) {
            // 成功生成图像，增加用户计数
            const newCount = incrementUserGenerationCount(user.id);
            console.log(`🎯 用户 ${user.email} 成功生成图像，当前计数: ${newCount}/${DAILY_GENERATION_LIMIT}`);
        }
        
        return res.json(data);
        
    } catch (apiError) {
        console.error('Gemini API Error:', apiError);
        return res.status(500).json({ error: 'Gemini API error' });
    }
        
    } catch (error) {
        console.error('Authentication Error:', error);
        
        if (error.message === 'Invalid token') {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: '登录状态无效，请重新登录' 
            });
        }
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: '服务器内部错误' 
        });
    }
}