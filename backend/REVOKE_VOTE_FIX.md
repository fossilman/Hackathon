# 撤销投票功能修复

## 问题描述
撤销投票时出现错误：
```
"message": "投票撤销上链失败: 发送交易失败: 估算gas失败: execution reverted: Invalid vote index"
```

## 问题原因

### 合约中的投票存储结构
```solidity
mapping(uint256 => mapping(address => Vote[])) public votes;
// eventId => voter => Vote数组
```

每个用户在每个活动中可以有多个投票，存储在一个数组中。撤销投票需要提供该数组的索引（0, 1, 2...）。

### 之前的错误实现
```go
// ❌ 使用数据库的全局 ID 作为索引
txHash, err := blockchainService.RevokeVote(hackathon.ChainEventID, vote.ID)
```

问题：
- `vote.ID` 是数据库中的全局唯一 ID（如 1, 2, 3, 100...）
- 但合约需要的是该用户投票数组中的索引（0, 1, 2...）
- 两者完全不同，导致 "Invalid vote index" 错误

### 示例说明
假设：
- 用户 A 投了 3 票，数据库 ID 分别是：5, 8, 12
- 在合约中，这 3 票的索引是：0, 1, 2

撤销第 2 票时：
- ❌ 错误：使用 `vote.ID = 8` 作为索引
- ✅ 正确：使用 `voteIndex = 1` 作为索引

## 解决方案

### 1. 数据库模型修改
在 `Vote` 模型中添加 `ChainVoteIndex` 字段：

```go
type Vote struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID    uint64    `gorm:"index;not null" json:"hackathon_id"`
	ParticipantID  uint64    `gorm:"uniqueIndex:uk_participant_submission;not null" json:"participant_id"`
	SubmissionID   uint64    `gorm:"uniqueIndex:uk_participant_submission;not null" json:"submission_id"`
	ChainVoteIndex *uint64   `gorm:"default:null" json:"chain_vote_index,omitempty"` // ✅ 新增
	CreatedAt      time.Time `json:"created_at"`
	// ...
}
```

### 2. 投票时记录索引
```go
// 获取该用户在该活动中已有的投票数量（作为新投票的索引）
var existingVoteCount int64
database.DB.Model(&models.Vote{}).
	Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).
	Count(&existingVoteCount)

chainVoteIndex := uint64(existingVoteCount)

// 上链投票
txHash, err := blockchainService.Vote(hackathon.ChainEventID, submissionID, 10)

// 保存投票记录，包含链上索引
vote := models.Vote{
	HackathonID:    hackathonID,
	ParticipantID:  participantID,
	SubmissionID:   submissionID,
	ChainVoteIndex: &chainVoteIndex, // ✅ 记录链上索引
}
database.DB.Create(&vote)
```

### 3. 撤销时使用正确的索引
```go
// 检查是否有链上索引
if vote.ChainVoteIndex == nil {
	return errors.New("该投票未上链，无法撤销")
}

// ✅ 使用链上索引撤销
txHash, err := blockchainService.RevokeVote(hackathon.ChainEventID, *vote.ChainVoteIndex)
```

## 数据库迁移

### 执行迁移脚本
```bash
mysql -h 47.103.98.61 -u root -p hackathon_db < backend/migrations/add_chain_vote_index.sql
```

或者在 MySQL 客户端中执行：
```sql
ALTER TABLE votes ADD COLUMN chain_vote_index BIGINT UNSIGNED DEFAULT NULL COMMENT '链上投票索引';
CREATE INDEX idx_votes_chain_vote_index ON votes(chain_vote_index);
```

### 迁移说明
- 新字段 `chain_vote_index` 默认为 NULL
- 已存在的投票记录该字段为 NULL（表示未上链或旧数据）
- 新的投票会自动记录链上索引

## 重启服务

```bash
cd backend
# 停止当前服务
# 重新编译（已完成）
go build -o main .
# 启动服务
./main
```

## 测试流程

### 1. 执行数据库迁移
```bash
mysql -h 47.103.98.61 -u root -p hackathon_db < backend/migrations/add_chain_vote_index.sql
```

### 2. 重启后端服务

### 3. 测试投票
```bash
POST /api/v1/arena/hackathons/{id}/submissions/{submission_id}/vote
```

检查日志，应该看到：
```
投票成功 {submission_id}，链上ID: {event_id}, 投票索引: 0, 交易哈希: 0x...
```

### 4. 测试撤销投票
```bash
DELETE /api/v1/arena/hackathons/{id}/submissions/{submission_id}/vote
```

应该成功撤销，日志显示：
```
投票撤销成功，链上ID: {event_id}, 投票索引: 0, 交易哈希: 0x...
```

### 5. 验证交易
在 Etherscan 上查看交易：
```
https://sepolia.etherscan.io/tx/{交易哈希}
```

## 注意事项

### 旧数据处理
- 迁移前的投票记录 `chain_vote_index` 为 NULL
- 这些旧投票无法撤销（会提示"该投票未上链，无法撤销"）
- 建议清理测试数据，重新开始测试

### 清理测试数据（可选）
```sql
-- 清理所有投票记录
DELETE FROM votes;

-- 重置自增 ID
ALTER TABLE votes AUTO_INCREMENT = 1;
```

### 投票索引的计算
- 索引从 0 开始
- 每个用户在每个活动中独立计数
- 用户 A 的第 1 票：索引 0
- 用户 A 的第 2 票：索引 1
- 用户 B 的第 1 票：索引 0（独立计数）

## 完整流程示例

### 用户 A 投票流程
1. **第 1 次投票**
   - 查询已有投票数：0
   - 链上索引：0
   - 数据库记录：`{id: 1, chain_vote_index: 0}`

2. **第 2 次投票**
   - 查询已有投票数：1
   - 链上索引：1
   - 数据库记录：`{id: 2, chain_vote_index: 1}`

3. **撤销第 1 票**
   - 查询数据库：`chain_vote_index = 0`
   - 调用合约：`revokeVote(eventId, 0)`
   - 成功撤销

4. **撤销第 2 票**
   - 查询数据库：`chain_vote_index = 1`
   - 调用合约：`revokeVote(eventId, 1)`
   - 成功撤销

## 修改文件清单

- ✅ `backend/models/submission.go` - 添加 `ChainVoteIndex` 字段
- ✅ `backend/services/vote_service.go` - 修改投票和撤销逻辑
- ✅ `backend/migrations/add_chain_vote_index.sql` - 数据库迁移脚本
- ✅ 代码已编译

## 总结

- ✅ 问题原因：使用数据库 ID 而不是链上索引
- ✅ 解决方案：添加 `chain_vote_index` 字段记录链上索引
- ✅ 代码已修复并编译
- 🔄 需要执行数据库迁移
- 🔄 需要重启后端服务
- 🔄 建议清理旧测试数据

修复后，撤销投票功能将正常工作！
