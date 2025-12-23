# 快速修复指南

## 问题

创建活动时交易哈希是假的，因为链上ID和数据库ID不一致。

## 解决方案（3步）

### 1. 执行数据库迁移

```bash
# 连接到数据库
mysql -h 47.103.98.61 -u root -p hackathon_db

# 执行迁移脚本
source migrations/add_blockchain_fields.sql;

# 或者直接执行SQL
ALTER TABLE hackathons ADD COLUMN chain_event_id BIGINT UNSIGNED DEFAULT 0;
ALTER TABLE hackathons ADD COLUMN tx_hash VARCHAR(66) DEFAULT NULL;
ALTER TABLE hackathons ADD INDEX idx_chain_event_id (chain_event_id);
```

### 2. 重启后端服务

```bash
# 停止旧服务
pkill -f hackathon-backend

# 重新编译
go build -o hackathon-backend main.go

# 启动新服务
./hackathon-backend
```

### 3. 测试验证

```bash
# 创建新活动
curl -X POST http://localhost:8000/admin/hackathons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试活动",
    "description": "测试描述",
    "start_time": "2025-12-25T00:00:00Z",
    "end_time": "2025-12-30T23:59:59Z",
    "location_type": "online",
    "location_detail": "线上"
  }'
```

查看日志，应该显示：
```
活动创建成功，数据库ID: 30, 链上ID: 2, 交易哈希: 0x...
```

## 验证链上数据

1. 复制交易哈希
2. 访问 https://sepolia.etherscan.io/tx/0x你的交易哈希
3. 查看事件日志中的 `EventCreated` 事件
4. 确认 eventId 与数据库中的 `chain_event_id` 一致

## 已存在的活动

对于之前创建的活动（`chain_event_id = 0`），系统会自动跳过区块链操作，只操作数据库。

## 完成！

现在所有新创建的活动都会：
- ✅ 正确上链
- ✅ 保存真实的链上ID
- ✅ 保存真实的交易哈希
- ✅ 可以通过链上ID查询和验证

---

详细说明请查看: [BLOCKCHAIN_FIX.md](BLOCKCHAIN_FIX.md)
