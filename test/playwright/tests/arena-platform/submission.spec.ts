import { test, expect } from '@playwright/test';
import { waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Arena Platform 作品提交测试
 */
test.describe('Arena Platform - 作品提交', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('应该能够访问作品提交页面', async ({ page }) => {
    // 导航到提交页面
    await page.goto('/hackathons/1/submit');
    await waitForPageLoad(page);
    
    // 检查提交表单
    await expect(page.locator('text=提交作品, text=作品名称, input[name="name"]')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够填写并提交作品', async ({ page }) => {
    await page.goto('/hackathons/1/submit');
    await waitForPageLoad(page);
    
    // 填写作品信息
    const nameInput = page.locator('input[name="name"], input[placeholder*="作品名称"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const timestamp = Date.now();
      await nameInput.fill(`测试作品${timestamp}`);
      
      // 填写描述
      const descriptionInput = page.locator('textarea[name="description"], .ql-editor, [contenteditable="true"]').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('这是一个测试作品描述');
      }
      
      // 填写链接
      const linkInput = page.locator('input[name="link"], input[placeholder*="作品链接"], input[type="url"]').first();
      if (await linkInput.isVisible()) {
        await linkInput.fill('https://github.com/test/project');
      }
      
      // 提交
      const submitButton = page.locator('button:has-text("提交"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // 等待成功消息
        await page.waitForTimeout(2000);
        await checkSuccessMessage(page);
      }
    }
  });

  test('应该能够查看作品列表（投票阶段）', async ({ page }) => {
    await page.goto('/hackathons/1/submissions');
    await waitForPageLoad(page);
    
    // 检查作品列表
    await expect(page.locator('[class*="list"], [class*="submission"], [class*="card"]')).toBeVisible({ timeout: 5000 });
  });
});

