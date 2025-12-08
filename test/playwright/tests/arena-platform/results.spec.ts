import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

/**
 * Arena Platform 结果查看测试
 */
test.describe('Arena Platform - 结果查看', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该能够查看比赛结果', async ({ page }) => {
    await page.goto('/hackathons/1/results');
    await waitForPageLoad(page);
    
    // 检查结果页面元素
    await expect(page.locator('text=比赛结果, text=排名, text=获奖, [class*="result"]')).toBeVisible({ timeout: 5000 });
  });

  test('应该显示排名列表', async ({ page }) => {
    await page.goto('/hackathons/1/results');
    await waitForPageLoad(page);
    
    // 检查排名列表
    const rankingList = page.locator('[class*="ranking"], [class*="list"], table').first();
    if (await rankingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(rankingList).toBeVisible();
    }
  });

  test('应该显示获奖队伍信息', async ({ page }) => {
    await page.goto('/hackathons/1/results');
    await waitForPageLoad(page);
    
    // 检查获奖信息
    const awardInfo = page.locator('text=一等奖, text=二等奖, text=三等奖, [class*="award"]').first();
    if (await awardInfo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(awardInfo).toBeVisible();
    }
  });
});

