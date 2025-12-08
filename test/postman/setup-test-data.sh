#!/bin/bash

# 设置测试数据脚本
# 创建必要的测试账号和数据

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}设置测试数据...${NC}"

# 进入backend目录
cd "$(dirname "$0")/../../backend" || exit 1

# 创建admin账号
echo -e "${GREEN}创建admin账号...${NC}"
go run scripts/create_admin.go admin@hackathon.com admin123456 "系统管理员"

# 创建organizer账号（如果需要）
echo -e "${GREEN}创建organizer账号...${NC}"
go run scripts/create_admin.go organizer@test.com organizer123 "测试主办方" organizer

echo -e "${GREEN}✓ 测试数据设置完成${NC}"

