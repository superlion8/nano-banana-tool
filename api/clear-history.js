export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许DELETE方法
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

      // 检查环境变量
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      console.error('Supabase配置缺失');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase configuration not found'
      });
    }

      // 动态导入 Supabase 客户端
    let supabase;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      );
    } catch (error) {
      console.error('Supabase客户端初始化失败:', error);
      return res.status(500).json({
        error: 'Database connection failed',
        message: error.message
      });
    }

  try {

    const userId = req.headers['user-id'] || req.body?.user_id;

    // 验证用户ID
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required in headers or body'
      });
    }

    const userId = req.headers['user-id'] || req.body?.user_id;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required'
      });
    }

    console.log('准备清除用户历史记录:', userId);

    // 删除用户的所有历史记录
    const { error: deleteError } = await supabase
      .from('history')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('清除历史记录失败:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to clear history',
        message: deleteError.message 
      });
    }

    console.log('历史记录清除成功');
    return res.status(200).json({ 
      message: 'All history records cleared successfully',
      success: true 
    });

  } catch (error) {
    console.error('清除历史记录异常:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}