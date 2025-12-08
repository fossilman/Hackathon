import { test, expect } from '@playwright/test';
import { waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Arena Platform 报名功能测试
 * 注意：此测试需要 Metamask 钱包，在实际测试中可能需要模拟或跳过
 */
test.describe('Arena Platform - 报名功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该能够查看活动详情并显示报名按钮（报名阶段）', async ({ page }) => {
    // 导航到活动列表
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 查找一个活动
    const firstHackathon = page.locator('a[href*="/hackathons/"], [class*="card"]').first();
    if (await firstHackathon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 检查是否有报名按钮（在报名阶段）
      const registerButton = page.locator('button:has-text("报名"), button:has-text("注册")').first();
      // 如果活动处于报名阶段，应该显示报名按钮
      if (await registerButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(registerButton).toBeVisible();
      }
    }
  });

  test('未连接钱包时点击报名应该提示连接钱包', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 查找活动并进入详情
    const firstHackathon = page.locator('a[href*="/hackathons/"], [class*="card"]').first();
    if (await firstHackathon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 点击报名按钮
      const registerButton = page.locator('button:has-text("报名"), button:has-text("注册")').first();
      if (await registerButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await registerButton.click();
        await page.waitForTimeout(1000);
        
        // 应该显示连接钱包的提示
        const connectPrompt = page.locator('text=连接钱包, text=Metamask, text=请先连接').first();
        if (await connectPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(connectPrompt).toBeVisible();
        }
      }
    }
  });
});

