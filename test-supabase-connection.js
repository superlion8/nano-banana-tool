// 测试 Supabase 连接的脚本
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🔍 测试 Supabase 连接...\n');

  // 1. 检查环境变量
  console.log('1. 检查环境变量:');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL 未设置');
    return;
  }
  if (!supabaseAnonKey) {
    console.error('❌ SUPABASE_ANON_KEY 未设置');
    return;
  }
  
  console.log('✅ SUPABASE_URL:', supabaseUrl);
  console.log('✅ SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 20) + '...');
  console.log('');

  // 2. 创建 Supabase 客户端
  console.log('2. 创建 Supabase 客户端:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase 客户端创建成功');
    console.log('');

    // 3. 测试 users 表访问
    console.log('3. 测试 users 表访问:');
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (usersError) {
        console.error('❌ users 表访问失败:', usersError);
        console.error('错误详情:', {
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint,
          code: usersError.code
        });
      } else {
        console.log('✅ users 表访问成功');
        console.log('返回数据:', usersData);
      }
      console.log('');

    } catch (error) {
      console.error('❌ users 表访问异常:', error);
      console.log('');
    }

    // 4. 测试 history 表访问
    console.log('4. 测试 history 表访问:');
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .select('*')
        .limit(1);

      if (historyError) {
        console.error('❌ history 表访问失败:', historyError);
        console.error('错误详情:', {
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint,
          code: historyError.code
        });
      } else {
        console.log('✅ history 表访问成功');
        console.log('返回数据:', historyData);
      }
      console.log('');

    } catch (error) {
      console.error('❌ history 表访问异常:', error);
      console.log('');
    }

    // 5. 测试用户插入
    console.log('5. 测试用户插入:');
    const testUserId = 'test_user_' + Date.now();
    const testEmail = 'test@example.com';
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .upsert({
          id: testUserId,
          email: testEmail,
          name: 'Test User',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select();

      if (insertError) {
        console.error('❌ 用户插入失败:', insertError);
        console.error('错误详情:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
      } else {
        console.log('✅ 用户插入成功');
        console.log('插入的数据:', insertData);
        
        // 清理测试数据
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', testUserId);
        
        if (deleteError) {
          console.error('⚠️ 清理测试数据失败:', deleteError);
        } else {
          console.log('✅ 测试数据清理成功');
        }
      }
      console.log('');

    } catch (error) {
      console.error('❌ 用户插入异常:', error);
      console.log('');
    }

    // 6. 测试历史记录插入
    console.log('6. 测试历史记录插入:');
    try {
      const { data: historyInsertData, error: historyInsertError } = await supabase
        .from('history')
        .insert({
          user_id: testUserId,
          type: 'test',
          prompt: 'Test prompt',
          result_image: 'test_image',
          created_at: new Date().toISOString()
        })
        .select();

      if (historyInsertError) {
        console.error('❌ 历史记录插入失败:', historyInsertError);
        console.error('错误详情:', {
          message: historyInsertError.message,
          details: historyInsertError.details,
          hint: historyInsertError.hint,
          code: historyInsertError.code
        });
      } else {
        console.log('✅ 历史记录插入成功');
        console.log('插入的数据:', historyInsertData);
        
        // 清理测试数据
        const { error: deleteError } = await supabase
          .from('history')
          .delete()
          .eq('user_id', testUserId);
        
        if (deleteError) {
          console.error('⚠️ 清理测试数据失败:', deleteError);
        } else {
          console.log('✅ 测试数据清理成功');
        }
      }
      console.log('');

    } catch (error) {
      console.error('❌ 历史记录插入异常:', error);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Supabase 客户端创建失败:', error);
    return;
  }

  console.log('🔍 Supabase 连接测试完成');
}

// 运行测试
testSupabaseConnection().catch(console.error);
