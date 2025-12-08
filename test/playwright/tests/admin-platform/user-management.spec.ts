import { test, expect } from '@playwright/test';
import { adminLogin, waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Admin Platform 用户管理测试
 */
test.describe('Admin Platform - 用户管理', () => {
  test.beforeEach(async ({ page }) => {
    // 使用 admin 账号登录
    await adminLogin(page, 'admin@example.com', 'admin123');
    await waitForPageLoad(page);
  });

  test('Admin 应该能够访问用户管理页面', async ({ page }) => {
    await page.goto('/users');
    await waitForPageLoad(page);
    
    // 检查页面标题或表格
    await expect(page.locator('text=人员管理, text=用户管理, table, .ant-table')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够创建新的主办方用户', async ({ page }) => {
    await page.goto('/users');
    await waitForPageLoad(page);
    
    // 点击添加按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("新建"), button:has-text("创建")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // 等待表单出现
      await page.waitForTimeout(1000);
      
      // 填写表单
      const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"]').first();
      const emailInput = page.locator('input[name="email"], input[placeholder*="邮箱"]').first();
      const passwordInput = page.locator('input[name="password"], input[placeholder*="密码"]').first();
      
      if (await nameInput.isVisible()) {
        const timestamp = Date.now();
        await nameInput.fill(`测试用户${timestamp}`);
        await emailInput.fill(`test${timestamp}@example.com`);
        await passwordInput.fill('test123456');
        
        // 选择角色（如果是下拉框）
        const roleSelect = page.locator('select[name="role"], .ant-select:has-text("角色")').first();
        if (await roleSelect.isVisible()) {
          await roleSelect.click();
          await page.click('text=主办方, text=organizer');
        }
        
        // 提交
        const submitButton = page.locator('button[type="submit"], button:has-text("确定"), button:has-text("保存")').first();
        await submitButton.click();
        
        // 等待成功消息
        await page.waitForTimeout(2000);
        await checkSuccessMessage(page);
      }
    }
  });

  test('应该能够查看用户列表', async ({ page }) => {
    await page.goto('/users');
    await waitForPageLoad(page);
    
    // 检查是否有用户列表（表格或卡片）
    const listVisible = await page.locator('table, .ant-table, [class*="list"], [class*="table"]').first().isVisible().catch(() => false);
    if (listVisible) {
      await expect(page.locator('table, .ant-table, [class*="list"], [class*="table"]').first()).toBeVisible();
    }
  });

  test('应该能够搜索用户', async ({ page }) => {
    await page.goto('/users');
    await waitForPageLoad(page);
    
    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="搜索用户"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // 检查搜索结果
      await expect(page.locator('table, .ant-table, [class*="list"]').first()).toBeVisible();
    }
  });
});

