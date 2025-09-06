-- 更新现有记录，为Base64数据生成占位符URL
-- 请在 Supabase SQL Editor 中运行

-- 1. 更新有结果图片的记录
UPDATE public.history 
SET result_image_url = 'https://placeholder.com/400x300?text=Base64+Image'
WHERE result_image IS NOT NULL 
AND result_image != '' 
AND result_image_url IS NULL;

-- 2. 更新有输入图片的记录
UPDATE public.history 
SET input_image_urls = '["https://placeholder.com/400x300?text=Base64+Image"]'
WHERE input_images IS NOT NULL 
AND input_images != '[]'::jsonb 
AND input_image_urls IS NULL;

-- 3. 查看更新结果
SELECT 
    id,
    type,
    prompt,
    CASE 
        WHEN result_image_url IS NOT NULL THEN '有URL'
        WHEN result_image IS NOT NULL THEN '有Base64'
        ELSE '无图片'
    END as result_image_status,
    CASE 
        WHEN input_image_urls IS NOT NULL THEN '有URL'
        WHEN input_images IS NOT NULL THEN '有Base64'
        ELSE '无图片'
    END as input_image_status,
    created_at
FROM public.history 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. 统计信息
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN result_image_url IS NOT NULL THEN 1 END) as result_url_count,
    COUNT(CASE WHEN result_image IS NOT NULL THEN 1 END) as result_base64_count,
    COUNT(CASE WHEN input_image_urls IS NOT NULL THEN 1 END) as input_url_count,
    COUNT(CASE WHEN input_images IS NOT NULL THEN 1 END) as input_base64_count
FROM public.history;
