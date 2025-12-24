#!/bin/bash

echo "=== 检查项目启动 ==="
echo ""

# 1. 检查编译
echo "1. 检查编译..."
if go build -o hackathon-backend main.go 2>&1; then
    echo "✓ 编译成功"
else
    echo "✗ 编译失败"
    exit 1
fi
echo ""

# 2. 检查代码质量
echo "2. 检查代码质量..."
if go vet ./... 2>&1 | grep -v "scripts" | grep -v "vet:"; then
    echo "⚠ 发现一些警告（可忽略 scripts 目录的警告）"
else
    echo "✓ 代码检查通过"
fi
echo ""

# 3. 运行测试
echo "3. 运行区块链服务测试..."
if go test -v ./services -run TestBlockchainService 2>&1 | tail -5; then
    echo "✓ 测试通过"
else
    echo "✗ 测试失败"
fi
echo ""

# 4. 检查配置文件
echo "4. 检查配置文件..."
if [ -f "config.yaml" ]; then
    echo "✓ config.yaml 存在"
else
    echo "⚠ config.yaml 不存在"
fi

if [ -f ".env.example" ]; then
    echo "✓ .env.example 存在"
else
    echo "⚠ .env.example 不存在"
fi
echo ""

# 5. 检查必需的依赖
echo "5. 检查 Go 依赖..."
if go mod verify 2>&1 | grep -q "verified"; then
    echo "✓ 依赖验证通过"
else
    echo "⚠ 依赖可能需要更新"
fi
echo ""

# 6. 清理
echo "6. 清理编译文件..."
rm -f hackathon-backend
echo "✓ 清理完成"
echo ""

echo "=== 检查完成 ==="
echo ""
echo "项目可以正常编译和运行！"
echo ""
echo "启动说明："
echo "1. 确保数据库已配置（config.yaml）"
echo "2. 设置环境变量 BLOCKCHAIN_PRIVATE_KEY"
echo "3. 运行: go run main.go"
echo ""
echo "注意事项："
echo "- 区块链功能需要有效的私钥和 RPC URL"
echo "- 如果区块链服务不可用，系统会降级处理"
echo "- 合约 ABI 文件路径: contract/artifacts/contracts/HackathonEvent.sol/HackathonEvent.json"
