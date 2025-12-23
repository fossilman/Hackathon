# Hackathon 智能合约部署总结

## 部署信息
- **网络**: Sepolia 测试网络
- **部署时间**: 2025-12-22T09:41:38.856Z
- **部署账户**: 0x5FB4f1018f3abc1e8E15660FfcdE3f1ae59dA758

## 合约地址

### 主合约
- **HackathonPlatform**: `0x3231E959664609b55Ef0bdd483e414B54c510E74`
  - 平台主合约，管理整个 Hackathon 生态系统

### 子合约
- **HackathonEvent**: `0x413EfD5873c5bD7D985BF0934d2E00f00315c52c`
  - 活动管理合约，处理 Hackathon 活动的创建和管理

- **PrizePool**: `0x089351624799f31817faB699f7eeb18BC4101759`
  - 奖金池合约，管理活动奖金的收集和分发

- **HackathonNFT**: `0x0A4CB10f7666142055CE8D955125C05E8A6Ef5ff`
  - NFT 合约，为参赛者铸造参与证明和获奖证明 NFT

## 验证状态
所有合约已在 Sourcify 上成功验证：
- [HackathonPlatform](https://repo.sourcify.dev/contracts/full_match/11155111/0x3231E959664609b55Ef0bdd483e414B54c510E74/)
- [HackathonEvent](https://repo.sourcify.dev/contracts/full_match/11155111/0x413EfD5873c5bD7D985BF0934d2E00f00315c52c/)
- [PrizePool](https://repo.sourcify.dev/contracts/full_match/11155111/0x089351624799f31817faB699f7eeb18BC4101759/)
- [HackathonNFT](https://repo.sourcify.dev/contracts/full_match/11155111/0x0A4CB10f7666142055CE8D955125C05E8A6Ef5ff/)

## 前端集成
合约地址已保存在 `deployments.json` 文件中，前端可以直接引用这些地址进行集成。

## 下一步
1. 前端集成合约地址
2. 测试合约功能
3. 如需要，可以在 Etherscan 上手动验证合约（当前由于网络问题验证超时）