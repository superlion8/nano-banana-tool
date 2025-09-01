export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const { method } = req;
    const userId = req.headers['user-id'] || req.body?.user_id;

    // 验证用户ID
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required in headers or body'
      });
    }

    switch (method) {
      case 'GET':
        // 获取用户历史记录 - 修复版本
        try {
          console.log('开始查询历史记录，用户ID:', userId);
          
          // 添加错误处理和重试机制
          let retryCount = 0;
          const maxRetries = 3;
          let lastError;

          while (retryCount < maxRetries) {
            try {
              const { data: historyData, error: historyError } = await supabase
                .from('history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100); // 限制结果数量

              if (historyError) {
                console.error(`第${retryCount + 1}次查询失败:`, historyError);
                lastError = historyError;
                retryCount++;
                
                if (retryCount < maxRetries) {
                  console.log(`等待1秒后重试...`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
              } else {
                console.log('查询成功，返回数据条数:', historyData?.length || 0);
                return res.status(200).json({ 
                  data: historyData || [],
                  success: true 
                });
              }
            } catch (queryError) {
              console.error(`查询异常 (第${retryCount + 1}次):`, queryError);
              lastError = queryError;
              retryCount++;
              
              if (retryCount < maxRetries) {
                console.log(`等待1秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            }
          }

          // 所有重试都失败了
          console.error('所有重试都失败了，最后错误:', lastError);
          return res.status(500).json({ 
            error: 'Database query failed after retries',
            message: lastError?.message || 'Unknown error'
          });

        } catch (error) {
          console.error('历史记录查询异常:', error);
          return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
          });
        }

      case 'POST':
        // 添加历史记录 - 修复版本
        try {
          const { type, prompt, result_image, input_images } = req.body;
          
          if (!type || !prompt || !result_image) {
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
        // 删除历史记录 - 修复版本
        try {
          const { id } = req.query;
          
          if (!id) {
            return res.status(400).json({ 
              error: 'Missing ID',
              message: 'History item ID is required'
            });
          }

          console.log('准备删除历史记录:', { id, userId });

          // 验证记录属于当前用户
          const { data: existingRecord, error: checkError } = await supabase
            .from('history')
            .select('user_id')
            .eq('id', id)
            .single();

          if (checkError) {
            console.error('检查记录所有权失败:', checkError);
            return res.status(500).json({ 
              error: 'Failed to verify record ownership',
              message: checkError.message 
            });
          }

          if (!existingRecord || existingRecord.user_id !== userId) {
            return res.status(403).json({ 
              error: 'Unauthorized',
              message: 'Cannot delete this record'
            });
          }

          const { error: deleteError } = await supabase
            .from('history')
            .delete()
            .eq('id', id);

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