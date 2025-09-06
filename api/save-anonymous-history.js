// 匿名用户历史记录保存API
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许POST方法
    if (req.method !== 'POST') {
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
        const { type, prompt, result_image, input_images } = req.body;
        
        // 验证必需字段
        if (!type || !prompt || !result_image) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'type, prompt, and result_image are required'
            });
        }

        console.log('保存匿名用户历史记录:', { type, prompt: prompt.substring(0, 50) + '...' });

        // 插入匿名用户历史记录（user_id 为 NULL）
        const { data: insertData, error: insertError } = await supabase
            .from('history')
            .insert({
                user_id: null, // 匿名用户使用 NULL
                type,
                prompt,
                result_image,
                input_images: input_images || null,
                created_at: new Date().toISOString()
            })
            .select();

        if (insertError) {
            console.error('保存匿名用户历史记录失败:', insertError);
            return res.status(500).json({ 
                error: 'Failed to save anonymous history',
                message: insertError.message 
            });
        }

        console.log('匿名用户历史记录保存成功');
        return res.status(201).json({ 
            data: insertData && insertData[0] ? insertData[0] : null,
            success: true 
        });

    } catch (error) {
        console.error('匿名用户历史记录保存异常:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
