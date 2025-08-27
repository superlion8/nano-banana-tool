# 🍌 Nano Banana Image Generation Tool

基于 Google Gemini API 的 AI 图像生成工具

## 功能特性

- **文本生成图像**: 输入文字描述生成高质量图像
- **图像修改**: 支持图生图和文本+图像生成新图像
- **现代化界面**: 美观的响应式设计
- **拖拽上传**: 支持拖拽文件上传
- **图像预览**: 上传前可预览源图像
- **一键下载**: 生成的图像可直接下载

## 技术栈

- 前端: HTML5, CSS3, JavaScript (ES6+)
- API: Google Gemini 2.5 Flash Image Preview
- 部署: 支持任何静态网站托管服务

## 部署选项

### 方案1: Vercel (推荐)
1. 将项目文件上传到 [Vercel](https://vercel.com)
2. 导入项目并自动部署
3. 获得形如 `https://your-project.vercel.app` 的公开URL

### 方案2: Netlify
1. 将项目文件上传到 [Netlify](https://netlify.com)
2. 拖拽文件夹到部署区域
3. 获得形如 `https://your-project.netlify.app` 的公开URL

### 方案3: GitHub Pages
1. 创建GitHub仓库
2. 上传项目文件
3. 在仓库设置中启用GitHub Pages
4. 获得形如 `https://username.github.io/repo-name` 的公开URL

### 方案4: Firebase Hosting
1. 使用 Firebase CLI 初始化项目
2. 部署到 Firebase Hosting
3. 获得形如 `https://your-project.web.app` 的公开URL

## 本地运行

1. 下载所有文件
2. 在浏览器中打开 `index.html`
3. 开始使用图像生成功能

## API 配置

工具使用 Google Gemini API，API密钥已预配置。如需更换：

1. 打开 `index.html`
2. 找到 `API_KEY` 变量
3. 替换为您的 Gemini API 密钥

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

## 注意事项

- 确保网络连接稳定
- 图像生成可能需要10-30秒
- 支持常见图像格式 (JPG, PNG, GIF, WebP)
- 生成的图像为PNG格式

## 技术支持

如有问题或建议，请创建Issue或联系开发者。

---

🤖 Created with Claude Code