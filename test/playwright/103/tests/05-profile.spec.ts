import { test, expect } from '@playwright/test';
import { login, logout, getUserByRole } from './setup/helpers';

/**
 * 个人中心模块测试
 * 根据 PRD103 4.1 用户认证模块 - 个人信息相关
 */
test.describe('个人中心模块', () => {
  test('所有角色都可以访问个人中心', async ({ page }) => {
    for (const role of ['admin', 'organizer', 'sponsor'] as const) {
      const user = getUserByRole(role);
      await login(page, user);
      await page.goto('/profile');
      await expect(page).toHaveURL(/.*\/profile/);
      await page.waitForLoadState('networkidle');
      await logout(page);
    }
  });

  test('所有角色都可以查看个人信息', async ({ page }) => {
    for (const role of ['admin', 'organizer', 'sponsor'] as const) {
      const user = getUserByRole(role);
      await login(page, user);
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // 验证页面包含用户信息
      const hasUserInfo = await page.locator('text=' + user.name).count() > 0 ||
                         await page.locator('text=' + user.email).count() > 0;
      expect(hasUserInfo).toBeTruthy();
      
      await logout(page);
    }
  });
});

