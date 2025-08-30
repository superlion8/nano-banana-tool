# 多图生成功能测试指南

## 功能概述
多图生成功能允许用户上传1-3张图像，配合文本提示词来生成新的图像。这个功能基于Google Gemini 2.5 Flash Image Preview模型。

## 测试步骤

### 1. 准备测试图像
- 使用JPEG或PNG格式的图像
- 图像大小建议小于10MB
- 确保图像清晰，没有损坏

### 2. 测试用例

#### 用例1: 单图生成
- 上传1张图像
- 输入描述：`Create a professional e-commerce fashion photo with this dress`
- 预期结果：成功生成新图像

#### 用例2: 双图生成
- 上传2张图像（例如：一张服装图片，一张模特图片）
- 输入描述：`Create a professional e-commerce fashion photo. Take the dress from the first image and let the model from the second image wear it.`
- 预期结果：成功生成模特穿着服装的图像

#### 用例3: 三图生成
- 上传3张图像
- 输入描述：`Combine elements from all three images to create a new composition`
- 预期结果：成功生成包含三个图像元素的新图像

### 3. 常见问题排查

#### 问题1: "Unable to process input image"
**可能原因：**
- 图像格式不支持（只支持JPEG和PNG）
- 图像文件损坏
- 图像分辨率过高或过低
- 图像包含不当内容

**解决方案：**
- 确保使用JPEG或PNG格式
- 尝试使用不同的图像
- 检查图像是否损坏
- 使用更清晰的图像

#### 问题2: 图像上传失败
**可能原因：**
- 文件大小超过10MB限制
- 文件格式不正确
- 浏览器不支持

**解决方案：**
- 压缩图像文件
- 转换为JPEG或PNG格式
- 使用现代浏览器

#### 问题3: API错误
**可能原因：**
- API密钥无效或过期
- 网络连接问题
- 请求格式错误

**解决方案：**
- 检查环境变量GEMINI_API_KEY
- 检查网络连接
- 查看浏览器控制台错误信息

### 4. 调试信息

功能包含详细的调试信息显示：
- 请求详情（图像数量、格式、大小等）
- 错误详情（HTTP状态、错误消息等）
- 成功响应信息

### 5. 最佳实践

1. **图像质量**：使用高质量、清晰的图像
2. **提示词**：提供详细、具体的描述
3. **图像数量**：从单图开始测试，逐步增加
4. **文件大小**：保持图像文件大小合理（建议<5MB）

### 6. 技术限制

- 最多支持3张图像
- 只支持JPEG和PNG格式
- 单张图像最大10MB
- 需要有效的Gemini API密钥

## 测试环境

- 本地开发：`npm start`
- Vercel部署：自动部署
- Netlify部署：支持Netlify functions

## 联系支持

如果遇到问题，请：
1. 查看浏览器控制台错误信息
2. 检查调试信息显示
3. 确认API密钥配置
4. 创建GitHub Issue
