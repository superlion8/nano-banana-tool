-- 数据库检查和优化脚本
-- 请在 Supabase SQL Editor 中运行

-- 1. 检查表是否存在
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'history');

-- 2. 检查表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'history'
ORDER BY ordinal_position;

-- 3. 检查索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'history';

-- 4. 检查数据量
SELECT 
    'users' as table_name,
    COUNT(*) as row_count
FROM users
UNION ALL
SELECT 
    'history' as table_name,
    COUNT(*) as row_count
FROM history;

-- 5. 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 6. 如果 history 表不存在，创建它
CREATE TABLE IF NOT EXISTS public.history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    result_image TEXT,
    input_images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 如果 users 表不存在，创建它
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON public.history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 9. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- 10. 删除可能冲突的策略
DROP POLICY IF EXISTS "Allow anonymous access to users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous access to history" ON public.history;

-- 11. 创建允许所有操作的策略（用于 service_role key）
CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on history" ON public.history
    FOR ALL USING (true);

-- 12. 验证配置
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 13. 测试查询性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, type, prompt, result_image, created_at
FROM history 
WHERE user_id = 'test_user'
ORDER BY created_at DESC 
LIMIT 20;
