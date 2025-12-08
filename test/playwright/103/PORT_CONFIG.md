# 端口配置说明

## 统一端口配置

所有服务端口已统一配置为：

- **前端服务**: `3000`
- **后端服务**: `8000`

## 配置文件位置

### 后端配置
- `backend/config.yaml` - 实际配置文件（端口：8000）
- `backend/config.yaml.example` - 配置示例文件（端口：8000）
- `backend/config/config.go` - 默认配置值（端口：8000）

### 前端配置
- `frontend/admin/vite.config.ts` - Vite配置，代理指向 `http://localhost:8000`

### 测试配置
- `test/playwright/103/playwright.config.ts` - Playwright配置，后端健康检查 `http://localhost:8000/health`

## 注意事项

1. 如果修改了端口配置，需要重启相应的服务
2. 后端端口可以通过 `config.yaml` 或环境变量 `SERVER_PORT` 配置
3. 前端代理配置在 `vite.config.ts` 中
4. 测试配置会自动启动服务，使用 `reuseExistingServer` 选项可以复用已运行的服务

