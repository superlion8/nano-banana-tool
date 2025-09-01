# Vercel 环境变量配置说明

## 问题解决

由于启用了 Supabase RLS (Row Level Security)，需要使用 `service_role` key 来绕过权限限制。

## 需要在 Vercel 上配置的环境变量

在 Vercel 项目设置中添加以下环境变量：

### 必需的环境变量

1. **SUPABASE_URL**
   - 你的 Supabase 项目 URL
   - 格式：`https://your-project-id.supabase.co`

2. **SUPABASE_SERVICE_ROLE_KEY** ⭐ **新增**
   - 你的 Supabase service role key
   - 在 Supabase Dashboard → Settings → API → Project API keys → `service_role` key
   - 这个 key 有管理员权限，可以绕过 RLS 限制

3. **SUPABASE_ANON_KEY**
   - 你的 Supabase anon key
   - 在 Supabase Dashboard → Settings → API → Project API keys → `anon` key
   - 作为备用选项

4. **GEMINI_API_KEY**
   - Google Gemini API key

### 可选的环境变量

5. **GOOGLE_CLIENT_ID**
   - Google OAuth 客户端 ID（如果使用 Google 登录）

## 如何获取 Supabase Service Role Key

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 在 **Project API keys** 部分找到 `service_role` key
5. 复制这个 key 并添加到 Vercel 环境变量中

## 代码修改说明

已修改以下文件以支持 `service_role` key：

- `api/user-sync.js` - 用户同步 API
- `api/user-history.js` - 用户历史记录 API  
- `api/clear-history.js` - 清除历史记录 API

代码会优先使用 `SUPABASE_SERVICE_ROLE_KEY`，如果没有配置则回退到 `SUPABASE_ANON_KEY`。

## 安全注意事项

⚠️ **重要**：`service_role` key 有管理员权限，请确保：

1. 只在后端 API 中使用，不要在前端暴露
2. 在 Vercel 环境变量中安全存储
3. 定期轮换 key
4. 监控 API 使用情况

## 测试步骤

1. 在 Vercel 中配置 `SUPABASE_SERVICE_ROLE_KEY`
2. 重新部署项目
3. 测试用户登录和历史记录功能
4. 检查 Vercel 函数日志确认没有 401 错误
