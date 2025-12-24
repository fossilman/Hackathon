# 签到问题快速修复

## 问题
签到时报错：`Event is not active`

## 原因
链上活动未激活，状态还是 `Created`

## 解决方案（2步）

### 1. 重启后端服务

```bash
# 停止旧服务
pkill -f hackathon-backend

# 重新编译
go build -o hackathon-backend main.go

# 启动新服务
./hackathon-backend
```

### 2. 切换活动到签到阶段

```bash
# 切换到签到阶段（会自动激活链上活动）
curl -X POST http://localhost:8000/admin/hackathons/YOUR_ID/stage/checkin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

查看日志，应该显示：
```
链上活动已激活，链上ID: 1, 交易哈希: 0x...
```

### 3. 测试签到

```bash
curl -X POST http://localhost:8000/arena/hackathons/YOUR_ID/checkin \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN"
```

应该成功！

## 工作流程

```
1. 创建活动 → 链上状态: Created
2. 发布活动 → 链上状态: Created
3. 切换到签到阶段 → 链上状态: Active ✅ (自动激活)
4. 参赛者签到 → 成功 ✅
```

## 注意事项

- 必须先切换到签到阶段才能签到
- 系统会自动激活链上活动
- 激活需要 Gas 费（约 0.001 ETH）

---

详细说明: [BLOCKCHAIN_STAGE_FIX.md](BLOCKCHAIN_STAGE_FIX.md)
