// 前端修复：支持未登录用户保存和查看历史记录
// 这个文件包含需要添加到 index.html 中的修复代码

// 1. 修改 saveHistoryToSupabase 函数
async function saveHistoryToSupabase(historyItem) {
    if (!config) {
        console.log('配置未加载，跳过历史记录同步');
        return false;
    }
    
    try {
        let response;
        
        if (currentUser) {
            // 已登录用户使用原有API
            response = await fetch('/api/user-history-unified', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': currentUser.id
                },
                body: JSON.stringify({
                    type: historyItem.type,
                    prompt: historyItem.prompt,
                    result_image: historyItem.resultImage,
                    input_images: historyItem.inputImages,
                    user_id: currentUser.id
                })
            });
        } else {
            // 未登录用户使用新的匿名API
            response = await fetch('/api/save-anonymous-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: historyItem.type,
                    prompt: historyItem.prompt,
                    result_image: historyItem.resultImage,
                    input_images: historyItem.inputImages
                })
            });
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('保存历史记录失败:', result.error);
            return false;
        }
        
        // 返回插入的数据
        return result.data && result.data[0] ? result.data[0] : false;
        
    } catch (error) {
        console.error('历史记录保存错误:', error);
        return false;
    }
}

// 2. 修改 loadUserHistory 函数
async function loadUserHistory() {
    if (!config) {
        console.log('配置未加载，跳过历史记录加载');
        return;
    }
    
    try {
        let response;
        
        if (currentUser) {
            // 已登录用户加载个人历史记录
            response = await fetch(`/api/user-history-unified?user_id=${currentUser.id}&simple=true`, {
                method: 'GET',
                headers: {
                    'user-id': currentUser.id
                }
            });
        } else {
            // 未登录用户加载匿名历史记录
            response = await fetch('/api/get-anonymous-history?simple=true', {
                method: 'GET'
            });
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('加载历史记录失败:', result.error);
            return;
        }
        
        if (result.data && Array.isArray(result.data)) {
            userHistory = result.data.map(item => ({
                id: item.id,
                type: item.type,
                prompt: item.prompt,
                resultImage: item.result_image,
                inputImages: item.input_images,
                createdAt: item.created_at,
                userInfo: {
                    name: item.user_name || '匿名用户',
                    email: item.user_email || '未登录',
                    avatar: item.user_avatar || null
                }
            }));
            
            console.log('历史记录加载成功，数量:', userHistory.length);
            renderHistory();
        }
        
    } catch (error) {
        console.error('加载历史记录错误:', error);
    }
}

// 3. 修改 saveUserHistory 函数
async function saveUserHistory(historyItem) {
    console.log('保存历史记录:', historyItem);
    
    // 生成唯一ID（如果还没有）
    if (!historyItem.id) {
        historyItem.id = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 设置创建时间
    if (!historyItem.createdAt) {
        historyItem.createdAt = new Date().toISOString();
    }
    
    // 添加到本地数组
    userHistory.unshift(historyItem);
    console.log('添加到userHistory后，长度变为:', userHistory.length);
    
    // 保存到localStorage（如果启用）
    saveUserHistoryToStorage();
    
    // 同时保存到后端（无论是否登录）
    if (config) {
        console.log('同步历史记录到后端...');
        try {
            const backendData = await saveHistoryToSupabase(historyItem);
            if (backendData && backendData.id) {
                // 更新本地历史记录项的ID为后端返回的真实ID
                historyItem.id = backendData.id;
                console.log('已更新本地历史记录ID为后端ID:', backendData.id);
                
                // 重新保存到localStorage，确保ID同步
                saveUserHistoryToStorage();
                
                console.log('历史记录已同步到后端');
            } else {
                console.warn('历史记录同步到后端失败，但已保存到localStorage');
            }
        } catch (error) {
            console.error('后端同步错误:', error);
        }
    }
    
    console.log('保存历史记录完成:', historyItem);
    
    // 更新显示
    renderHistory();
}

// 4. 修改页面初始化逻辑
async function initializePage() {
    console.log('=== 页面初始化开始 ===');
    
    try {
        // 加载配置
        await loadConfig();
        
        // 初始化Supabase
        await initializeSupabase();
        
        // 检查是否有保存的用户信息
        const savedUser = localStorage.getItem('nanoBananaUser');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                currentUser = user;
                console.log('从localStorage恢复用户信息:', user.id);
                
                // 更新UI显示
                updateLoginUI();
                
                // 显示历史记录主标签页
                document.getElementById('history-main-tab').style.display = 'inline-block';
                
                // 加载用户历史记录
                await loadUserHistory();
            } catch (error) {
                console.error('恢复用户信息失败:', error);
                localStorage.removeItem('nanoBananaUser');
            }
        } else {
            // 未登录用户也加载匿名历史记录
            console.log('未登录用户，加载匿名历史记录');
            await loadUserHistory();
        }
        
        console.log('=== 页面初始化完成 ===');
        
    } catch (error) {
        console.error('页面初始化失败:', error);
    }
}

// 5. 修改历史记录显示逻辑
function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (userHistory.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <p>${currentUser ? '您还没有生成过图像' : '您还没有生成过图像（未登录状态）'}</p>
                <p class="history-hint">${currentUser ? '开始生成您的第一张图像吧！' : '开始生成您的第一张图像吧！登录后可同步到云端。'}</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = userHistory.map(item => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-content">
                <div class="history-image">
                    <img src="${item.resultImage}" alt="Generated Image" loading="lazy">
                </div>
                <div class="history-details">
                    <div class="history-prompt">${item.prompt}</div>
                    <div class="history-meta">
                        <span class="history-type">${getTypeDisplayName(item.type)}</span>
                        <span class="history-time">${formatTime(item.createdAt)}</span>
                        ${item.userInfo ? `<span class="history-user">${item.userInfo.name}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="history-actions">
                <button onclick="downloadImage('${item.resultImage}', '${item.prompt}')" class="btn-download">下载</button>
                <button onclick="deleteHistoryItem('${item.id}')" class="btn-delete">删除</button>
            </div>
        </div>
    `).join('');
}

// 6. 添加类型显示名称函数
function getTypeDisplayName(type) {
    const typeMap = {
        'text-to-image': '文本生成',
        'image-edit': '图像编辑',
        'multi-image': '多图生成'
    };
    return typeMap[type] || type;
}

// 7. 添加时间格式化函数
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前';
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}
