#!/bin/bash

# 创建测试用户脚本
# 根据 PRD103 需求创建测试用户

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "创建测试用户..."

# 创建 Admin
go run scripts/create_admin.go admin@test.com Admin123456 测试管理员 admin

# 创建主办方1
go run scripts/create_admin.go organizer1@test.com Organizer123456 测试主办方1 organizer

# 创建主办方2
go run scripts/create_admin.go organizer2@test.com Organizer123456 测试主办方2 organizer

# 创建赞助商
go run scripts/create_admin.go sponsor@test.com Sponsor123456 测试赞助商 sponsor

echo "✅ 测试用户创建完成！"

