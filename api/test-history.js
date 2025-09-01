export default async function handler(req, res) {
  console.log('=== test-history API 开始处理 ===');

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取用户ID
    const userId = req.headers['user-id'] || req.query.user_id;
    console.log('测试用户ID:', userId);

    if (!userId) {
      return res.status(400).json({
        error: 'Missing user ID',
        message: 'Please provide user-id in headers or user_id in query'
      });
    }

    // 检查环境变量
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Supabase configuration not found'
      });
    }

    // 创建 Supabase 客户端
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseKey = serviceRoleKey || anonKey;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('开始测试历史记录查询...');

    // 测试最简单的查询 - 只获取数量
    console.log('测试1: 获取记录数量...');
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
        success: true,
        message: 'No history records found',
        data: {
          userId: userId,
          recordCount: 0,
          records: []
        }
      });
    }

    // 测试2: 获取最新的一条记录
    console.log('测试2: 获取最新记录...');
    const { data: historyData, error: historyError } = await supabase
      .from('history')
      .select('id, type, prompt, result_image, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('查询完成');
    console.log('错误:', historyError);
    console.log('数据条数:', historyData?.length || 0);

    if (historyError) {
      return res.status(500).json({
        error: 'History query failed',
        message: historyError.message,
        details: historyError.details,
        hint: historyError.hint
      });
    }

    return res.status(200).json({
      success: true,
      message: 'History query successful',
      data: {
        userId: userId,
        recordCount: historyData?.length || 0,
        records: historyData || []
      }
    });

  } catch (error) {
    console.error('测试历史记录异常:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
