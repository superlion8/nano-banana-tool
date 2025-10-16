// Simplified Vercel Serverless Function with basic auth check
export default async function handler(req, res) {
    console.log('=== generate-image-simple API 开始处理 ===');
    
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

    // Simple auth check - just verify token exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ 缺少认证头');
        return res.status(401).json({ 
            error: 'Missing authorization',
            message: '需要登录才能使用此功能' 
        });
    }

    const token = authHeader.substring(7);
    if (!token) {
        console.log('❌ Token为空');
        return res.status(401).json({ 
            error: 'Invalid token',
            message: '登录状态无效' 
        });
    }

    console.log('✅ 认证检查通过');

    // 验证Google JWT token
    async function verifyGoogleToken(token) {
        try {
            // 使用Google的公钥验证JWT
            const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`);
            
            if (!response.ok) {
                throw new Error('Token verification failed');
            }
            
            const payload = await response.json();
            
            // 检查token是否为Google颁发且未过期
            if (!payload.aud || !payload.email || !payload.exp) {
                throw new Error('Invalid token structure');
            }
            
            // 检查token是否过期
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                throw new Error('Token expired');
            }
            
            return {
                id: payload.sub,
                email: payload.email,
                name: payload.name || 'Unknown User'
            };
        } catch (error) {
            console.error('❌ Token验证失败:', error.message);
            throw new Error('Invalid or expired token');
        }
    }

    // 验证token并获取用户信息
    let user;
    try {
        user = await verifyGoogleToken(token);
        console.log('👤 用户验证成功:', user.email);
    } catch (error) {
        console.error('❌ 用户验证失败:', error.message);
        return res.status(401).json({ 
            error: 'Token verification failed',
            message: '登录状态无效，请重新登录' 
        });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = 'gemini-2.5-flash-image-preview';

    if (!API_KEY) {
        console.error('GEMINI_API_KEY environment variable is required');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        console.log('开始调用Gemini API...');
        
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
        
        console.log('✅ 图像生成成功');

        // 保存生成记录到Supabase
        try {
            if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
                const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
                
                const { error: saveError } = await supabase
                    .from('history')
                    .insert([{
                        user_id: user.id,
                        email: user.email,
                        prompt: req.body.contents?.[0]?.parts?.[0]?.text || 'Unknown prompt',
                        created_at: new Date().toISOString()
                    }]);
                
                if (saveError) {
                    console.error('❌ 保存记录失败:', saveError);
                } else {
                    console.log('✅ 记录已保存到Supabase');
                }
            }
        } catch (saveError) {
            console.error('❌ Supabase保存异常:', saveError);
        }

        return res.json(data);
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}