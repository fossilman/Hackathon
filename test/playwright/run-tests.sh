#!/bin/bash

# Playwright 测试运行脚本

set -e

echo "=========================================="
echo "开始运行 Playwright 测试"
echo "=========================================="

# 创建报告目录
mkdir -p reports/html

# 运行测试
echo "运行测试..."
SKIP_SERVER=1 npx playwright test --reporter=list,html,json

echo ""
echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo "查看 HTML 报告: open reports/html/index.html"
echo "查看 JSON 报告: cat reports/test-results.json"

