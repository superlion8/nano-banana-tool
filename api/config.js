export default function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 返回Supabase配置（这些是公开的anon key，相对安全）
  const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    googleClientId: process.env.GOOGLE_CLIENT_ID
  };

  // 检查必要的配置是否存在
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Supabase configuration not found',
      message: 'Please check your environment variables'
    });
  }

  // 返回配置信息
  res.status(200).json(config);
}
