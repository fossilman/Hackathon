# NFT数据库字段修复指南

## 问题描述

在记录NFT发放到数据库时，出现以下错误：
```
Error 1364 (HY000): Field 'hackathon_id' doesn't have a default value
```

## 问题原因

`NFTRecord` 模型中的字段名与数据库表字段名不匹配：
- 代码中使用：`EventID`
- 数据库期望：`hackathon_id`

由于 `NFTRecord` 模型中有外键关联到 `Hackathon` 表，GORM 会自动将字段名转换为 `hackathon_id`，但代码中使用的是 `event_id`，导致字段不匹配。

## 修复方案

### 1. 代码修改（已完成）

已将 `NFTRecord` 模型中的字段从 `EventID` 改为 `HackathonID`：

```go
type NFTRecord struct {
    ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    HackathonID     uint64    `gorm:"not null;index;column:hackathon_id" json:"hackathon_id"`  // 修改
    ParticipantID   uint64    `gorm:"not null;index" json:"participant_id"`
    TokenID         uint64    `gorm:"not null;index" json:"token_id"`
    TransactionHash string    `gorm:"size:128;not null" json:"transaction_hash"`
    MintedAt        time.Time `gorm:"not null" json:"minted_at"`
    
    Hackathon   Hackathon   `gorm:"foreignKey:HackathonID;references:ID;..." json:"hackathon,omitempty"`  // 修改
    Participant Participant `gorm:"foreignKey:ParticipantID;references:ID;..." json:"participant,omitempty"`
}
```

### 2. 数据库迁移

#### 方法一：使用自动迁移脚本（推荐）

```bash
cd backend/scripts
./run_nft_migration.sh
```

这个脚本会：
1. 提示你备份数据库
2. 删除旧的 `nft_records` 表
3. 使用新的模型定义重新创建表

#### 方法二：手动SQL迁移

如果表中已有数据且需要保留，可以使用以下SQL：

```sql
-- 如果字段名是 event_id，重命名为 hackathon_id
ALTER TABLE nft_records 
CHANGE COLUMN event_id hackathon_id BIGINT UNSIGNED NOT NULL;
```

如果表结构完全不对，可以删除并重新创建：

```sql
-- 删除旧表
DROP TABLE IF EXISTS nft_records;

-- 重新创建表
CREATE TABLE nft_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hackathon_id BIGINT UNSIGNED NOT NULL,
    participant_id BIGINT UNSIGNED NOT NULL,
    token_id BIGINT UNSIGNED NOT NULL,
    transaction_hash VARCHAR(128) NOT NULL,
    minted_at DATETIME NOT NULL,
    INDEX idx_hackathon_id (hackathon_id),
    INDEX idx_participant_id (participant_id),
    INDEX idx_token_id (token_id),
    CONSTRAINT fk_nft_hackathon 
        FOREIGN KEY (hackathon_id) 
        REFERENCES hackathons(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL,
    CONSTRAINT fk_nft_participant 
        FOREIGN KEY (participant_id) 
        REFERENCES participants(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 方法三：重启应用自动迁移

如果你的应用启动时会自动执行数据库迁移（`AutoMigrate`），只需：

```bash
# 1. 停止后端服务
# 2. 删除旧表（如果需要）
mysql -u用户名 -p数据库名 -e "DROP TABLE IF EXISTS nft_records;"

# 3. 重新启动后端服务
cd backend
./hackathon-backend
```

应用启动时会自动创建正确的表结构。

## 验证修复

修复后，可以通过以下方式验证：

### 1. 检查表结构

```sql
DESCRIBE nft_records;
```

应该看到 `hackathon_id` 字段而不是 `event_id`。

### 2. 测试NFT发放

```bash
# 调用NFT发放API
curl -X POST http://localhost:8080/api/nft/mint \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1,
    "participantId": 1,
    "participantAddr": "0x..."
  }'
```

应该能够成功发放NFT并记录到数据库。

## 注意事项

1. **备份数据**：在执行任何数据库迁移前，请务必备份数据库
2. **停止服务**：迁移期间建议停止后端服务
3. **外键约束**：确保 `hackathons` 和 `participants` 表已存在
4. **数据迁移**：如果旧表中有数据，需要手动迁移到新表

## 相关文件

- 模型定义：`backend/models/registration.go`
- NFT服务：`backend/services/nft_service.go`
- 迁移脚本：`backend/scripts/migrate_nft_table.go`
- SQL脚本：`backend/scripts/fix_nft_records_table.sql`
