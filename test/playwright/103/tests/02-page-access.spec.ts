import { test, expect } from '@playwright/test';
import { login, logout, getUserByRole, checkPageAccessible } from './setup/helpers';

/**
 * 页面访问权限测试
 * 根据 PRD103 3.1 页面列表及访问权限
 */
test.describe('页面访问权限', () => {
  test('登录页面 - 所有角色都可以访问', async ({ page }) => {
    for (const role of ['admin', 'organizer', 'sponsor'] as const) {
      const user = getUserByRole(role);
      await login(page, user);
      await logout(page);
      await page.goto('/login');
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test('仪表盘 - Admin和主办方可访问，赞助商不可访问', async ({ page }) => {
    // Admin 可以访问
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await logout(page);

    // 主办方 可以访问
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await logout(page);

    // 赞助商 不能访问（应重定向）
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/dashboard');
    // 应该被重定向到 profile
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });

  test('人员管理页面 - 仅Admin可访问', async ({ page }) => {
    // Admin 可以访问
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/users');
    await expect(page).toHaveURL(/.*\/users/);
    await logout(page);

    // 主办方 不能访问
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/users');
    // 应该被重定向
    await expect(page).not.toHaveURL(/.*\/users/);
    await logout(page);

    // 赞助商 不能访问
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/users');
    // 应该被重定向到 profile
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });

  test('活动列表页面 - Admin和主办方可访问，赞助商不可访问', async ({ page }) => {
    // Admin 可以访问
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/hackathons');
    await expect(page).toHaveURL(/.*\/hackathons/);
    await logout(page);

    // 主办方 可以访问
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/hackathons');
    await expect(page).toHaveURL(/.*\/hackathons/);
    await logout(page);

    // 赞助商 不能访问
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/hackathons');
    // 应该被重定向
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });

  test('活动创建页面 - 仅主办方可访问', async ({ page }) => {
    // Admin 不能访问
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/hackathons/create');
    // 应该被重定向
    await expect(page).not.toHaveURL(/.*\/hackathons\/create/);
    await logout(page);

    // 主办方 可以访问
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/hackathons/create');
    await expect(page).toHaveURL(/.*\/hackathons\/create/);
    await logout(page);

    // 赞助商 不能访问
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/hackathons/create');
    // 应该被重定向
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });

  test('个人中心页面 - 所有角色都可以访问', async ({ page }) => {
    for (const role of ['admin', 'organizer', 'sponsor'] as const) {
      const user = getUserByRole(role);
      await login(page, user);
      await page.goto('/profile');
      await expect(page).toHaveURL(/.*\/profile/);
      await logout(page);
    }
  });
});

