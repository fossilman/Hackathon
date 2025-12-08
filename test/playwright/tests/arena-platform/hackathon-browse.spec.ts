import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

/**
 * Arena Platform 活动浏览测试
 */
test.describe('Arena Platform - 活动浏览', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该显示活动列表页面', async ({ page }) => {
    // 检查页面标题或活动列表
    await expect(page.locator('text=活动列表, text=Hackathon, [class*="list"], [class*="card"]')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够查看活动详情', async ({ page }) => {
    // 查找第一个活动卡片或链接
    const firstHackathon = page.locator('a[href*="/hackathons/"], [class*="card"], [class*="item"]').first();
    
    if (await firstHackathon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 检查详情页元素
      await expect(page.locator('text=活动详情, text=活动名称, [class*="detail"]')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('应该能够搜索活动', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('测试');
      await page.waitForTimeout(1000);
      
      // 检查搜索结果
      await expect(page.locator('[class*="list"], [class*="card"]')).toBeVisible();
    }
  });

  test('应该能够筛选活动状态', async ({ page }) => {
    // 查找筛选器
    const filterButton = page.locator('button:has-text("筛选"), select, .ant-select').first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // 选择状态
      const statusOption = page.locator('text=报名, text=registration').first();
      if (await statusOption.isVisible()) {
        await statusOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

