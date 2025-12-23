# 区块链阶段状态修复说明

## 问题描述

签到时报错：
```
"message": "签到信息上链失败: 发送交易失败: 估算gas失败: execution reverted: Event is not active"
```

## 问题原因

智能合约的签到函数要求活动状态必须是 `Active`：

```solidity
function checkIn(uint256 _eventId) external {
    Event storage eventInfo = events[_eventId];
    require(eventInfo.status == EventStatus.Active, "Event is not active");
    // ...
}
```

但我们创建活动后，链上状态是 `Created`，需要调用 `activateEvent` 激活后才能签到。

## 合约状态流转

```
Created → Active → Ended
   ↓        ↓        ↓
 创建     激活      结束
```

- **Created**: 活动创建后的初始状态
- **Active**: 活动激活后，可以签到、投票
- **Ended**: 活动结束

## 解决方案

### 1. 添加激活和结束方法

在 `blockchain_service.go` 中添加：

```go
// ActivateEvent 激活活动
func (s *BlockchainService) ActivateEvent(chainEventID uint64) (string, error)

// EndEvent 结束活动
func (s *BlockchainService) EndEvent(chainEventID uint64) (string, error)
```

### 2. 自动激活活动

修改 `SwitchStage` 方法，在切换到签到阶段时自动激活链上活动：

```go
// 如果切换到签到阶段，需要先激活链上活动
if stage == "checkin" && hackathon.ChainEventID > 0 {
    blockchainService.ActivateEvent(hackathon.ChainEventID)
}
```

### 3. 自动结束活动

在切换到结果阶段时自动结束链上活动：

```go
// 如果切换到结果阶段，需要结束链上活动
if stage == "results" && hackathon.ChainEventID > 0 {
    blockchainService.EndEvent(hackathon.ChainEventID)
}
```

## 使用流程

### 1. 创建活动

```bash
POST /admin/hackathons
```

- 数据库状态: `preparation`
- 链上状态: `Created`

### 2. 发布活动

```bash
POST /admin/hackathons/:id/publish
```

- 数据库状态: `published`
- 链上状态: `Created`（不变）

### 3. 切换到签到阶段

```bash
POST /admin/hackathons/:id/stage/checkin
```

- 数据库状态: `checkin`
- 链上状态: `Active` ✅ **自动激活**

日志输出：
```
链上活动已激活，链上ID: 1, 交易哈希: 0x...
```

### 4. 参赛者签到

```bash
POST /arena/hackathons/:id/checkin
```

现在可以正常签到了！

### 5. 切换到结果阶段

```bash
POST /admin/hackathons/:id/stage/results
```

- 数据库状态: `results`
- 链上状态: `Ended` ✅ **自动结束**

日志输出：
```
链上活动已结束，链上ID: 1, 交易哈希: 0x...
```

## 阶段映射关系

| 数据库状态 | 链上状态 | 说明 |
|-----------|---------|------|
| preparation | - | 未上链 |
| published | Created | 已上链，未激活 |
| registration | Created | 报名阶段 |
| **checkin** | **Active** | 签到阶段，自动激活 |
| team_formation | Active | 组队阶段 |
| submission | Active | 提交阶段 |
| voting | Active | 投票阶段 |
| **results** | **Ended** | 结果阶段，自动结束 |

## 测试步骤

### 1. 创建活动

```bash
curl -X POST http://localhost:8000/admin/hackathons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试活动",
    "description": "测试描述",
    "start_time": "2025-01-01T00:00:00Z",
    "end_time": "2025-01-10T23:59:59Z",
    "location_type": "online"
  }'
```

### 2. 发布活动

```bash
curl -X POST http://localhost:8000/admin/hackathons/1/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 切换到签到阶段

```bash
curl -X POST http://localhost:8000/admin/hackathons/1/stage/checkin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

查看日志，应该显示：
```
链上活动已激活，链上ID: 1, 交易哈希: 0x...
```

### 4. 参赛者签到

```bash
curl -X POST http://localhost:8000/arena/hackathons/1/checkin \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN"
```

应该成功签到！

## 错误处理

### 如果激活失败

系统会记录错误日志，但不影响数据库状态切换：

```
链上活动激活失败: execution reverted: ...
```

此时可以：
1. 检查账户余额（Gas 费）
2. 检查活动状态
3. 手动重试激活

### 如果已经激活

重复激活会失败，但不影响使用：

```
链上活动激活失败: execution reverted: Event already active or ended
```

这是正常的，可以忽略。

## 手动激活（如果需要）

如果自动激活失败，可以手动调用：

```go
blockchainService.ActivateEvent(chainEventID)
```

或者通过智能合约直接调用：

```javascript
await hackathonEvent.activateEvent(eventId);
```

## 注意事项

1. **只有主办方可以激活活动**：合约会验证 `msg.sender == organizer`
2. **只能激活 Created 状态的活动**：已激活或已结束的活动不能再次激活
3. **激活需要 Gas 费**：确保账户有足够的 ETH
4. **激活是必需的**：不激活就无法签到和投票

## 总结

修复后的流程：
- ✅ 创建活动 → 链上状态 `Created`
- ✅ 切换到签到阶段 → 自动激活 → 链上状态 `Active`
- ✅ 参赛者可以正常签到
- ✅ 切换到结果阶段 → 自动结束 → 链上状态 `Ended`

---

**修复时间**: 2024-12-23  
**修复人员**: Kiro AI Assistant  
**状态**: ✅ 已修复并测试通过
