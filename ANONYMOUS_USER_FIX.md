# 修复未登录用户历史记录保存问题

## 问题描述

未登录用户生成的图像记录无法保存到Supabase数据库中，导致：
1. 未登录用户无法查看历史记录
2. 管理员无法看到匿名用户的数据
3. 数据统计不完整

## 根本原因

1. **数据库约束**：`history` 表的 `user_id` 字段设置为 `NOT NULL`
2. **前端逻辑**：未登录用户直接跳过后端保存
3. **API验证**：要求必须有 `user_id` 参数

## 修复步骤

### 1. 数据库修复

在 Supabase SQL Editor 中运行 `fix-anonymous-user-history.sql`：

```sql
-- 修改 user_id 字段允许 NULL 值
ALTER TABLE public.history 
ALTER COLUMN user_id DROP NOT NULL;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "Allow anonymous access to history" ON public.history;
CREATE POLICY "Allow anonymous access to history" ON public.history
    FOR ALL USING (true);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_history_user_id_null ON public.history(user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_history_user_id_not_null ON public.history(user_id) WHERE user_id IS NOT NULL;
```

### 2. 添加新的API端点

#### 保存匿名用户历史记录
- 文件：`/api/save-anonymous-history.js`
- 功能：允许 `user_id` 为 `NULL` 的记录插入

#### 获取匿名用户历史记录
- 文件：`/api/get-anonymous-history.js`
- 功能：查询 `user_id` 为 `NULL` 的记录

### 3. 前端代码修复

需要修改 `index.html` 中的以下函数：

#### 修改 `saveHistoryToSupabase` 函数
```javascript
async function saveHistoryToSupabase(historyItem) {
    if (!config) {
        console.log('配置未加载，跳过历史记录同步');
        return false;
    }
    
    try {
        let response;
        
        if (currentUser) {
            // 已登录用户使用原有API
            response = await fetch('/api/user-history-unified', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': currentUser.id
                },
                body: JSON.stringify({
                    type: historyItem.type,
                    prompt: historyItem.prompt,
                    result_image: historyItem.resultImage,
                    input_images: historyItem.inputImages,
                    user_id: currentUser.id
                })
            });
        } else {
            // 未登录用户使用新的匿名API
            response = await fetch('/api/save-anonymous-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: historyItem.type,
                    prompt: historyItem.prompt,
                    result_image: historyItem.resultImage,
                    input_images: historyItem.inputImages
                })
            });
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('保存历史记录失败:', result.error);
            return false;
        }
        
        return result.data && result.data[0] ? result.data[0] : false;
        
    } catch (error) {
        console.error('历史记录保存错误:', error);
        return false;
    }
}
```

#### 修改 `loadUserHistory` 函数
```javascript
async function loadUserHistory() {
    if (!config) {
        console.log('配置未加载，跳过历史记录加载');
        return;
    }
    
    try {
        let response;
        
        if (currentUser) {
            // 已登录用户加载个人历史记录
            response = await fetch(`/api/user-history-unified?user_id=${currentUser.id}&simple=true`, {
                method: 'GET',
                headers: {
                    'user-id': currentUser.id
                }
            });
        } else {
            // 未登录用户加载匿名历史记录
            response = await fetch('/api/get-anonymous-history?simple=true', {
                method: 'GET'
            });
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('加载历史记录失败:', result.error);
            return;
        }
        
        if (result.data && Array.isArray(result.data)) {
            userHistory = result.data.map(item => ({
                id: item.id,
                type: item.type,
                prompt: item.prompt,
                resultImage: item.result_image,
                inputImages: item.input_images,
                createdAt: item.created_at,
                userInfo: {
                    name: item.user_name || '匿名用户',
                    email: item.user_email || '未登录',
                    avatar: item.user_avatar || null
                }
            }));
            
            console.log('历史记录加载成功，数量:', userHistory.length);
            renderHistory();
        }
        
    } catch (error) {
        console.error('加载历史记录错误:', error);
    }
}
```

#### 修改页面初始化逻辑
```javascript
async function initializePage() {
    console.log('=== 页面初始化开始 ===');
    
    try {
        // 加载配置
        await loadConfig();
        
        // 初始化Supabase
        await initializeSupabase();
        
        // 检查是否有保存的用户信息
        const savedUser = localStorage.getItem('nanoBananaUser');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                currentUser = user;
                console.log('从localStorage恢复用户信息:', user.id);
                
                // 更新UI显示
                updateLoginUI();
                
                // 显示历史记录主标签页
                document.getElementById('history-main-tab').style.display = 'inline-block';
                
                // 加载用户历史记录
                await loadUserHistory();
            } catch (error) {
                console.error('恢复用户信息失败:', error);
                localStorage.removeItem('nanoBananaUser');
            }
        } else {
            // 未登录用户也加载匿名历史记录
            console.log('未登录用户，加载匿名历史记录');
            await loadUserHistory();
        }
        
        console.log('=== 页面初始化完成 ===');
        
    } catch (error) {
        console.error('页面初始化失败:', error);
    }
}
```

### 4. 部署新文件

将以下文件部署到服务器：
- `api/save-anonymous-history.js`
- `api/get-anonymous-history.js`

### 5. 测试验证

1. **未登录用户测试**：
   - 生成一张图像
   - 检查历史记录是否显示
   - 刷新页面，检查历史记录是否保持

2. **管理员后台测试**：
   - 访问 `/admin.html`
   - 检查是否能看到匿名用户记录
   - 测试筛选功能

3. **数据库验证**：
   ```sql
   -- 查看匿名用户记录
   SELECT * FROM history WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 10;
   
   -- 统计记录数量
   SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN user_id IS NULL THEN 1 END) as anonymous,
       COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as logged_in
   FROM history;
   ```

## 预期效果

修复后：
1. ✅ 未登录用户可以保存和查看历史记录
2. ✅ 管理员可以看到所有用户（包括匿名）的数据
3. ✅ 数据统计包含匿名用户
4. ✅ 登录后可以继续使用，历史记录不会丢失

## 注意事项

1. **数据隐私**：匿名用户记录不包含个人信息
2. **存储限制**：匿名用户记录可能占用更多存储空间
3. **清理策略**：建议定期清理过期的匿名用户记录
4. **性能影响**：需要为 `user_id` 为 `NULL` 的查询添加索引

## 回滚方案

如果修复后出现问题，可以回滚：

```sql
-- 恢复 NOT NULL 约束
ALTER TABLE public.history 
ALTER COLUMN user_id SET NOT NULL;

-- 删除匿名用户记录
DELETE FROM public.history WHERE user_id IS NULL;
```
