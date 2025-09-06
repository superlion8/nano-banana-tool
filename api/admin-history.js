// 管理员历史记录查看API - 支持显示所有用户数据
export default async function handler(req, res) {
  console.log('=== admin-history API 开始处理 ===');
  console.log('请求方法:', req.method);
  console.log('请求头:', req.headers);

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查环境变量
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Supabase configuration not found'
    });
  }

  // 动态导入 Supabase 客户端
  let supabase;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase 客户端创建成功');
  } catch (error) {
    console.error('Supabase客户端初始化失败:', error);
    return res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }

  try {
    // 获取查询参数
    const { 
      page = 1, 
      limit = 50, 
      type = '', 
      search = '',
      include_anonymous = 'true',
      user_id = ''
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100); // 最大100条
    const offset = (parseInt(page) - 1) * pageSize;

    console.log('查询参数:', { page, limit, type, search, include_anonymous, user_id });

    // 构建查询
    let query = supabase
      .from('history')
      .select(`
        id,
        user_id,
        type,
        prompt,
        result_image,
        input_images,
        created_at,
        users!inner(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // 添加过滤条件
    if (type) {
      query = query.eq('type', type);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (search) {
      query = query.ilike('prompt', `%${search}%`);
    }

    // 处理匿名用户
    if (include_anonymous === 'false') {
      // 只显示已登录用户
      query = query.not('user_id', 'is', null);
    }

    // 添加分页
    query = query.range(offset, offset + pageSize - 1);

    console.log('执行查询...');
    const { data: historyData, error: historyError, count } = await query;

    if (historyError) {
      console.error('查询失败:', historyError);
      return res.status(500).json({
        error: 'Database query failed',
        message: historyError.message
      });
    }

    // 获取总数
    let countQuery = supabase
      .from('history')
      .select('*', { count: 'exact', head: true });

    if (type) {
      countQuery = countQuery.eq('type', type);
    }

    if (user_id) {
      countQuery = countQuery.eq('user_id', user_id);
    }

    if (search) {
      countQuery = countQuery.ilike('prompt', `%${search}%`);
    }

    if (include_anonymous === 'false') {
      countQuery = countQuery.not('user_id', 'is', null);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('获取总数失败:', countError);
    }

    // 处理数据格式
    const processedData = (historyData || []).map(item => {
      const user = item.users || {};
      return {
        id: item.id,
        user_id: item.user_id,
        user_name: user.name || user.email || '匿名用户',
        user_email: user.email || '未登录',
        user_avatar: user.avatar_url || null,
        type: item.type,
        prompt: item.prompt,
        result_image: item.result_image,
        input_images: item.input_images,
        created_at: item.created_at,
        // 添加URL字段
        result_image_url: item.result_image ? `https://your-domain.com/images/${item.result_image}` : null,
        input_image_urls: item.input_images ? 
          (Array.isArray(item.input_images) ? 
            item.input_images.map(img => `https://your-domain.com/images/${img}`) : 
            [`https://your-domain.com/images/${item.input_images}`]
          ) : []
      };
    });

    console.log('查询成功，返回数据条数:', processedData.length);

    return res.status(200).json({
      success: true,
      data: processedData,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / pageSize)
      },
      filters: {
        type,
        search,
        include_anonymous: include_anonymous === 'true',
        user_id
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
