import { test, expect } from '@playwright/test';
import { login, logout, getUserByRole } from './setup/helpers';
import { testUsers } from './setup/test-data';

/**
 * 用户认证模块测试
 * 根据 PRD103 4.1 用户认证模块
 */
test.describe('用户认证模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('所有角色都可以登录', async ({ page }) => {
    for (const user of testUsers) {
      await login(page, user);
      // 验证登录成功（不在登录页）
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
      
      // 登出
      await logout(page);
      // 验证已登出（在登录页）
      await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
      
      // 等待一下，确保状态稳定
      await page.waitForTimeout(500);
    }
  });

  test('登录后根据角色跳转', async ({ page }) => {
    // 测试 sponsor 跳转到 profile
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.waitForURL(/.*\/profile/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);

    // 测试 admin 跳转到 dashboard
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);

    // 测试 organizer 跳转到 dashboard
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('所有角色都可以登出', async ({ page }) => {
    for (const user of testUsers) {
      await login(page, user);
      await logout(page);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test('未登录用户访问受保护页面会重定向到登录页', async ({ page }) => {
    // 清除认证信息
    await page.evaluate(() => {
      localStorage.clear();
    });

    const protectedPages = ['/dashboard', '/users', '/hackathons', '/profile'];
    for (const path of protectedPages) {
      await page.goto(path);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test('登录失败显示错误提示', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    // 等待页面标题出现
    await page.waitForSelector('text=Hackathon Admin Platform', { timeout: 15000 });
    // 等待登录表单出现
    await page.waitForSelector('input', { timeout: 10000 });
    
    const emailInput = page.locator('input[name="email"]').or(page.locator('input[type="email"]')).or(page.locator('input').first());
    await emailInput.fill('wrong@test.com');
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('wrongpassword');
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // 等待错误提示出现（antd message 会在页面顶部显示）
    await page.waitForSelector('.ant-message-error', { timeout: 5000 });
    // 验证仍在登录页
    await page.waitForTimeout(1000); // 等待一下确保没有跳转
    await expect(page).toHaveURL(/.*\/login/);
  });
});

