-- 修复未登录用户历史记录保存问题
-- 请在 Supabase SQL Editor 中运行

-- 1. 检查当前表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'history'
ORDER BY ordinal_position;

-- 2. 修改 user_id 字段允许 NULL 值
ALTER TABLE public.history 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. 为未登录用户添加默认值（可选）
-- 如果希望为未登录用户使用特殊标识符
-- ALTER TABLE public.history 
-- ALTER COLUMN user_id SET DEFAULT 'anonymous';

-- 4. 更新 RLS 策略以支持匿名用户
DROP POLICY IF EXISTS "Allow anonymous access to history" ON public.history;

-- 创建新的策略，允许匿名用户插入和查看自己的记录
CREATE POLICY "Allow anonymous access to history" ON public.history
    FOR ALL USING (true);

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_history_user_id_null ON public.history(user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_history_user_id_not_null ON public.history(user_id) WHERE user_id IS NOT NULL;

-- 6. 验证修改结果
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'history'
AND column_name = 'user_id';

-- 7. 测试插入匿名用户记录
INSERT INTO public.history (user_id, type, prompt, result_image, created_at)
VALUES (NULL, 'text-to-image', '测试匿名用户记录', 'test_image_data', NOW());

-- 8. 验证匿名用户记录
SELECT * FROM public.history WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 5;

-- 9. 清理测试数据
DELETE FROM public.history WHERE prompt = '测试匿名用户记录';
