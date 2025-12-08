import { test, expect } from '@playwright/test';
import { login, logout, getUserByRole } from './setup/helpers';

/**
 * 活动管理模块测试
 * 根据 PRD103 4.3 活动管理模块
 */
test.describe('活动管理模块', () => {
  test('Admin可以查看活动列表', async ({ page }) => {
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/hackathons');
    await expect(page).toHaveURL(/.*\/hackathons/);
    await page.waitForLoadState('networkidle');
    await logout(page);
  });

  test('主办方可以查看活动列表', async ({ page }) => {
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/hackathons');
    await expect(page).toHaveURL(/.*\/hackathons/);
    await page.waitForLoadState('networkidle');
    await logout(page);
  });

  test('赞助商不能查看活动列表', async ({ page }) => {
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/hackathons');
    // 应该被重定向
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });

  test('Admin不能创建活动', async ({ page }) => {
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/hackathons/create');
    // 应该被重定向
    await expect(page).not.toHaveURL(/.*\/hackathons\/create/);
    await logout(page);
  });

  test('主办方可以创建活动', async ({ page }) => {
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/hackathons/create');
    await expect(page).toHaveURL(/.*\/hackathons\/create/);
    await page.waitForLoadState('networkidle');
    await logout(page);
  });

  test('赞助商不能创建活动', async ({ page }) => {
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/hackathons/create');
    // 应该被重定向
    await expect(page).toHaveURL(/.*\/profile/);
    await logout(page);
  });
});

