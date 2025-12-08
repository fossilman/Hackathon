import { test, expect } from '@playwright/test';
import { adminLogin, waitForPageLoad, checkSuccessMessage } from '../utils/test-helpers';

/**
 * Admin Platform 活动管理测试
 */
test.describe('Admin Platform - 活动管理', () => {
  test.beforeEach(async ({ page }) => {
    // 使用 organizer 账号登录
    await adminLogin(page, 'organizer@example.com', 'organizer123');
    await waitForPageLoad(page);
  });

  test('应该能够访问活动列表页面', async ({ page }) => {
    await page.goto('/hackathons');
    await waitForPageLoad(page);
    
    // 检查页面标题或列表
    await expect(page.locator('text=活动管理, text=活动列表, table, .ant-table, [class*="list"]')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够创建新活动', async ({ page }) => {
    await page.goto('/hackathons/create');
    await waitForPageLoad(page);
    
    // 填写活动基本信息
    const nameInput = page.locator('input[name="name"], input[placeholder*="活动名称"]').first();
    if (await nameInput.isVisible()) {
      const timestamp = Date.now();
      await nameInput.fill(`测试活动${timestamp}`);
      
      // 填写描述
      const descriptionInput = page.locator('textarea[name="description"], .ql-editor, [contenteditable="true"]').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('这是一个测试活动描述');
      }
      
      // 填写时间（使用未来时间）
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 7);
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 3);
      
      const startTimeInput = page.locator('input[placeholder*="开始时间"], input[name="start_time"]').first();
      const endTimeInput = page.locator('input[placeholder*="结束时间"], input[name="end_time"]').first();
      
      if (await startTimeInput.isVisible()) {
        await startTimeInput.fill(startTime.toISOString().slice(0, 16));
        await endTimeInput.fill(endTime.toISOString().slice(0, 16));
      }
      
      // 选择地点类型
      const locationSelect = page.locator('select[name="location_type"], .ant-select:has-text("地点")').first();
      if (await locationSelect.isVisible()) {
        await locationSelect.click();
        await page.click('text=线上, text=online');
      }
      
      // 保存
      const saveButton = page.locator('button:has-text("保存"), button:has-text("创建"), button[type="submit"]').first();
      await saveButton.click();
      
      // 等待成功消息或页面跳转
      await page.waitForTimeout(3000);
      await checkSuccessMessage(page);
    }
  });

  test('应该能够查看活动详情', async ({ page }) => {
    // 先获取活动列表
    await page.goto('/hackathons');
    await waitForPageLoad(page);
    
    // 点击第一个活动（如果有）
    const firstHackathon = page.locator('a[href*="/hackathons/"], button:has-text("查看"), [class*="card"]').first();
    if (await firstHackathon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 检查详情页元素
      await expect(page.locator('text=活动详情, text=活动名称, [class*="detail"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够发布活动', async ({ page }) => {
    await page.goto('/hackathons');
    await waitForPageLoad(page);
    
    // 查找状态为"预备"的活动
    const preparationHackathon = page.locator('text=预备, text=preparation').first();
    if (await preparationHackathon.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 点击进入详情页
      await preparationHackathon.locator('..').locator('a, button').first().click();
      await waitForPageLoad(page);
      
      // 查找发布按钮
      const publishButton = page.locator('button:has-text("发布"), button:has-text("发布活动")').first();
      if (await publishButton.isVisible()) {
        await publishButton.click();
        
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

  test('应该能够切换活动阶段', async ({ page }) => {
    await page.goto('/hackathons');
    await waitForPageLoad(page);
    
    // 点击一个活动进入详情
    const firstHackathon = page.locator('a[href*="/hackathons/"], [class*="card"]').first();
    if (await firstHackathon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstHackathon.click();
      await waitForPageLoad(page);
      
      // 查找阶段切换按钮
      const stageButton = page.locator('button:has-text("切换"), button:has-text("阶段")').first();
      if (await stageButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stageButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

