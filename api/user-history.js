export default async function handler(req, res) {
  console.log('=== user-history API 开始处理 ===');
  console.log('请求方法:', req.method);
  console.log('请求头:', req.headers);
  console.log('请求体:', req.body);

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    console.log('处理 OPTIONS 请求');
    return res.status(200).end();
  }

  // 检查环境变量
  console.log('检查环境变量...');
  if (!process.env.SUPABASE_URL) {
    console.error('SUPABASE_URL 未设置');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'SUPABASE_URL not found'
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
    console.error('Supabase keys 未设置');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Supabase keys not found'
    });
  }

  console.log('环境变量检查通过');

  // 动态导入 Supabase 客户端
  let supabase;
  try {
    console.log('开始导入 Supabase 客户端...');
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    console.log('使用的 key 类型:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon');
    
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
    console.log('Supabase 客户端创建成功');
  } catch (error) {
    console.error('Supabase客户端初始化失败:', error);
    return res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }

  try {
    const { method } = req;
    const userId = req.headers['user-id'] || req.body?.user_id;

    console.log('提取的用户ID:', userId);

    // 验证用户ID
    if (!userId) {
      console.error('用户ID缺失');
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required in headers or body'
      });
    }

    switch (method) {
      case 'GET':
        console.log('处理 GET 请求 - 获取历史记录');
        try {
          console.log('开始查询历史记录，用户ID:', userId);
          
          // 简化查询，移除重试机制以减少超时风险
          const { data: historyData, error: historyError } = await supabase
            .from('history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // 减少限制数量

          console.log('查询完成，错误:', historyError);
          console.log('数据条数:', historyData?.length || 0);

          if (historyError) {
            console.error('查询失败:', historyError);
            return res.status(500).json({ 
              error: 'Database query failed',
              message: historyError.message,
              details: historyError.details,
              hint: historyError.hint
            });
          }

          console.log('查询成功，返回数据');
          return res.status(200).json({ 
            data: historyData || [],
            success: true 
          });

        } catch (error) {
          console.error('历史记录查询异常:', error);
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      case 'POST':
        console.log('处理 POST 请求 - 添加历史记录');
        try {
          const { type, prompt, result_image, input_images } = req.body;
          
          if (!type || !prompt || !result_image) {
            console.error('必需字段缺失');
            return res.status(400).json({ 
              error: 'Missing required fields',
              message: 'type, prompt, and result_image are required'
            });
          }

          console.log('准备插入历史记录:', { type, prompt, userId });

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
            console.error('插入历史记录失败:', insertError);
            return res.status(500).json({ 
              error: 'Failed to save history',
              message: insertError.message 
            });
          }

          console.log('历史记录插入成功');
          return res.status(201).json({ 
            data: insertData,
            success: true 
          });

        } catch (error) {
          console.error('插入历史记录异常:', error);
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      case 'DELETE':
        console.log('处理 DELETE 请求 - 删除历史记录');
        try {
          const { id } = req.query;
          
          if (!id) {
            console.error('ID 缺失');
            return res.status(400).json({ 
              error: 'Missing ID',
              message: 'History item ID is required'
            });
          }

          console.log('准备删除历史记录:', { id, userId });

          const { error: deleteError } = await supabase
            .from('history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // 确保只能删除自己的记录

          if (deleteError) {
            console.error('删除历史记录失败:', deleteError);
            return res.status(500).json({ 
              error: 'Failed to delete record',
              message: deleteError.message 
            });
          }

          console.log('历史记录删除成功');
          return res.status(200).json({ 
            message: 'Record deleted successfully',
            success: true 
          });

        } catch (error) {
          console.error('删除历史记录异常:', error);
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      default:
        console.log('不支持的方法:', method);
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