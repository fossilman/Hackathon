#!/bin/bash

# NFT表迁移脚本
# 用于修复 nft_records 表的 hackathon_id 字段问题

echo "=========================================="
echo "NFT Records 表迁移工具"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "config.yaml" ]; then
    echo "错误: 请在 backend 目录下运行此脚本"
    exit 1
fi

echo "1. 备份当前数据库（建议）"
echo "   请手动执行: mysqldump -u用户名 -p 数据库名 > backup.sql"
echo ""

read -p "是否已完成备份？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先备份数据库后再运行此脚本"
    exit 1
fi

echo ""
echo "2. 运行迁移脚本..."
cd scripts
go run migrate_nft_table.go

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ 迁移完成！"
    echo "=========================================="
    echo ""
    echo "现在可以重新启动后端服务："
    echo "  cd .."
    echo "  ./hackathon-backend"
else
    echo ""
    echo "=========================================="
    echo "✗ 迁移失败"
    echo "=========================================="
    echo "请检查错误信息并修复问题"
    exit 1
fi
