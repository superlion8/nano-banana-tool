

export default async function handler(req, res) {
  console.log('=== test-connection API 开始处理 ===');

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查环境变量
    console.log('检查环境变量...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    console.log('SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '已设置' : '未设置');
    console.log('SUPABASE_ANON_KEY:', anonKey ? '已设置' : '未设置');

    if (!supabaseUrl) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'SUPABASE_URL not found'
      });
    }

    if (!serviceRoleKey && !anonKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'No Supabase keys found'
      });
    }

    // 测试 Supabase 连接
    console.log('开始测试 Supabase 连接...');
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseKey = serviceRoleKey || anonKey;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Supabase 客户端创建成功');

    // 测试最简单的查询 - 只检查表是否存在
    console.log('测试表是否存在...');
    const { data, error } = await supabase
      .from('history')
      .select('id')
      .limit(1)
      .maybeSingle(); // 使用 maybeSingle 避免找不到记录时的错误

    console.log('查询结果:', { data, error });

    if (error) {
      // 如果是表不存在的错误，尝试创建表
      if (error.message.includes('relation "history" does not exist')) {
        console.log('history 表不存在，尝试创建...');
        return res.status(200).json({
          success: true,
          message: 'Supabase connection successful, but history table does not exist',
          data: {
            url: supabaseUrl,
            keyType: serviceRoleKey ? 'service_role' : 'anon',
            tableExists: false,
            suggestion: 'Please create the history table in Supabase'
          }
        });
      }

      return res.status(500).json({
        error: 'Database connection failed',
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      data: {
        url: supabaseUrl,
        keyType: serviceRoleKey ? 'service_role' : 'anon',
        tableExists: true,
        hasData: data !== null
      }
    });

  } catch (error) {
    console.error('测试连接异常:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
