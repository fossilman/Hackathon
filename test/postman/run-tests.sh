#!/bin/bash

# Hackathon API 测试脚本
# 使用 Newman (Postman CLI) 运行测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
COLLECTION_FILE="hackathon-api-tests.json"
REPORT_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORT_DIR}/test-report-${TIMESTAMP}.html"
JSON_REPORT="${REPORT_DIR}/test-report-${TIMESTAMP}.json"

# 检查 newman 是否安装
if ! command -v newman &> /dev/null; then
    echo -e "${RED}错误: newman 未安装${NC}"
    echo "请运行: npm install -g newman newman-reporter-html"
    exit 1
fi

# 创建报告目录
mkdir -p "${REPORT_DIR}"

# 检查服务器是否运行
echo -e "${YELLOW}检查服务器状态...${NC}"
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${RED}错误: 服务器未运行在 http://localhost:8080${NC}"
    echo "请先启动后端服务器: cd backend && go run main.go"
    exit 1
fi

echo -e "${GREEN}服务器运行正常${NC}"

# 运行测试
echo -e "${YELLOW}开始运行测试...${NC}"
newman run "${COLLECTION_FILE}" \
    --reporters html,json,cli \
    --reporter-html-export "${REPORT_FILE}" \
    --reporter-json-export "${JSON_REPORT}" \
    --timeout-request 10000 \
    --delay-request 500

# 检查测试结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过${NC}"
    echo -e "测试报告: ${REPORT_FILE}"
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    echo -e "测试报告: ${REPORT_FILE}"
    exit 1
fi

