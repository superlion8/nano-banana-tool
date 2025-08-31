#!/bin/bash

echo "🔍 检查并修复 JavaScript 语法错误..."

# 检查所有 HTML 和 JS 文件
for file in *.html *.js; do
    if [ -f "$file" ]; then
        echo "检查文件: $file"
        
        # 修复错误的对象展开语法
        if grep -q "user = { \.existingUserData, \.user }" "$file"; then
            echo "  ❌ 发现错误的对象展开语法，正在修复..."
            sed -i '' 's/user = { \.existingUserData, \.user };/user = { ...existingUserData, ...user };/g' "$file"
            echo "  ✅ 已修复对象展开语法"
        fi
        
        # 检查不完整的属性访问
        if grep -q "document\.querySelector.*\.$" "$file"; then
            echo "  ❌ 发现不完整的属性访问，需要手动修复"
            grep -n "document\.querySelector.*\.$" "$file"
        fi
        
        # 检查其他可能的语法错误
        if grep -q "{ \." "$file" | grep -v "{ \.\.\." ; then
            echo "  ⚠️  发现可能的语法错误："
            grep -n "{ \." "$file" | grep -v "{ \.\.\."
        fi
    fi
done

echo "🎯 语法检查完成！"
