import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 只允许DELETE请求
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查环境变量
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Supabase configuration not found'
    });
  }

  try {
    // 初始化Supabase客户端
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const userId = req.headers['user-id'] || req.body?.user_id;

    // 验证用户ID
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        message: 'User ID is required in headers or body'
      });
    }

    // 删除用户的所有历史记录
    const { error: deleteError } = await supabase
      .from('history')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Clear history error:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ 
      message: 'All history records cleared successfully' 
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}