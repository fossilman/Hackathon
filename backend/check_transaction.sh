#!/bin/bash

# 检查交易状态的脚本
# 用法: ./check_transaction.sh <交易哈希>

if [ -z "$1" ]; then
    echo "用法: ./check_transaction.sh <交易哈希>"
    echo "示例: ./check_transaction.sh 0xde8cb35bb94f96f2c3ec442c1485d3c20facdf04c3f4c28ea1b0283e50a25b92"
    exit 1
fi

TX_HASH=$1

echo "检查交易: $TX_HASH"
echo "网络: Sepolia"
echo ""

# 使用 cast 命令检查交易（需要安装 foundry）
if command -v cast &> /dev/null; then
    echo "=== 使用 cast 检查交易 ==="
    cast tx $TX_HASH --rpc-url https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0
    echo ""
    cast receipt $TX_HASH --rpc-url https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0
else
    echo "未安装 cast 工具，请访问 Etherscan 查看："
    echo "https://sepolia.etherscan.io/tx/$TX_HASH"
fi

echo ""
echo "也可以在 Etherscan 上查看："
echo "https://sepolia.etherscan.io/tx/$TX_HASH"
