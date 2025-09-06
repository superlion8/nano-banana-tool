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
        // 获取查询参数
        const { 
            page = 1, 
            limit = 20, 
            type = '', 
            search = ''
        } = req.query;

        const pageSize = Math.min(parseInt(limit), 100);
        const offset = (parseInt(page) - 1) * pageSize;

        console.log('查询匿名用户历史记录:', { page, limit, type, search });

        // 构建查询 - 只查询 user_id 为 NULL 的记录
        let query = supabase
            .from('history')
            .select('*')
            .is('user_id', null)
            .order('created_at', { ascending: false });

        // 添加过滤条件
        if (type) {
            query = query.eq('type', type);
        }

        if (search) {
            query = query.ilike('prompt', `%${search}%`);
        }

        // 添加分页
        query = query.range(offset, offset + pageSize - 1);

        const { data: historyData, error: historyError } = await query;

        if (historyError) {
            console.error('查询匿名用户历史记录失败:', historyError);
            return res.status(500).json({ 
                error: 'Database query failed',
                message: historyError.message
            });
        }

        // 获取总数
        let countQuery = supabase
            .from('history')
            .select('*', { count: 'exact', head: true })
            .is('user_id', null);

        if (type) {
            countQuery = countQuery.eq('type', type);
        }

        if (search) {
            countQuery = countQuery.ilike('prompt', `%${search}%`);
        }

        const { count: totalCount, error: countError } = await countQuery;

        if (countError) {
            console.error('获取匿名用户历史记录总数失败:', countError);
        }

        // 处理数据格式
        const processedData = (historyData || []).map(item => ({
            id: item.id,
            user_id: null,
            user_name: '匿名用户',
            user_email: '未登录',
            user_avatar: null,
            type: item.type,
            prompt: item.prompt,
            result_image: item.result_image,
            input_images: item.input_images,
            created_at: item.created_at
        }));

        console.log('查询成功，返回匿名用户记录数:', processedData.length);

        return res.status(200).json({ 
            data: processedData,
            success: true,
            pagination: {
                page: parseInt(page),
                limit: pageSize,
                total: totalCount || 0,
                pages: Math.ceil((totalCount || 0) / pageSize)
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
