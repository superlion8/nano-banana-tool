export default async function handler(req, res) {
  console.log('=== user-history-simple API 开始处理 ===');

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const { method } = req;
    const userId = req.headers['user-id'] || req.body?.user_id || req.query?.user_id;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required'
      });
    }

    switch (method) {
      case 'GET':
        try {
          console.log('简化查询 - 用户ID:', userId);
          
          // 使用最简单的查询 - 只获取数量
          const { count, error: countError } = await supabase
            .from('history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

          if (countError) {
            console.error('获取数量失败:', countError);
            return res.status(500).json({ 
              error: 'Count query failed',
              message: countError.message
            });
          }

          console.log('记录数量:', count);

          // 如果数量为0，直接返回
          if (count === 0) {
            return res.status(200).json({ 
              data: [],
              success: true,
              count: 0
            });
          }

          // 获取最新的50条记录
          const { data: historyData, error: historyError } = await supabase
            .from('history')
            .select('id, type, prompt, result_image, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (historyError) {
            console.error('查询失败:', historyError);
            return res.status(500).json({ 
              error: 'Database query failed',
              message: historyError.message
            });
          }

          return res.status(200).json({ 
            data: historyData || [],
            success: true,
            count: count
          });

        } catch (error) {
          console.error('查询异常:', error);
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      case 'POST':
        try {
          const { type, prompt, result_image, input_images } = req.body;
          
          if (!type || !prompt || !result_image) {
            return res.status(400).json({ 
              error: 'Missing required fields',
              message: 'type, prompt, and result_image are required'
            });
          }

          const { data: insertData, error: insertError } = await supabase
            .from('history')
            .insert({
              user_id: userId,
              type,
              prompt,
              result_image,
              input_images: input_images || null,
              created_at: new Date().toISOString()
            })
            .select();

          if (insertError) {
            return res.status(500).json({ 
              error: 'Failed to save history',
              message: insertError.message 
            });
          }

          return res.status(201).json({ 
            data: insertData,
            success: true 
          });

        } catch (error) {
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
