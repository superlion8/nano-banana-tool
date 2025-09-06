-- 为history表添加图片URL字段
-- 请在 Supabase SQL Editor 中运行

-- 1. 添加新字段
ALTER TABLE public.history 
ADD COLUMN IF NOT EXISTS result_image_url TEXT,
ADD COLUMN IF NOT EXISTS input_image_urls JSONB;

-- 2. 添加字段注释
COMMENT ON COLUMN public.history.result_image_url IS '生成图片的URL（替代Base64）';
COMMENT ON COLUMN public.history.input_image_urls IS '输入图片的URL数组（替代Base64）';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_history_result_image_url ON public.history(result_image_url);
CREATE INDEX IF NOT EXISTS idx_history_input_image_urls ON public.history USING GIN(input_image_urls);

-- 4. 创建函数：将Base64转换为URL（需要配合上传API使用）
CREATE OR REPLACE FUNCTION convert_base64_to_url(
    base64_data TEXT,
    image_type TEXT DEFAULT 'result'
)
RETURNS TEXT AS $$
DECLARE
    image_url TEXT;
BEGIN
    -- 这里需要调用上传API，暂时返回占位符
    -- 实际使用时，应该调用 /api/upload-image 接口
    image_url := 'https://your-domain.com/images/' || image_type || '_' || extract(epoch from now())::text || '.png';
    
    RETURN image_url;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数：批量转换现有数据
CREATE OR REPLACE FUNCTION migrate_base64_to_urls()
RETURNS TABLE (
    id BIGINT,
    result_image_url TEXT,
    input_image_urls JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        CASE 
            WHEN h.result_image IS NOT NULL AND h.result_image != '' 
            THEN 'https://your-domain.com/images/result_' || h.id::text || '.png'
            ELSE NULL
        END as result_image_url,
        CASE 
            WHEN h.input_images IS NOT NULL AND h.input_images != '[]'::jsonb
            THEN jsonb_build_array('https://your-domain.com/images/input_' || h.id::text || '_1.png')
            ELSE NULL
        END as input_image_urls
    FROM public.history h
    WHERE h.result_image IS NOT NULL OR h.input_images IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建视图：包含URL的历史记录
CREATE OR REPLACE VIEW history_with_urls AS
SELECT 
    h.id,
    h.user_id,
    h.type,
    h.prompt,
    h.result_image,
    h.result_image_url,
    h.input_images,
    h.input_image_urls,
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

-- 7. 示例查询
-- 查看有URL字段的记录
SELECT 
    id,
    type,
    prompt,
    CASE 
        WHEN result_image_url IS NOT NULL THEN 'URL'
        WHEN result_image IS NOT NULL THEN 'Base64'
        ELSE 'None'
    END as result_image_type,
    CASE 
        WHEN input_image_urls IS NOT NULL THEN 'URL'
        WHEN input_images IS NOT NULL THEN 'Base64'
        ELSE 'None'
    END as input_image_type,
    created_at
FROM public.history 
ORDER BY created_at DESC 
LIMIT 10;

-- 8. 清理函数（可选）
-- DROP FUNCTION IF EXISTS convert_base64_to_url(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS migrate_base64_to_urls();
