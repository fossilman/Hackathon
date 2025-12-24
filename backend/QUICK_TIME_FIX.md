# 签到时间问题快速解决

## 问题
签到时报错：`Event has not started`

## 原因
活动开始时间设置为未来（如 2025-01-01），但现在是 2024-12-23

## 解决方案（重新创建活动）

### 1. 删除旧活动（如果需要）

```bash
curl -X DELETE http://localhost:8000/admin/hackathons/YOUR_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 创建新活动（使用当前时间）

```bash
curl -X POST http://localhost:8000/admin/hackathons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试活动",
    "description": "测试描述",
    "start_time": "2024-12-23T00:00:00Z",
    "end_time": "2024-12-30T23:59:59Z",
    "location_type": "online",
    "location_detail": "线上"
  }'
```

**关键**：`start_time` 使用当前或过去的时间！

### 3. 发布活动

```bash
curl -X POST http://localhost:8000/admin/hackathons/NEW_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 切换到签到阶段

```bash
curl -X POST http://localhost:8000/admin/hackathons/NEW_ID/stage/checkin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. 测试签到

```bash
curl -X POST http://localhost:8000/arena/hackathons/NEW_ID/checkin \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN"
```

应该成功！✅

## 时间设置建议

### 测试环境
```json
{
  "start_time": "2024-12-20T00:00:00Z",  // 几天前
  "end_time": "2024-12-31T23:59:59Z"     // 未来几天
}
```

### 生产环境
```json
{
  "start_time": "2024-12-25T09:00:00Z",  // 实际开始时间
  "end_time": "2024-12-25T18:00:00Z"     // 实际结束时间
}
```

## 注意事项

1. **链上时间无法修改**：一旦上链，时间就固定了
2. **必须重新创建**：如果时间设置错误，只能重新创建活动
3. **使用 UTC 时间**：所有时间都使用 UTC 格式

## 错误提示

现在系统会提供友好的错误信息：

```json
{
  "error": "活动尚未开始，无法签到。活动开始时间: 2025-01-01 00:00:00"
}
```

---

详细说明: [BLOCKCHAIN_TIME_ISSUE.md](BLOCKCHAIN_TIME_ISSUE.md)
