# 🍌 Nano Banana Image Generation Tool

基于 Google Gemini API 的 AI 图像生成工具

## 功能特性

- **文本生成图像**: 输入文字描述生成高质量图像
- **图像修改**: 支持图生图和文本+图像生成新图像
- **现代化界面**: 美观的响应式设计
- **拖拽上传**: 支持拖拽文件上传
- **图像预览**: 上传前可预览源图像
- **一键下载**: 生成的图像可直接下载
- **🔒 安全保护**: API密钥通过服务器端保护，不在前端暴露

## 技术栈

- 前端: HTML5, CSS3, JavaScript (ES6+)
- 后端: Node.js, Express  
- API: Google Gemini 2.5 Flash Image Preview
- 部署: Vercel, Netlify 等平台

## ⚠️ 重要安全提醒

**如果你之前使用了暴露的API密钥，请立即:**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 撤销旧的API密钥
3. 生成新的API密钥

## 本地开发设置

### 1. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加你的API密钥
# GEMINI_API_KEY=你的新API密钥
```

### 2. 安装和运行
```bash
npm install
npm start
```

访问 http://localhost:3000

## 部署选项

### Vercel 部署 (推荐)
1. 在 Vercel 项目设置中添加环境变量:
   - Key: `GEMINI_API_KEY`
   - Value: 你的Gemini API密钥
2. 连接GitHub仓库
3. 自动部署

### Netlify 部署
1. 在 Netlify 站点设置中添加环境变量:
   - Key: `GEMINI_API_KEY` 
   - Value: 你的Gemini API密钥
2. 连接仓库并部署

## 使用说明

### 文本生成图像
1. 切换到"文本生成图像"标签
2. 输入详细的图像描述
3. 点击"生成图像"
4. 等待生成完成并下载

### 图像修改
1. 切换到"图像修改"标签
2. 输入修改描述
3. 选择或拖拽源图像文件
4. 点击"修改图像"
5. 等待生成完成并下载

## 安全架构

现在API密钥安全地存储在服务器端：
- 前端通过 `/api/generate-image` 和 `/api/edit-image` 调用后端API
- 后端代理请求到 Google Gemini API
- API密钥仅在服务器环境中使用，不会暴露给客户端

## 注意事项

- 确保网络连接稳定
- 图像生成可能需要10-30秒
- 支持常见图像格式 (JPG, PNG, GIF, WebP)
- 生成的图像为PNG格式

## 技术支持

如有问题或建议，请创建Issue或联系开发者。

---

🤖 Created with Claude Code

<!-- Last updated: 2025年 8月28日 星期四 20时45分18秒 CST -->
