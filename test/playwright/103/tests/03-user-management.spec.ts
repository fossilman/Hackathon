import { test, expect } from '@playwright/test';
import { login, logout, getUserByRole } from './setup/helpers';

/**
 * 人员管理模块测试
 * 根据 PRD103 4.2 人员管理模块（仅Admin）
 */
test.describe('人员管理模块', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getUserByRole('admin');
    await login(page, admin);
    await page.goto('/users');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('Admin可以查看人员列表', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    // 验证页面包含人员列表相关元素
    const hasTable = await page.locator('table, .ant-table, [data-testid="user-list"]').count() > 0;
    expect(hasTable).toBeTruthy();
  });

  test('Admin可以添加主办方人员', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 查找添加按钮
    const addButton = page.locator('button:has-text("添加用户"), button:has-text("添加"), button:has-text("新增")').first();
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    await addButton.click();
    
    // 等待模态框打开
    await page.waitForSelector('.ant-modal', { timeout: 5000 });
    
    // 填写表单
    await page.fill('input[name="name"], input[placeholder*="姓名"]', '新主办方');
    await page.fill('input[name="email"], input[placeholder*="邮箱"]', `organizer_new_${Date.now()}@test.com`);
    
    // 填写密码
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('NewPass123456');
    
    await page.fill('input[name="phone"], input[placeholder*="手机"]', '13800138000');
    
    // 选择角色为主办方 - Ant Design Select组件
    // 通过Form.Item的label定位角色选择器
    const roleFormItem = page.locator('.ant-form-item').filter({ hasText: '角色' });
    const roleSelect = roleFormItem.locator('.ant-select').first();
    await roleSelect.waitFor({ state: 'visible', timeout: 5000 });
    await roleSelect.click();
    
    // 等待下拉菜单打开并选择"主办方"
    await page.waitForSelector('.ant-select-dropdown', { timeout: 5000 });
    await page.locator('.ant-select-item:has-text("主办方")').click();
    
    // 提交表单 - 点击模态框的确定按钮
    const submitButton = page.locator('.ant-modal .ant-btn-primary').filter({ hasText: '确 定' }).or(page.locator('.ant-modal .ant-btn-primary').first());
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();
    
    // 等待成功提示
    await page.waitForSelector('.ant-message-success', { timeout: 10000 });
    
    // 验证模态框已关闭
    await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 5000 });
  });

  test('主办方不能访问人员管理页面', async ({ page }) => {
    await logout(page);
    const organizer = getUserByRole('organizer');
    await login(page, organizer);
    await page.goto('/users');
    // 应该被重定向
    await expect(page).not.toHaveURL(/.*\/users/);
  });

  test('赞助商不能访问人员管理页面', async ({ page }) => {
    await logout(page);
    const sponsor = getUserByRole('sponsor');
    await login(page, sponsor);
    await page.goto('/users');
    // 应该被重定向到 profile
    await expect(page).toHaveURL(/.*\/profile/);
  });
});

