// 保存历史记录并自动处理图片URL
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许POST方法
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 检查环境变量
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Supabase configuration not found'
        });
    }

    // 动态导入 Supabase 客户端
    let supabase;
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
    } catch (error) {
        return res.status(500).json({
            error: 'Database connection failed',
            message: error.message
        });
    }

    try {
        const { type, prompt, result_image, input_images, user_id } = req.body;
        
        // 验证必需字段
        if (!type || !prompt || !result_image) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'type, prompt, and result_image are required'
            });
        }

        console.log('保存历史记录并处理图片URL:', { type, prompt: prompt.substring(0, 50) + '...' });

        // 处理结果图片URL
        let resultImageUrl = null;
        if (result_image && result_image.startsWith('data:image/')) {
            try {
                // 调用图片上传API
                const uploadResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        base64Data: result_image,
                        filename: `result_${Date.now()}.png`
                    })
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    resultImageUrl = uploadResult.url;
                    console.log('结果图片上传成功:', resultImageUrl);
                } else {
                    console.warn('结果图片上传失败，保留Base64格式');
                }
            } catch (error) {
                console.error('结果图片上传错误:', error);
            }
        }

        // 处理输入图片URL
        let inputImageUrls = null;
        if (input_images && Array.isArray(input_images) && input_images.length > 0) {
            const urls = [];
            for (let i = 0; i < input_images.length; i++) {
                const image = input_images[i];
                if (image && image.startsWith('data:image/')) {
                    try {
                        const uploadResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/upload-image`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                base64Data: image,
                                filename: `input_${Date.now()}_${i}.png`
                            })
                        });

                        if (uploadResponse.ok) {
                            const uploadResult = await uploadResponse.json();
                            urls.push(uploadResult.url);
                            console.log(`输入图片${i}上传成功:`, uploadResult.url);
                        } else {
                            console.warn(`输入图片${i}上传失败，保留Base64格式`);
                            urls.push(image); // 保留原始Base64
                        }
                    } catch (error) {
                        console.error(`输入图片${i}上传错误:`, error);
                        urls.push(image); // 保留原始Base64
                    }
                } else {
                    urls.push(image); // 保留非Base64数据
                }
            }
            inputImageUrls = urls;
        }

        // 保存到数据库
        const { data: insertData, error: insertError } = await supabase
            .from('history')
            .insert({
                user_id: user_id || null,
                type,
                prompt,
                result_image: result_image, // 保留原始Base64
                result_image_url: resultImageUrl, // 新增URL字段
                input_images: input_images || null, // 保留原始Base64
                input_image_urls: inputImageUrls, // 新增URL字段
                created_at: new Date().toISOString()
            })
            .select();

        if (insertError) {
            console.error('保存历史记录失败:', insertError);
            return res.status(500).json({ 
                error: 'Failed to save history',
                message: insertError.message 
            });
        }

        console.log('历史记录保存成功');
        return res.status(201).json({ 
            data: insertData && insertData[0] ? insertData[0] : null,
            success: true,
            urls: {
                result_image_url: resultImageUrl,
                input_image_urls: inputImageUrls
            }
        });

    } catch (error) {
        console.error('保存历史记录异常:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
