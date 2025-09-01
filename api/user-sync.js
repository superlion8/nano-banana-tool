// 用户同步 API 端点
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许POST方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查环境变量
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
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
      process.env.SUPABASE_ANON_KEY
    );
  } catch (error) {
    console.error('Supabase客户端初始化失败:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message 
    });
  }

  try {
    const { user_id, email, name, avatar_url } = req.body;

    // 验证必需字段
    if (!user_id || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'user_id and email are required'
      });
    }

    console.log('同步用户信息:', { user_id, email, name });

    // 同步用户信息到 users 表
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: user_id,
        email: email,
        name: name || email.split('@')[0],
        avatar_url: avatar_url || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();

    if (userError) {
      console.error('用户同步失败:', userError);
      return res.status(500).json({ 
        error: 'Failed to sync user',
        message: userError.message 
      });
    }

    console.log('用户信息同步成功');
    return res.status(200).json({ 
      data: userData && userData[0] ? userData[0] : null,
      success: true 
    });

  } catch (error) {
    console.error('用户同步异常:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
