import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * 参考文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* 测试超时时间 */
  timeout: 30 * 1000,
  expect: {
    /* 断言超时时间 */
    timeout: 5000
  },
  /* 并行运行测试 */
  fullyParallel: true,
  /* 测试失败时是否继续运行其他测试 */
  forbidOnly: !!process.env.CI,
  /* CI 环境下重试 */
  retries: process.env.CI ? 2 : 0,
  /* 并行 worker 数量 */
  workers: process.env.CI ? 1 : undefined,
  /* 报告配置 */
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['list']
  ],
  /* 共享配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3000',
    /* 收集追踪信息 */
    trace: 'on-first-retry',
    /* 截图配置 */
    screenshot: 'only-on-failure',
    /* 视频配置 */
    video: 'retain-on-failure',
  },

  /* 配置测试项目 */
  projects: [
    {
      name: 'admin-platform',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'arena-platform',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
    },
  ],

  /* 运行本地开发服务器（可选，如果服务已运行则跳过） */
  webServer: process.env.SKIP_SERVER ? undefined : [
    {
      command: 'cd ../../backend && go run main.go',
      url: 'http://localhost:8080',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../../frontend/admin && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../../frontend/arena && npm run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});

