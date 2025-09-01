// Supabase 诊断脚本
// 用于调试历史记录加载问题

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnoseSupabase() {
  console.log('🔍 开始 Supabase 诊断...\n');

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

  // 2. 测试 Supabase 连接
  console.log('2. 测试 Supabase 连接:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase 客户端创建成功');
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('history')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ 数据库连接测试失败:', error);
      return;
    }
    
    console.log('✅ 数据库连接测试成功');
    console.log('');

  } catch (error) {
    console.error('❌ Supabase 客户端创建失败:', error);
    return;
  }

  // 3. 检查数据库表结构
  console.log('3. 检查数据库表结构:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 检查 history 表是否存在
    const { data: tableInfo, error: tableError } = await supabase
      .from('history')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('❌ history 表访问失败:', tableError);
      console.log('💡 可能的原因:');
      console.log('   - history 表不存在');
      console.log('   - 权限不足');
      console.log('   - RLS (Row Level Security) 策略问题');
      return;
    }
    
    console.log('✅ history 表存在且可访问');
    console.log('');

  } catch (error) {
    console.error('❌ 表结构检查失败:', error);
    return;
  }

  // 4. 测试用户ID格式
  console.log('4. 测试用户ID格式:');
  const testUserId = 'google_YmlsbGM4MTI4QGdtYWlsLmNvbQ'; // 从错误日志中的用户ID
  console.log('测试用户ID:', testUserId);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 尝试查询该用户的历史记录
    const { data: historyData, error: historyError } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', testUserId)
      .limit(5);
    
    if (historyError) {
      console.error('❌ 查询失败:', historyError);
      console.log('💡 可能的问题:');
      console.log('   - 用户ID格式不正确');
      console.log('   - 数据库字段类型不匹配');
      console.log('   - RLS 策略阻止访问');
    } else {
      console.log('✅ 查询成功');
      console.log('返回记录数:', historyData?.length || 0);
      if (historyData && historyData.length > 0) {
        console.log('第一条记录示例:', {
          id: historyData[0].id,
          user_id: historyData[0].user_id,
          type: historyData[0].type,
          created_at: historyData[0].created_at
        });
      }
    }
    console.log('');

  } catch (error) {
    console.error('❌ 用户ID测试失败:', error);
  }

  // 5. 检查 RLS 策略
  console.log('5. RLS 策略建议:');
  console.log('💡 如果遇到权限问题，请检查以下 RLS 策略:');
  console.log('');
  console.log('-- 启用 RLS');
  console.log('ALTER TABLE history ENABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('-- 允许用户查看自己的历史记录');
  console.log('CREATE POLICY "Users can view own history" ON history');
  console.log('  FOR SELECT USING (auth.uid()::text = user_id);');
  console.log('');
  console.log('-- 允许用户插入自己的历史记录');
  console.log('CREATE POLICY "Users can insert own history" ON history');
  console.log('  FOR INSERT WITH CHECK (auth.uid()::text = user_id);');
  console.log('');
  console.log('-- 允许用户删除自己的历史记录');
  console.log('CREATE POLICY "Users can delete own history" ON history');
  console.log('  FOR DELETE USING (auth.uid()::text = user_id);');
  console.log('');

  // 6. 测试修复后的查询
  console.log('6. 测试修复后的查询:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 使用修复后的查询方式（添加限制和错误处理）
    const { data: fixedData, error: fixedError } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (fixedError) {
      console.error('❌ 修复后查询仍然失败:', fixedError);
    } else {
      console.log('✅ 修复后查询成功');
      console.log('返回记录数:', fixedData?.length || 0);
    }
    console.log('');

  } catch (error) {
    console.error('❌ 修复后查询测试失败:', error);
  }

  console.log('🔍 诊断完成');
}

// 运行诊断
diagnoseSupabase().catch(console.error);
