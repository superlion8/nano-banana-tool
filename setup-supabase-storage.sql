-- 设置Supabase Storage用于存储图片
-- 请在 Supabase SQL Editor 中运行

-- 1. 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images',
    'images',
    true,
    52428800, -- 50MB 限制
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 设置存储桶策略
-- 允许匿名用户上传图片
CREATE POLICY "Allow anonymous uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'images');

-- 允许匿名用户查看图片
CREATE POLICY "Allow anonymous access" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

-- 允许匿名用户删除图片（可选）
CREATE POLICY "Allow anonymous delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'images');

-- 3. 验证存储桶创建
SELECT * FROM storage.buckets WHERE id = 'images';

-- 4. 测试上传权限
-- 这个查询会显示存储桶的配置信息
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'images';
