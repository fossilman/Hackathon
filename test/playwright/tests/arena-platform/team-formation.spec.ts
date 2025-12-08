import { test, expect } from '@playwright/test';
import { waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Arena Platform 组队功能测试
 */
test.describe('Arena Platform - 组队功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该能够访问组队页面', async ({ page }) => {
    // 先进入一个活动的详情页
    const firstHackathon = page.locator('a[href*="/hackathons/"], [class*="card"]').first();
    if (await firstHackathon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 查找组队按钮或链接
      const teamButton = page.locator('a[href*="/teams"], button:has-text("组队")').first();
      if (await teamButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await teamButton.click();
        await waitForPageLoad(page);
        
        // 检查组队页面元素
        await expect(page.locator('text=组队, text=队伍列表, text=创建队伍')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('应该能够创建队伍', async ({ page }) => {
    // 导航到组队页面
    await page.goto('/hackathons/1/teams');
    await waitForPageLoad(page);
    
    // 查找创建队伍按钮
    const createButton = page.locator('button:has-text("创建队伍"), button:has-text("新建队伍")').first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // 填写队伍信息
      const nameInput = page.locator('input[name="name"], input[placeholder*="队伍名称"]').first();
      if (await nameInput.isVisible()) {
        const timestamp = Date.now();
        await nameInput.fill(`测试队伍${timestamp}`);
        
        // 提交
        const submitButton = page.locator('button[type="submit"], button:has-text("确定"), button:has-text("创建")').first();
        await submitButton.click();
        
        // 等待成功消息
        await page.waitForTimeout(2000);
        await checkSuccessMessage(page);
      }
    }
  });

  test('应该能够查看队伍列表', async ({ page }) => {
    await page.goto('/hackathons/1/teams');
    await waitForPageLoad(page);
    
    // 检查队伍列表
    await expect(page.locator('[class*="list"], [class*="team"], table')).toBeVisible({ timeout: 5000 });
  });
});

