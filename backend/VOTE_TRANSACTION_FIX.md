# 投票交易哈希问题修复

## 问题描述
投票时返回交易哈希，但在 Etherscan 上查不到该交易。

示例：
```
投票成功，链上ID: 1, 交易哈希: 0x4ecca8710f0df5e66f1a880c538185717328d5c22d29b54f2afc6d271db2e61a
```

但这个交易哈希在 Sepolia Etherscan 上不存在。

## 问题原因

### 对比分析

**之前成功的操作**（创建活动、签到等）：
```go
// 1. 发送交易
txHash, err := s.sendTransaction(...)

// 2. 等待交易确认
err := s.WaitForTransaction(txHash)

// 3. 返回确认后的交易哈希
return txHash, nil
```

**投票操作**（有问题）：
```go
// 1. 发送交易
txHash, err := s.sendTransaction(...)

// 2. 直接返回，没有等待确认 ❌
return txHash, nil
```

### 根本原因
投票函数在发送交易后**没有等待交易确认**，导致：
1. 交易可能还在内存池中等待被打包
2. 交易可能因为 nonce 冲突被替换
3. 交易可能因为 gas 不足被拒绝
4. 但代码已经返回了"成功"和交易哈希

## 解决方案

### 修改前
```go
// Vote 在区块链上记录投票
func (s *BlockchainService) Vote(chainEventID, projectID, score uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"vote",
		big.NewInt(int64(chainEventID)),
		big.NewInt(int64(projectID)),
		big.NewInt(int64(score)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil  // ❌ 没有等待确认
}
```

### 修改后
```go
// Vote 在区块链上记录投票
func (s *BlockchainService) Vote(chainEventID, projectID, score uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"vote",
		big.NewInt(int64(chainEventID)),
		big.NewInt(int64(projectID)),
		big.NewInt(int64(score)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	// ✅ 等待交易确认
	if err := s.WaitForTransaction(txHash); err != nil {
		return txHash, fmt.Errorf("交易确认失败: %w (交易哈希: %s)", err, txHash)
	}

	return txHash, nil
}
```

同样修复了 `RevokeVote` 函数。

## 修复内容

### 文件：`backend/services/blockchain_service.go`

1. **Vote 函数**：添加交易确认等待
2. **RevokeVote 函数**：添加交易确认等待

### WaitForTransaction 函数说明
```go
// WaitForTransaction 等待交易确认
func (s *BlockchainService) WaitForTransaction(txHash string) error {
	ctx := context.Background()
	hash := common.HexToHash(txHash)

	// 等待交易被打包（最多等待60秒）
	for i := 0; i < 60; i++ {
		receipt, err := s.client.TransactionReceipt(ctx, hash)
		if err == nil {
			if receipt.Status == 1 {
				return nil  // 交易成功
			}
			return fmt.Errorf("交易失败")  // 交易被打包但执行失败
		}
		time.Sleep(1 * time.Second)
	}

	return fmt.Errorf("等待交易确认超时")
}
```

## 影响

### 用户体验变化
- **修改前**：投票立即返回"成功"，但交易可能失败
- **修改后**：投票需要等待 2-15 秒（取决于网络），但确保交易真正成功

### 性能影响
- 投票操作会增加 2-15 秒的等待时间
- 但确保了数据一致性和交易可靠性

## 重启服务

```bash
cd backend
# 停止当前服务
# 重新编译（已完成）
go build -o main .
# 启动服务
./main
```

## 测试

1. **重启后端服务**
2. **尝试投票**
3. **观察日志**：
   - 应该看到投票操作需要几秒钟
   - 返回的交易哈希应该能在 Etherscan 上查到
4. **验证交易**：
   ```
   https://sepolia.etherscan.io/tx/交易哈希
   ```

## 预期结果

✅ 投票操作会稍微慢一些（等待确认）
✅ 返回的交易哈希可以在 Etherscan 上查到
✅ 交易状态为 "Success"
✅ 不会再出现"假的"交易哈希

## 为什么之前的操作可以？

之前的操作（创建活动、签到等）都有等待确认的逻辑：
- `CreateEvent`：调用 `waitForTransactionAndGetEventID`
- `CheckIn`：调用 `WaitForTransaction`
- `ActivateEvent`：调用 `WaitForTransaction`

只有 `Vote` 和 `RevokeVote` 函数遗漏了这个步骤，现在已经修复。

## 总结

- ✅ 已修复投票函数
- ✅ 已修复撤销投票函数
- ✅ 代码已重新编译
- 🔄 需要重启后端服务
- 🔄 重新测试投票功能

修复后，投票交易会真正等待区块链确认，返回的交易哈希将是真实有效的。
