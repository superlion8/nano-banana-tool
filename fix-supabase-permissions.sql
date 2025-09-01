-- 修复 Supabase 权限配置的 SQL 脚本
-- 请在 Supabase SQL Editor 中运行这些命令

-- 1. 检查当前 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 2. 检查表是否存在
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'history');

-- 3. 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 4. 如果 users 表不存在，创建它
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 如果 history 表不存在，创建它
CREATE TABLE IF NOT EXISTS public.history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    result_image TEXT,
    input_images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- 7. 删除现有的可能冲突的策略
DROP POLICY IF EXISTS "Allow anonymous access to users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous access to history" ON public.history;
DROP POLICY IF EXISTS "Users can view own history" ON public.history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.history;

-- 8. 创建允许匿名访问的策略（用于 anon key）
-- 注意：这允许所有匿名访问，仅用于测试。生产环境应该使用更严格的策略

-- 允许匿名用户对所有操作
CREATE POLICY "Allow anonymous access to users" ON public.users
    FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to history" ON public.history
    FOR ALL USING (true);

-- 9. 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON public.history(created_at DESC);

-- 10. 验证权限配置
-- 检查策略是否创建成功
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'history');

-- 11. 测试插入权限（可选）
-- INSERT INTO public.users (id, email, name) VALUES ('test_user', 'test@example.com', 'Test User');
-- SELECT * FROM public.users WHERE id = 'test_user';
-- DELETE FROM public.users WHERE id = 'test_user';
