# Vercel 部署配置指南

## 🔐 环境变量配置

为了保护敏感信息，请按照以下步骤在Vercel中配置环境变量：

### 1. 登录Vercel
访问 [vercel.com](https://vercel.com) 并登录你的账户

### 2. 选择项目
选择你的 `nano-banana-tool` 项目

### 3. 进入项目设置
点击项目名称 → Settings → Environment Variables

### 4. 添加环境变量

#### 必需的环境变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API密钥 | `AIzaSyC...` |
| `SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### 可选的环境变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth客户端ID | `123456789-xxx.apps.googleusercontent.com` |

### 5. 环境变量获取方法

#### Gemini API密钥
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的API密钥
3. 复制密钥值

#### Supabase配置
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目或选择现有项目
3. 进入 Settings → API
4. 复制 Project URL 和 anon public key

#### Google OAuth客户端ID
1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 创建项目或选择现有项目
3. 启用 Google+ API 和 Google OAuth2 API
4. 在"凭据"页面创建OAuth 2.0客户端ID
5. 设置授权域名

### 6. 部署后验证

配置完成后，重新部署项目。在浏览器控制台中应该能看到：
- ✅ 配置加载成功
- ✅ Supabase客户端初始化成功

### 7. 安全注意事项

- ✅ **安全**：环境变量只在服务器端可见，不会暴露给客户端
- ✅ **推荐**：使用Supabase的anon key（公开密钥，相对安全）
- ⚠️ **注意**：不要使用Supabase的service_role key（超级管理员权限）

### 8. 故障排除

如果遇到配置问题：
1. 检查环境变量名称是否正确
2. 确认环境变量值没有多余的空格
3. 重新部署项目
4. 查看浏览器控制台的错误信息

## 🚀 部署命令

```bash
# 安装依赖
npm install

# 本地测试
npm start

# 部署到Vercel
vercel --prod
```

## 📝 本地开发

创建 `.env` 文件（不要提交到Git）：

```bash
cp .env.example .env
# 编辑 .env 文件，填入真实的API密钥
```
