// 图片压缩API - 将Base64图片压缩并返回更小的Base64数据
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许POST方法
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { base64Data, quality = 0.7, maxWidth = 800, maxHeight = 600 } = req.body;
        
        if (!base64Data) {
            return res.status(400).json({ 
                error: 'Missing base64Data',
                message: 'Base64 data is required'
            });
        }

        // 验证Base64格式
        if (!base64Data.startsWith('data:image/')) {
            return res.status(400).json({ 
                error: 'Invalid format',
                message: 'Data must start with data:image/'
            });
        }

        // 提取图片格式
        const format = base64Data.match(/data:image\/([^;]+)/)?.[1] || 'png';
        const base64String = base64Data.split(',')[1];

        // 在Node.js环境中压缩图片
        const sharp = await import('sharp');
        
        // 将Base64转换为Buffer
        const inputBuffer = Buffer.from(base64String, 'base64');
        
        // 获取原始图片信息
        const metadata = await sharp.default(inputBuffer).metadata();
        console.log('原始图片信息:', {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: inputBuffer.length
        });

        // 压缩图片
        let compressedBuffer = sharp.default(inputBuffer)
            .resize(maxWidth, maxHeight, { 
                fit: 'inside',
                withoutEnlargement: true
            });

        // 根据格式设置压缩参数
        if (format === 'jpeg' || format === 'jpg') {
            compressedBuffer = compressedBuffer.jpeg({ quality: Math.round(quality * 100) });
        } else if (format === 'png') {
            compressedBuffer = compressedBuffer.png({ 
                quality: Math.round(quality * 100),
                compressionLevel: 9
            });
        } else if (format === 'webp') {
            compressedBuffer = compressedBuffer.webp({ quality: Math.round(quality * 100) });
        }

        // 执行压缩
        const result = await compressedBuffer.toBuffer();
        
        // 生成压缩后的Base64
        const compressedBase64 = `data:image/${format};base64,${result.toString('base64')}`;
        
        // 计算压缩率
        const originalSize = inputBuffer.length;
        const compressedSize = result.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

        console.log('压缩结果:', {
            originalSize: originalSize,
            compressedSize: compressedSize,
            compressionRatio: compressionRatio + '%'
        });

        return res.status(200).json({
            success: true,
            compressedData: compressedBase64,
            originalSize: originalSize,
            compressedSize: compressedSize,
            compressionRatio: compressionRatio + '%',
            format: format
        });

    } catch (error) {
        console.error('Compression error:', error);
        return res.status(500).json({ 
            error: 'Compression failed',
            message: error.message 
        });
    }
}
