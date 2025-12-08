#!/bin/bash

# 调试API脚本

BASE_URL="http://localhost:8080"

echo "=== 1. 登录获取Token ==="
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hackathon.com","password":"admin123456"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
echo "Token: ${TOKEN:0:50}..."

echo -e "\n=== 2. 测试创建用户 ==="
curl -X POST "$BASE_URL/api/v1/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试主办方",
    "email": "organizer@test.com",
    "password": "organizer123",
    "role": "organizer",
    "phone": "13800138000"
  }' | python3 -m json.tool

echo -e "\n=== 3. 测试创建活动 ==="
curl -X POST "$BASE_URL/api/v1/admin/hackathons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024春季Hackathon测试",
    "description": "这是一个测试活动",
    "start_time": "2024-03-01T09:00:00+08:00",
    "end_time": "2024-03-03T18:00:00+08:00",
    "location_type": "online",
    "max_team_size": 3,
    "awards": [
      {
        "name": "一等奖",
        "prize": "10000元",
        "quantity": 1,
        "rank": 1
      }
    ],
    "stages": [
      {
        "stage": "registration",
        "start_time": "2024-02-20T00:00:00+08:00",
        "end_time": "2024-02-28T23:59:59+08:00"
      }
    ]
  }' | python3 -m json.tool

echo -e "\n=== 4. 测试连接钱包 ==="
curl -X POST "$BASE_URL/api/v1/arena/auth/connect" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }' | python3 -m json.tool

