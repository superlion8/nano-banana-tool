const express = require('express');
const cors = require('cors');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

// 动态导入fetch (Node.js 18+有内置fetch，但为了兼容性使用node-fetch)
let fetch;
(async () => {
    if (typeof globalThis.fetch === 'undefined') {
        const { default: nodeFetch } = await import('node-fetch');
        fetch = nodeFetch;
    } else {
        fetch = globalThis.fetch;
    }
})();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

const API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const MODEL = 'gemini-2.5-flash-image-preview';

if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is required');
    process.exit(1);
}

if (!GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID environment variable is required for authentication');
    process.exit(1);
}

// Google OAuth2 验证客户端
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 用户生成次数存储 (生产环境应使用Redis或数据库)
const userGenerationCounts = new Map();
const DAILY_GENERATION_LIMIT = 200;

// 获取今日日期字符串
function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
}

// 验证Google JWT token中间件
async function verifyGoogleToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Missing or invalid authorization header',
                message: '需要登录才能使用此功能' 
            });
        }

        const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
        
        // 验证Google JWT token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const userId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];
        
        // 将用户信息添加到request对象
        req.user = {
            id: userId,
            email: email,
            name: name,
            googleId: userId
        };
        
        console.log('✅ 用户验证成功:', { id: userId, email: email, name: name });
        next();
        
    } catch (error) {
        console.error('❌ Token验证失败:', error.message);
        return res.status(401).json({ 
            error: 'Invalid token',
            message: '登录状态无效，请重新登录' 
        });
    }
}

// 每日生成限制检查中间件
async function checkDailyLimit(req, res, next) {
    try {
        const userId = req.user.id;
        const today = getTodayDateString();
        const countKey = `${userId}_${today}`;
        
        const currentCount = userGenerationCounts.get(countKey) || 0;
        
        if (currentCount >= DAILY_GENERATION_LIMIT) {
            console.log(`❌ 用户 ${userId} 今日生成已达限制: ${currentCount}/${DAILY_GENERATION_LIMIT}`);
            return res.status(429).json({ 
                error: 'Daily limit exceeded',
                message: '今日生成超限，请明天再试',
                currentCount: currentCount,
                limit: DAILY_GENERATION_LIMIT
            });
        }
        
        console.log(`✅ 用户 ${userId} 今日生成次数检查通过: ${currentCount}/${DAILY_GENERATION_LIMIT}`);
        req.generationCount = currentCount;
        next();
        
    } catch (error) {
        console.error('❌ 每日限制检查失败:', error);
        return res.status(500).json({ 
            error: 'Daily limit check failed',
            message: '系统错误，请稍后重试' 
        });
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

// 代理文本生成图片API - 添加认证和限制检查
app.post('/api/generate-image', verifyGoogleToken, checkDailyLimit, async (req, res) => {
    try {
        // 确保fetch已加载
        if (!fetch) {
            if (typeof globalThis.fetch === 'undefined') {
                const { default: nodeFetch } = await import('node-fetch');
                fetch = nodeFetch;
            } else {
                fetch = globalThis.fetch;
            }
        }
        
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
            const newCount = incrementUserGenerationCount(req.user.id);
            console.log(`🎯 用户 ${req.user.email} 成功生成图像，当前计数: ${newCount}/${DAILY_GENERATION_LIMIT}`);
        }
        
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 代理图片编辑API
app.post('/api/edit-image', verifyGoogleToken, checkDailyLimit, async (req, res) => {
    try {
        // 确保fetch已加载
        if (!fetch) {
            if (typeof globalThis.fetch === 'undefined') {
                const { default: nodeFetch } = await import('node-fetch');
                fetch = nodeFetch;
            } else {
                fetch = globalThis.fetch;
            }
        }
        
        // 转换单图编辑请求格式为Gemini API格式
        let requestBody;
        if (req.body.prompt && req.body.imageData) {
            // 单图编辑格式
            requestBody = {
                contents: [{
                    parts: [
                        {
                            text: req.body.prompt
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: req.body.imageData
                            }
                        }
                    ]
                }]
            };
            console.log('处理单图编辑请求，prompt长度:', req.body.prompt.length, '图片数据长度:', req.body.imageData.length);
        } else {
            // 使用原始请求体
            requestBody = req.body;
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (!response.ok) {
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
            const newCount = incrementUserGenerationCount(req.user.id);
            console.log(`🎯 用户 ${req.user.email} 成功编辑图像，当前计数: ${newCount}/${DAILY_GENERATION_LIMIT}`);
        }
        
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 代理多图生成API
app.post('/api/generate-multi-image', verifyGoogleToken, checkDailyLimit, async (req, res) => {
    try {
        // 确保fetch已加载
        if (!fetch) {
            if (typeof globalThis.fetch === 'undefined') {
                const { default: nodeFetch } = await import('node-fetch');
                fetch = nodeFetch;
            } else {
                fetch = globalThis.fetch;
            }
        }
        
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
            const newCount = incrementUserGenerationCount(req.user.id);
            console.log(`🎯 用户 ${req.user.email} 成功进行多图编辑，当前计数: ${newCount}/${DAILY_GENERATION_LIMIT}`);
        }
        
        console.log('Multi-image generation successful');
        res.json(data);
    } catch (error) {
        console.error('Multi-image generation API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});