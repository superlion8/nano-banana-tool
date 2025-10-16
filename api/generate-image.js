const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
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

// 从Supabase获取用户今日生成计数
async function getTodayGenerationCount(supabase, userId) {
    const today = getTodayDateString();
    
    try {
        // 从history表统计今日该用户的生成记录数
        const { count, error } = await supabase
            .from('history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', `${today} 00:00:00`)
            .lt('created_at', `${today} 23:59:59`);
            
        if (error) {
            console.error('获取生成计数失败:', error);
            return 0;
        }
        
        return count || 0;
    } catch (error) {
        console.error('数据库查询失败:', error);
        return 0;
    }
}

// Vercel Serverless Function for image generation with authentication
export default async function handler(req, res) {
    console.log('=== generate-image API 开始处理 ===');
    
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

    // 检查Supabase环境变量
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Supabase configuration not found'
        });
    }

    // 动态导入 Supabase 客户端
    let supabase;
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
    } catch (error) {
        return res.status(500).json({
            error: 'Database connection failed',
            message: error.message
        });
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
        
        // 检查每日限制 - 从Supabase获取真实计数
        const userId = user.id;
        const currentCount = await getTodayGenerationCount(supabase, userId);
        
        console.log(`📊 用户 ${user.email} 当前生成计数: ${currentCount}/${DAILY_GENERATION_LIMIT}`);
        
        if (currentCount >= DAILY_GENERATION_LIMIT) {
            console.log(`❌ 用户 ${userId} 今日生成已达限制: ${currentCount}/${DAILY_GENERATION_LIMIT}`);
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
            // 成功生成图像，保存到history表 (这会自动增加计数)
            try {
                const imageData = data.candidates[0].content.parts.find(part => 
                    (part.inline_data || part.inlineData) && 
                    (part.inline_data?.data || part.inlineData?.data)
                );
                
                const base64Data = imageData.inline_data?.data || imageData.inlineData?.data;
                const prompt = req.body.contents?.[0]?.parts?.[0]?.text || '文本生成图像';
                
                // 保存到Supabase history表
                const { error: saveError } = await supabase
                    .from('history')
                    .insert({
                        user_id: userId,
                        type: 'text-to-image',
                        prompt: prompt,
                        result_image: base64Data,
                        created_at: new Date().toISOString()
                    });
                    
                if (saveError) {
                    console.error('保存生成记录到数据库失败:', saveError);
                    // 不影响图像生成结果返回，只记录错误
                } else {
                    console.log(`🎯 用户 ${user.email} 成功生成图像并保存到数据库`);
                }
            } catch (saveError) {
                console.error('保存生成记录时出错:', saveError);
                // 不影响图像生成结果返回
            }
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