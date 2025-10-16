const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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

export default async function handler(req, res) {
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

    try {
        // 验证环境变量
        if (!GOOGLE_CLIENT_ID) {
            console.error('GOOGLE_CLIENT_ID environment variable is required');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: '服务器配置错误'
            });
        }

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
        
        const userId = user.id;
        const today = getTodayDateString();
        const countKey = `${userId}_${today}`;
        
        const currentCount = userGenerationCounts.get(countKey) || 0;
        
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