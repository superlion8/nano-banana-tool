// 获取匿名用户历史记录API
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许GET请求
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
        // 检查是否为简单查询模式
        const isSimpleQuery = req.query.simple === 'true';
        
        if (isSimpleQuery) {
            // 简单模式：只返回空数组，避免复杂查询导致超时
            console.log('使用简化模式，返回空数组');
            return res.status(200).json({ 
                data: [],
                success: true,
                message: '匿名用户无历史记录'
            });
        }

        // 获取查询参数
        const { 
            page = 1, 
            limit = 10
        } = req.query;

        const pageSize = Math.min(parseInt(limit), 10); // 限制更小的页面大小
        const offset = (parseInt(page) - 1) * pageSize;

        console.log('查询匿名用户历史记录:', { page, limit: pageSize });

        // 简化查询 - 只查询最近的记录，不使用复杂过滤
        const { data: historyData, error: historyError } = await supabase
            .from('history')
            .select('id, prompt, result_image, created_at')
            .is('user_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (historyError) {
            console.error('查询匿名用户历史记录失败:', historyError);
            return res.status(500).json({ 
                error: 'Database query failed',
                message: historyError.message
            });
        }

        // 处理数据格式
        const processedData = (historyData || []).map(item => ({
            id: item.id,
            user_id: null,
            user_name: '匿名用户',
            user_email: '未登录',
            user_avatar: null,
            type: 'image',
            prompt: item.prompt,
            result_image: item.result_image,
            input_images: null,
            created_at: item.created_at
        }));

        console.log('查询成功，返回匿名用户记录数:', processedData.length);

        return res.status(200).json({ 
            data: processedData,
            success: true,
            pagination: {
                page: parseInt(page),
                limit: pageSize,
                total: processedData.length,
                pages: 1
            }
        });

    } catch (error) {
        console.error('API处理异常:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
