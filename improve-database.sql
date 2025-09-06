-- 数据库优化脚本 - 改进历史记录查看功能
-- 请在 Supabase SQL Editor 中运行

-- 1. 检查当前表结构
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'history')
ORDER BY table_name, ordinal_position;

-- 2. 为history表添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_history_created_at_desc ON public.history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_type ON public.history(type);
CREATE INDEX IF NOT EXISTS idx_history_user_id_created_at ON public.history(user_id, created_at DESC);

-- 3. 创建视图：历史记录与用户信息关联
CREATE OR REPLACE VIEW history_with_users AS
SELECT 
    h.id,
    h.user_id,
    h.type,
    h.prompt,
    h.result_image,
    h.input_images,
    h.created_at,
    u.email as user_email,
    u.name as user_name,
    u.avatar_url as user_avatar,
    CASE 
        WHEN u.name IS NOT NULL AND u.name != '' THEN u.name
        WHEN u.email IS NOT NULL THEN split_part(u.email, '@', 1)
        ELSE '匿名用户'
    END as display_name
FROM public.history h
LEFT JOIN public.users u ON h.user_id = u.id;

-- 4. 创建函数：获取历史记录统计信息
CREATE OR REPLACE FUNCTION get_history_stats()
RETURNS TABLE (
    total_records bigint,
    logged_in_users bigint,
    anonymous_users bigint,
    by_type jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as logged_in,
            COUNT(CASE WHEN user_id IS NULL THEN 1 END) as anonymous
        FROM public.history
    ),
    type_stats AS (
        SELECT jsonb_object_agg(type, count) as type_counts
        FROM (
            SELECT type, COUNT(*) as count
            FROM public.history
            GROUP BY type
        ) t
    )
    SELECT 
        s.total,
        s.logged_in,
        s.anonymous,
        COALESCE(ts.type_counts, '{}'::jsonb)
    FROM stats s, type_stats ts;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数：搜索历史记录
CREATE OR REPLACE FUNCTION search_history(
    search_term text DEFAULT '',
    record_type text DEFAULT '',
    include_anonymous boolean DEFAULT true,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 50
)
RETURNS TABLE (
    id bigint,
    user_id text,
    user_name text,
    user_email text,
    type text,
    prompt text,
    result_image text,
    input_images jsonb,
    created_at timestamptz,
    total_count bigint
) AS $$
DECLARE
    offset_val integer;
BEGIN
    offset_val := (page_num - 1) * page_size;
    
    RETURN QUERY
    WITH filtered_data AS (
        SELECT 
            h.id,
            h.user_id,
            h.type,
            h.prompt,
            h.result_image,
            h.input_images,
            h.created_at,
            u.name as user_name,
            u.email as user_email,
            COUNT(*) OVER() as total_count
        FROM public.history h
        LEFT JOIN public.users u ON h.user_id = u.id
        WHERE 
            (search_term = '' OR h.prompt ILIKE '%' || search_term || '%')
            AND (record_type = '' OR h.type = record_type)
            AND (include_anonymous OR h.user_id IS NOT NULL)
    )
    SELECT 
        fd.id,
        fd.user_id,
        COALESCE(fd.user_name, '匿名用户') as user_name,
        COALESCE(fd.user_email, '未登录') as user_email,
        fd.type,
        fd.prompt,
        fd.result_image,
        fd.input_images,
        fd.created_at,
        fd.total_count
    FROM filtered_data fd
    ORDER BY fd.created_at DESC
    LIMIT page_size OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 6. 更新RLS策略以支持管理员查看所有数据
DROP POLICY IF EXISTS "Allow all operations on history" ON public.history;
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

-- 创建新的RLS策略
CREATE POLICY "Allow service role full access to history" ON public.history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- 7. 创建示例查询
-- 查看所有历史记录（包含用户信息）
SELECT * FROM history_with_users ORDER BY created_at DESC LIMIT 10;

-- 获取统计信息
SELECT * FROM get_history_stats();

-- 搜索历史记录
SELECT * FROM search_history('cat', 'text-to-image', true, 1, 20);

-- 8. 验证优化结果
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM history_with_users 
WHERE type = 'text-to-image' 
ORDER BY created_at DESC 
LIMIT 20;
