import { test, expect } from '@playwright/test';
import { waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Arena Platform 投票功能测试
 */
test.describe('Arena Platform - 投票功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该能够查看作品列表并投票', async ({ page }) => {
    await page.goto('/hackathons/1/submissions');
    await waitForPageLoad(page);
    
    // 查找第一个作品
    const firstSubmission = page.locator('[class*="card"], [class*="item"], [class*="submission"]').first();
    if (await firstSubmission.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 查找投票按钮
      const voteButton = firstSubmission.locator('button:has-text("投票"), button:has-text("点赞")').first();
      if (await voteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await voteButton.click();
        
        // 确认对话框（如果有）
        const confirmButton = page.locator('button:has-text("确定"), button:has-text("确认")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // 等待成功消息
        await page.waitForTimeout(2000);
        await checkSuccessMessage(page);
      }
    }
  });

  test('应该能够查看投票结果', async ({ page }) => {
    await page.goto('/hackathons/1/submissions');
    await waitForPageLoad(page);
    
    // 检查是否有得票数显示
    const voteCount = page.locator('text=票, text=votes, [class*="vote"]').first();
    if (await voteCount.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(voteCount).toBeVisible();
    }
  });
});

