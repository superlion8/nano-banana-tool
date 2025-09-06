// 测试图片上传功能
const fs = require('fs');
const path = require('path');

// 模拟一个小的Base64图片用于测试
const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testImageUpload() {
    try {
        console.log('测试图片上传功能...');
        
        // 测试上传API
        const uploadResponse = await fetch('http://localhost:3000/api/upload-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                base64Data: testBase64Image,
                filename: 'test_image.png'
            })
        });
        
        const uploadResult = await uploadResponse.json();
        console.log('上传结果:', uploadResult);
        
        if (uploadResponse.ok) {
            console.log('✅ 图片上传成功！');
            console.log('图片URL:', uploadResult.url);
        } else {
            console.log('❌ 图片上传失败:', uploadResult.message);
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

async function testSaveHistory() {
    try {
        console.log('测试保存历史记录功能...');
        
        const saveResponse = await fetch('http://localhost:3000/api/save-history-with-urls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'text-to-image',
                prompt: '测试图片',
                result_image: testBase64Image,
                input_images: [],
                user_id: null
            })
        });
        
        const saveResult = await saveResponse.json();
        console.log('保存结果:', saveResult);
        
        if (saveResponse.ok) {
            console.log('✅ 历史记录保存成功！');
            console.log('结果图片URL:', saveResult.urls?.result_image_url);
        } else {
            console.log('❌ 历史记录保存失败:', saveResult.message);
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

// 运行测试
async function runTests() {
    console.log('开始测试图片URL功能...\n');
    
    await testImageUpload();
    console.log('\n' + '='.repeat(50) + '\n');
    await testSaveHistory();
    
    console.log('\n测试完成！');
}

runTests();
