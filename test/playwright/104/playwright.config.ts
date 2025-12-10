import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 测试配置
 * 根据 PRD104 需求文档生成
 * 后端服务端口: 8000
 * 前端服务端口: 3001
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'echo "请确保后端服务运行在 http://localhost:8000，前端服务运行在 http://localhost:3001"',
    port: 3001,
    reuseExistingServer: true,
  },
})

