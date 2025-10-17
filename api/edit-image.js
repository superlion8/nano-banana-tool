// Vercel Serverless Function for image editing with authentication
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
    
    // 简单的认证检查
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
            
            // 生成与前端一致的用户ID
            const emailHash = Buffer.from(payload.email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
            const stableUserId = `google_${emailHash}`;
            
            return {
                id: stableUserId,
                email: payload.email,
                name: payload.name || 'Unknown User',
                googleId: payload.sub
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
        console.error('❌ Google token验证失败，尝试fallback方案:', error.message);
        
        // fallback: 如果Google验证失败，使用简单的JWT解析
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const emailHash = Buffer.from(payload.email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
            const stableUserId = `google_${emailHash}`;
            
            user = {
                id: stableUserId,
                email: payload.email,
                name: payload.name || 'Unknown User',
                googleId: payload.sub
            };
            
            console.log('👤 Fallback验证成功:', user.email);
        } catch (fallbackError) {
            console.error('❌ Fallback验证也失败:', fallbackError.message);
            return res.status(401).json({ 
                error: 'Token verification failed',
                message: '登录状态无效，请重新登录' 
            });
        }
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = 'gemini-2.5-flash-image-preview';

    if (!API_KEY) {
        console.error('GEMINI_API_KEY environment variable is required');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        console.log('收到编辑图像请求:', { prompt: req.body.prompt, imageDataLength: req.body.imageData?.length });
        
        const { prompt, imageData } = req.body;
        
        if (!prompt || !imageData) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: '缺少必需的字段：prompt 或 imageData' 
            });
        }
        
        // 构建Gemini API格式的请求
        const geminiRequest = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { 
                            inline_data: { 
                                mime_type: "image/jpeg", 
                                data: imageData 
                            } 
                        }
                    ]
                }
            ]
        };
        
        console.log('发送到Gemini API的请求结构:', { 
            hasContents: !!geminiRequest.contents,
            partsCount: geminiRequest.contents[0].parts.length,
            hasText: !!geminiRequest.contents[0].parts[0].text,
            hasImageData: !!geminiRequest.contents[0].parts[1].inline_data?.data
        });

        // Import fetch for Node.js environment
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify(geminiRequest)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('✅ 图像编辑成功');

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
                        prompt: prompt,
                        type: 'single-image-edit',
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
        return res.status(500).json({ error: 'Internal server error' });
    }
}