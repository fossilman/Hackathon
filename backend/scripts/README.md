# 数据库脚本说明

## create_admin.go - 创建Admin用户脚本

### 功能
用于创建系统管理员用户，密码会自动使用bcrypt加密。

### 使用方法

#### 使用默认配置
```bash
cd backend
go run scripts/create_admin.go
```

默认创建的用户信息：
- 邮箱: `admin@hackathon.com`
- 密码: `admin123456`
- 姓名: `系统管理员`
- 角色: `admin`

#### 自定义用户信息
```bash
go run scripts/create_admin.go <邮箱> <密码> <姓名>
```

示例：
```bash
go run scripts/create_admin.go admin@example.com mypassword123 管理员
```

### 注意事项

1. 脚本会自动检查用户是否已存在，如果邮箱已存在则不会重复创建
2. 密码会自动使用bcrypt加密存储
3. 确保数据库配置正确（在 `config.yaml` 或环境变量中）
4. 确保数据库已创建并可以连接

### 输出示例

```
✅ Admin用户创建成功！
   邮箱: admin@hackathon.com
   密码: admin123456
   姓名: 系统管理员
   角色: admin
   ID: 1

请妥善保管密码，首次登录后建议修改密码。
```

## clear_test_data.go - 清空测试数据脚本

### 功能
用于清空数据库中的所有测试数据，但会保留管理员用户。此脚本会按依赖关系顺序删除数据，确保数据完整性。

### 使用方法

```bash
cd backend
go run scripts/clear_test_data.go
```

### 将清空的数据

脚本会按以下顺序清空数据（按依赖关系）：
1. 投票 (Votes)
2. 提交 (Submissions)
3. 签到记录 (Checkins)
4. 注册记录 (Registrations)
5. 团队成员 (TeamMembers)
6. 参赛者 (Participants)
7. 团队 (Teams)
8. 黑客松阶段 (HackathonStages)
9. 黑客松奖项 (HackathonAwards)
10. 黑客松 (Hackathons)
11. 普通用户 (Users, 但保留管理员)

### 安全确认

脚本会要求你输入 `yes` 来确认操作，以防止误操作。

### 注意事项

1. **此操作不可逆**：清空的数据无法恢复，请谨慎操作
2. **保留管理员**：所有角色为 `admin` 的用户将被保留
3. **事务保护**：脚本使用数据库事务，如果任何步骤失败，所有操作都会回滚
4. **数据库配置**：确保 `config.yaml` 中的数据库配置正确
5. **建议备份**：在生产环境使用前，建议先备份数据库

### 输出示例

```
警告: 此操作将清空所有测试数据!
将删除以下数据:
  - 所有投票 (Votes)
  - 所有提交 (Submissions)
  ...
确认继续? (yes/no): yes

开始清空数据...
✓ 已清空投票数据
✓ 已清空提交数据
...
✓ 所有测试数据已成功清空!
```

