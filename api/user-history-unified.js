// 统一的用户历史记录API - 合并多个功能
export default async function handler(req, res) {
  console.log('=== user-history-unified API 开始处理 ===');
  console.log('请求方法:', req.method);
  console.log('请求头:', req.headers);

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
          // 获取查询参数
          const { 
            page = 1, 
            limit = 20, 
            type = '', 
            search = '',
            simple = 'false'
          } = req.query;

          const pageSize = Math.min(parseInt(limit), 100);
          const offset = (parseInt(page) - 1) * pageSize;

          console.log('查询参数:', { page, limit, type, search, simple });

          // 简化模式：只获取基本信息
          if (simple === 'true') {
            const { data: historyData, error: historyError } = await supabase
              .from('history')
              .select('id, type, prompt, result_image, created_at')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(pageSize);

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
              count: historyData?.length || 0
            });
          }

          // 完整模式：获取详细信息
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
            .eq('user_id', userId)
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
            console.error('查询失败:', historyError);
            return res.status(500).json({ 
              error: 'Database query failed',
              message: historyError.message
            });
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
              created_at: item.created_at
            };
          });

          return res.status(200).json({ 
            data: processedData,
            success: true,
            pagination: {
              page: parseInt(page),
              limit: pageSize,
              total: processedData.length
            }
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

      case 'DELETE':
        try {
          const { id } = req.body;
          
          if (!id) {
            return res.status(400).json({ 
              error: 'Missing record ID',
              message: 'Record ID is required for deletion'
            });
          }

          const { error: deleteError } = await supabase
            .from('history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

          if (deleteError) {
            return res.status(500).json({ 
              error: 'Failed to delete record',
              message: deleteError.message 
            });
          }

          return res.status(200).json({ 
            success: true,
            message: 'Record deleted successfully'
          });

        } catch (error) {
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API处理异常:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
