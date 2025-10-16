const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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
        // 动态导入fetch（如果需要）
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        
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

// 从Supabase获取用户今日生成计数
async function getTodayGenerationCount(supabase, userId) {
    const today = getTodayDateString();
    
    try {
        // 从history表统计今日该用户的生成记录数
        const { count, error } = await supabase
            .from('history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lte('created_at', `${today}T23:59:59.999Z`);
            
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

export default async function handler(req, res) {
    console.log('=== user-generation-count API 开始处理 ===');
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 检查环境变量
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Supabase configuration not found'
        });
    }

    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ 
            error: 'Server configuration error',
            message: '服务器配置错误'
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
        
        // 验证JWT token
        const user = await verifyGoogleToken(token);
        
        const userId = user.id;
        const today = getTodayDateString();
        
        // 从Supabase获取今日生成计数
        const currentCount = await getTodayGenerationCount(supabase, userId);
        
        console.log(`📊 用户 ${user.email} 今日已生成: ${currentCount}/${DAILY_GENERATION_LIMIT}`);
        
        res.json({
            currentCount: currentCount,
            limit: DAILY_GENERATION_LIMIT,
            remaining: DAILY_GENERATION_LIMIT - currentCount,
            date: today,
            user: {
                id: userId,
                email: user.email,
                name: user.name
            }
        });
        
    } catch (error) {
        console.error('❌ 获取用户生成计数失败:', error);
        
        if (error.message === 'Invalid token') {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: '登录状态无效，请重新登录' 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to get user generation count',
            message: '获取生成计数失败' 
        });
    }
}