import { defineConfig, devices } from '@playwright/test';

/**
 * 根据 PRD103 权限管理模块的测试配置
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // 增加测试超时时间到60秒
  reporter: [
    ['html', { outputFolder: './reports/html' }],
    ['json', { outputFile: './reports/results.json' }],
    ['junit', { outputFile: './reports/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
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

  webServer: [
    {
      command: 'cd ../../../backend && SERVER_PORT=8000 go run main.go',
      url: 'http://localhost:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
    {
      command: 'cd ../../../frontend/admin && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});

