# 安全修复说明

## 问题描述
原项目存在严重安全漏洞：Supabase URL、API密钥和Google Client ID直接硬编码在客户端代码中，任何人都可以查看源代码获取这些敏感信息。

## 修复内容

### 1. 移除硬编码凭据
- ✅ 从 `index.html` 移除硬编码的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- ✅ 从 `index.html` 移除硬编码的 `GOOGLE_CLIENT_ID`
- ✅ 所有敏感配置现在通过环境变量管理

### 2. 新增API端点
- ✅ `/api/config` - 安全获取客户端需要的配置信息
- ✅ `/api/user-history` - 处理用户历史记录的CRUD操作
- ✅ `/api/clear-history` - 清空用户所有历史记录

### 3. 前端代码更新
- ✅ 添加 `initializeSupabase()` 函数从后端获取配置
- ✅ 更新所有Supabase直接调用为后端API调用
- ✅ 保持原有功能完全不变

### 4. 依赖更新
- ✅ 添加 `@supabase/supabase-js` 到 package.json
- ✅ 更新 `.env.example` 包含所有必需环境变量

## 部署配置

### Vercel环境变量设置
在Vercel项目设置中添加以下环境变量：

```
GOOGLE_API_KEY=your_google_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url_here  
SUPABASE_ANON_KEY=your_supabase_anon_key_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

### 本地开发
1. 复制 `.env.example` 为 `.env`
2. 填入实际的API密钥和配置
3. 运行 `npm install` 安装依赖
4. 运行 `npm run dev` 启动开发服务器

## 安全改进效果

| 修复前 | 修复后 |
|--------|--------|
| 🔴 API密钥暴露在客户端源码 | ✅ 密钥安全存储在服务器环境变量 |
| 🔴 任何人可获取Supabase凭据 | ✅ 凭据仅在后端使用，客户端无法直接访问 |
| 🔴 Google Client ID硬编码 | ✅ 通过配置API安全获取 |
| 🔴 数据库直接暴露 | ✅ 通过后端API代理，增加安全层 |

## 功能验证
- ✅ 图像生成功能正常
- ✅ 用户登录/登出正常
- ✅ 历史记录保存/加载正常
- ✅ 历史记录删除功能正常
- ✅ 配置API端点测试通过

## 注意事项
1. **立即撤销旧密钥**：修复后应在Supabase控制台撤销暴露的API密钥
2. **权限检查**：建议在Supabase中设置行级安全(RLS)策略
3. **监控访问**：建议启用API访问日志监控异常请求

这个修复完全解决了敏感信息暴露的安全问题，同时保持了原有功能的完整性。