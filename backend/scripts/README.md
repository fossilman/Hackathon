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

