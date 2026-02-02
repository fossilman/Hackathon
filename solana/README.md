# Hackathon Platform - Solana Programs

本地测试链 (Localnet) 上的 Solana 程序，使用 Anchor 框架。

## 功能

- **活动发布 (create_event)**：主办方发布活动时创建链上 Event + Treasury，并可选注入主办方奖金
- **金库 (treasury)**：活动金库 PDA，接收主办方和赞助商资金；活动期间所有上链/签到/NFT/投票/gas 从此扣除；结束后按投票结果分发，剩余按比例退回主办方和赞助商
- **签到 (checkin)**：参赛者签到，写入链上 Checkin 列表并铸造 1 枚出席 NFT；投票与奖金分发仅允许从链上签到列表中的地址参与
- **投票 (vote)**：仅链上已签到的钱包可投票，投票数据上链
- **赞助商 (sponsor_escrow)**：赞助申请时创建 Escrow；审核通过将金额转主办方，审核失败原路退回

## 环境

- Solana CLI + Anchor (见 [Anchor 安装](https://www.anchor-lang.com/docs/installation))
- 本地验证器：`solana-test-validator` 或已有 `test-ledger`

## 构建与部署

**方式一：Anchor（若本机用 Docker 会失败，请用方式二）**

```bash
# 首次构建会拉取依赖并编译，约 3–10 分钟；想看进度可加 -v
anchor build
```

**方式二：不用 Docker，直接用本地 Solana 工具链**

若报错 `Docker build failed` 或不想用 Docker，在 `solana` 目录下执行：

```bash
# 需已安装：rustup、solana-cli（含 cargo-build-sbf）
cd solana
rm -f Cargo.lock   # 首次或 patch 变更后建议删锁文件再编
cargo build-sbf -p hackathon_platform
```

产物在 `target/deploy/hackathon_platform.so`。若仍报 `constant_time_eq`/edition2024，当前已用 Anchor 0.30.1 规避；IDL 若需要可之后用 `anchor idl parse` 等单独生成。

**部署**

```bash
solana config set --url localhost
# 先启动本地验证器：solana-test-validator
anchor deploy --provider.cluster localnet
```

## 程序 ID

Localnet 默认使用 `Anchor.toml` 中配置的 program id；部署后可用 `anchor keys list` 查看。

## 与后端/前端的集成

- 后端：存储 `event_pda`、`treasury_pda`、`escrow_pda` 等；调用 RPC 读取链上签到列表、投票数据；验证交易签名
- 前端：连接 Solana 钱包 (如 Phantom)，构造并发送 create_event / checkin / vote / create_sponsor_escrow 等交易
