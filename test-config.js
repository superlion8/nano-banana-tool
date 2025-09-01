// 简单的配置API测试
const express = require('express');
const app = express();

// 模拟环境变量
process.env.SUPABASE_URL = 'test-url';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

app.use(express.json());

// 导入配置API
const configHandler = require('./api/config.js');

// 创建路由
app.get('/api/config', configHandler.default || configHandler);

// 测试
const port = 3001;
app.listen(port, () => {
    console.log(`测试服务器启动在 http://localhost:${port}`);
    
    // 发送测试请求
    setTimeout(() => {
        const http = require('http');
        
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/api/config',
            method: 'GET'
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('测试结果:', JSON.parse(data));
                console.log('✅ 配置API测试成功');
                process.exit(0);
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ 测试失败:', error);
            process.exit(1);
        });
        
        req.end();
    }, 1000);
});