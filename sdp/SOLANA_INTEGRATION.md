# Solana 链上功能改造说明（PART1）

## 1. 概述

- **链**：Solana 本地测试链（localnet，如 `http://localhost:8899`）
- **程序**：`solana/programs/hackathon_platform`（Anchor），包含活动发布、金库、签到+NFT、投票、赞助商 Escrow

## 2. 活动发布

- **链上**：主办方发布时调用 program 的 `create_event`，创建 Event PDA + Treasury PDA + Attendance Mint，并可注入主办方奖金。
- **后端**：
  - `POST /api/v1/admin/hackathons/:id/publish`：仅更新 DB 状态为 published。
  - `PATCH /api/v1/admin/hackathons/:id/publish-chain`：保存链上数据（前端在 Solana 执行 create_event 后调用）。
    - Body: `{ "event_pda", "event_pda_hex", "treasury_pda", "attendance_mint", "publish_tx_sig" }`

## 3. 签到 + NFT

- **链上**：参赛者签到时调用 `checkin`，写入链上 Checkin 列表并铸造 1 枚出席 NFT 到参赛者 ATA。
- **后端**：
  - `POST /api/v1/arena/hackathons/:id/checkin`：可带 Body `{ "checkin_tx_sig": "..." }`，保存签到记录及链上交易签名。
- **约定**：投票、分发奖金时仅认可链上签到列表中的地址；后端提供「读链上签到列表」接口。

## 4. 投票

- **链上**：仅链上已签到的钱包可调用 `vote`，投票数据上链。
- **后端**：
  - 投票逻辑仍可写 DB；结果/分发时需结合链上签到列表（见下）。
  - `GET /api/v1/arena/hackathons/:id/chain-checkins`：返回该活动链上签到钱包列表（hex），供投票/分发校验使用。

## 5. 赞助商

- **链上**：赞助商申请时调用 `create_sponsor_escrow` 锁仓；审核通过 `approve_sponsor_escrow` 转主办方，驳回 `reject_sponsor_escrow` 原路退回。
- **后端**：
  - 创建申请时设定默认审核截止时间（如 7 天）。
  - 申请 Body 可带 `sponsor_wallet`、`amount_lamports`。
  - `PATCH /api/v1/admin/sponsor/applications/:id/chain`：保存链上数据（创建 escrow 后调用）。
    - Body: `{ "escrow_pda", "apply_tx_sig" }`

## 6. 活动整体流程（金库）

- 活动发布时创建金库（Treasury PDA），主办方 + 指定赞助商资金注入金库。
- 活动过程中：活动上链、签到上链、NFT、投票及 gas 均从金库扣除。
- 活动结束后：按投票结果从金库分发奖金，剩余按比例退回主办方和赞助商；分发逻辑在活动创建时已固定，仅从链上投票数据得出名次后按序分发。

## 7. 环境与配置

- **后端**：`config.yaml` 或环境变量 `SOLANA_RPC_URL`、`SOLANA_PROGRAM_ID`（见 `config.yaml.example`）。
- **程序**：本地构建与部署见 `solana/README.md`（需 Anchor + 本地验证器）。

## 8. 前端集成（待实现）

- 连接 Solana 钱包（如 Phantom），使用 `@solana/web3.js` 和（可选）`@solana/wallet-adapter-react`。
- 发布活动：在调用 `PATCH .../publish-chain` 前，由主办方钱包签名并发送 `create_event` 交易，取得 `event_pda`、`treasury_pda`、`attendance_mint` 及 `publish_tx_sig`。
- 签到：参赛者钱包签名并发送 `checkin` 交易，再将 `checkin_tx_sig` 通过 `POST .../checkin` 传给后端。
- 投票：参赛者钱包签名并发送 `vote` 交易；后端结果/分发时可通过 `GET .../chain-checkins` 读取链上签到列表做校验。
- 赞助申请：赞助商钱包签名并发送 `create_sponsor_escrow`，再将 `escrow_pda`、`apply_tx_sig` 通过 `PATCH .../applications/:id/chain` 传给后端；审核通过/驳回由主办方或管理员在链上执行 approve/reject 后更新 DB。
