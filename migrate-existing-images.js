// 迁移现有Base64图片到URL
// 这个脚本需要部署后运行

const { createClient } = require('@supabase/supabase-js');

// 配置Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadBase64ToStorage(base64Data, filename) {
    try {
        // 将Base64转换为Buffer
        const base64String = base64Data.split(',')[1];
        const buffer = Buffer.from(base64String, 'base64');
        
        // 提取图片格式
        const format = base64Data.match(/data:image\/([^;]+)/)?.[1] || 'png';
        
        // 上传到Supabase Storage
        const { data, error } = await supabase.storage
            .from('images')
            .upload(`migrated/${filename}`, buffer, {
                contentType: `image/${format}`,
                upsert: true
            });
        
        if (error) {
            console.error('上传失败:', error);
            return null;
        }
        
        // 获取公开URL
        const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(`migrated/${filename}`);
        
        return urlData.publicUrl;
    } catch (error) {
        console.error('上传错误:', error);
        return null;
    }
}

async function migrateImages() {
    try {
        console.log('开始迁移现有图片...');
        
        // 获取所有有Base64图片的记录
        const { data: records, error } = await supabase
            .from('history')
            .select('id, result_image, input_images, type, prompt')
            .or('result_image.not.is.null,input_images.not.is.null');
        
        if (error) {
            console.error('查询失败:', error);
            return;
        }
        
        console.log(`找到 ${records.length} 条记录需要迁移`);
        
        for (const record of records) {
            console.log(`\n处理记录 ID: ${record.id}`);
            
            let resultImageUrl = null;
            let inputImageUrls = null;
            
            // 处理结果图片
            if (record.result_image && record.result_image.startsWith('data:image/')) {
                const filename = `result_${record.id}_${Date.now()}.png`;
                resultImageUrl = await uploadBase64ToStorage(record.result_image, filename);
                
                if (resultImageUrl) {
                    console.log(`✅ 结果图片上传成功: ${resultImageUrl}`);
                } else {
                    console.log('❌ 结果图片上传失败');
                }
            }
            
            // 处理输入图片
            if (record.input_images && Array.isArray(record.input_images)) {
                const urls = [];
                for (let i = 0; i < record.input_images.length; i++) {
                    const image = record.input_images[i];
                    if (image && image.startsWith('data:image/')) {
                        const filename = `input_${record.id}_${i}_${Date.now()}.png`;
                        const url = await uploadBase64ToStorage(image, filename);
                        
                        if (url) {
                            urls.push(url);
                            console.log(`✅ 输入图片${i}上传成功: ${url}`);
                        } else {
                            console.log(`❌ 输入图片${i}上传失败`);
                            urls.push(image); // 保留原始Base64
                        }
                    } else {
                        urls.push(image); // 保留非Base64数据
                    }
                }
                inputImageUrls = urls;
            }
            
            // 更新数据库记录
            const { error: updateError } = await supabase
                .from('history')
                .update({
                    result_image_url: resultImageUrl,
                    input_image_urls: inputImageUrls
                })
                .eq('id', record.id);
            
            if (updateError) {
                console.error(`❌ 更新记录 ${record.id} 失败:`, updateError);
            } else {
                console.log(`✅ 记录 ${record.id} 更新成功`);
            }
            
            // 添加延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n🎉 迁移完成！');
        
    } catch (error) {
        console.error('迁移失败:', error);
    }
}

// 运行迁移
migrateImages();
