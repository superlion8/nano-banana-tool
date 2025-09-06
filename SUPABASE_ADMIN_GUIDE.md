# Supabase 数据管理指南

## 🎯 解决的问题

1. **显示用户名称** - 在history表中显示用户名称而不是只显示user_id
2. **查看匿名用户数据** - 在history表中显示未登录用户的生成结果
3. **显示图片URL** - 在history表中显示原图和生成结果的URL

## 📁 新增文件

### 1. API文件
- `api/admin-history.js` - 管理员历史记录查看API

### 2. 数据库优化
- `improve-database.sql` - 数据库优化脚本

### 3. 管理界面
- `admin.html` - 数据管理后台界面

## 🚀 使用步骤

### 步骤1：运行数据库优化脚本

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 SQL Editor
4. 复制并运行 `improve-database.sql` 中的内容

### 步骤2：部署新的API

将 `api/admin-history.js` 部署到你的Vercel项目：

```bash
# 文件已经创建，直接推送到GitHub
git add api/admin-history.js
git commit -m "feat: 添加管理员历史记录查看API"
git push origin dev
```

### 步骤3：访问管理后台

1. 部署完成后，访问：`https://your-domain.vercel.app/admin.html`
2. 或者本地访问：`http://localhost:3000/admin.html`

## 🔧 功能特性

### 管理员API (`/api/admin-history`)

**查询参数：**
- `page` - 页码（默认：1）
- `limit` - 每页数量（默认：50，最大：100）
- `type` - 记录类型过滤
- `search` - 提示词搜索
- `include_anonymous` - 是否包含匿名用户（默认：true）
- `user_id` - 特定用户ID过滤

**返回数据格式：**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "user_id": "user_123",
      "user_name": "张三",
      "user_email": "zhang@example.com",
      "user_avatar": "https://...",
      "type": "text-to-image",
      "prompt": "生成一只猫",
      "result_image": "image_url",
      "input_images": ["input1.jpg", "input2.jpg"],
      "created_at": "2024-01-01T00:00:00Z",
      "result_image_url": "https://your-domain.com/images/result.jpg",
      "input_image_urls": ["https://your-domain.com/images/input1.jpg"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "pages": 20
  }
}
```

### 管理后台界面

**功能：**
- 📊 统计信息展示（总记录数、已登录用户、匿名用户）
- 🔍 多条件搜索和过滤
- 👤 用户信息显示（头像、姓名、邮箱）
- 🖼️ 图片预览功能
- 📄 分页浏览
- 🏷️ 记录类型标签

**搜索功能：**
- 按提示词关键词搜索
- 按记录类型过滤
- 按用户ID过滤
- 选择是否包含匿名用户

## 🗄️ 数据库优化

### 新增索引
```sql
-- 提高查询性能
CREATE INDEX idx_history_created_at_desc ON public.history(created_at DESC);
CREATE INDEX idx_history_type ON public.history(type);
CREATE INDEX idx_history_user_id_created_at ON public.history(user_id, created_at DESC);
```

### 新增视图
```sql
-- 历史记录与用户信息关联视图
CREATE VIEW history_with_users AS
SELECT 
    h.*,
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
```

### 新增函数
- `get_history_stats()` - 获取统计信息
- `search_history()` - 搜索历史记录

## 🔒 安全配置

### RLS策略
```sql
-- 只允许service_role访问所有数据
CREATE POLICY "Allow service role full access to history" ON public.history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');
```

### 环境变量
确保在Vercel中设置：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` （必须使用service_role key）

## 📊 使用示例

### 1. 查看所有数据
```
GET /api/admin-history
```

### 2. 搜索特定内容
```
GET /api/admin-history?search=cat&type=text-to-image&page=1&limit=20
```

### 3. 查看特定用户
```
GET /api/admin-history?user_id=user_123&include_anonymous=false
```

### 4. 只查看已登录用户
```
GET /api/admin-history?include_anonymous=false
```

## 🎨 界面预览

管理后台界面包含：
- 统计卡片显示总体数据
- 过滤器面板支持多条件搜索
- 数据表格显示详细信息
- 图片预览模态框
- 分页导航

## ⚠️ 注意事项

1. **权限控制** - 管理后台应该限制访问权限
2. **数据安全** - 使用service_role key时要小心
3. **性能优化** - 大量数据时考虑分页和索引
4. **图片URL** - 需要根据实际部署环境修改图片URL前缀

## 🔄 更新现有功能

现有的用户历史记录功能保持不变，新增的管理功能是额外的，不会影响现有用户体验。
