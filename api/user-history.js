import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 检查环境变量
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Supabase configuration not found'
    });
  }

  // 初始化Supabase客户端
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

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
        // 获取用户历史记录
        const { data: historyData, error: historyError } = await supabase
          .from('history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (historyError) {
          console.error('History fetch error:', historyError);
          return res.status(500).json({ error: historyError.message });
        }

        return res.status(200).json({ data: historyData });

      case 'POST':
        // 添加历史记录
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
          console.error('History insert error:', insertError);
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(201).json({ data: insertData });

      case 'DELETE':
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ 
            error: 'Missing ID',
            message: 'History item ID is required'
          });
        }

        // 验证记录属于当前用户
        const { data: existingRecord } = await supabase
          .from('history')
          .select('user_id')
          .eq('id', id)
          .single();

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
          console.error('History delete error:', deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ message: 'Record deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}