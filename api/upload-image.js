// 图片上传API - 将Base64图片上传到云存储并返回URL
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
        const { base64Data, filename } = req.body;
        
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
        const finalFilename = filename || `image_${Date.now()}.${format}`;

        // 方案1：使用Supabase Storage（推荐）
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.SUPABASE_URL, 
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                // 将Base64转换为Buffer
                const base64String = base64Data.split(',')[1];
                const buffer = Buffer.from(base64String, 'base64');

                // 上传到Supabase Storage
                const { data, error } = await supabase.storage
                    .from('images')
                    .upload(`generated/${finalFilename}`, buffer, {
                        contentType: `image/${format}`,
                        upsert: true
                    });

                if (error) {
                    console.error('Supabase Storage upload error:', error);
                    return res.status(500).json({ 
                        error: 'Upload failed',
                        message: error.message 
                    });
                }

                // 获取公开URL
                const { data: urlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(`generated/${finalFilename}`);

                return res.status(200).json({
                    success: true,
                    url: urlData.publicUrl,
                    filename: finalFilename,
                    size: buffer.length,
                    format: format
                });

            } catch (error) {
                console.error('Supabase Storage error:', error);
                return res.status(500).json({ 
                    error: 'Storage error',
                    message: error.message 
                });
            }
        }

        // 方案2：使用其他云存储服务（如Cloudinary、AWS S3等）
        // 这里可以添加其他云存储服务的代码

        return res.status(500).json({ 
            error: 'No storage configured',
            message: 'Please configure a storage service'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
