import { Page, expect } from '@playwright/test';

/**
 * 测试辅助函数
 */

// API 基础 URL
export const API_BASE_URL = 'http://localhost:8080/api/v1';

/**
 * Admin Platform 登录
 */
export async function adminLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[placeholder*="邮箱"], input[name="email"]', email);
  await page.fill('input[type="password"], input[placeholder*="密码"], input[name="password"]', password);
  await page.click('button[type="submit"], button:has-text("登录")');
  // 等待登录完成
  await page.waitForURL(/^\/(?!login)/, { timeout: 10000 });
}

/**
 * 等待元素出现
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * 等待 API 请求完成
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * 检查成功消息
 */
export async function checkSuccessMessage(page: Page, message?: string) {
  const successSelector = '.ant-message-success, .ant-notification-notice-success, [class*="success"]';
  await waitForElement(page, successSelector);
  if (message) {
    await expect(page.locator(successSelector)).toContainText(message);
  }
}

/**
 * 检查错误消息
 */
export async function checkErrorMessage(page: Page, message?: string) {
  const errorSelector = '.ant-message-error, .ant-notification-notice-error, [class*="error"]';
  await waitForElement(page, errorSelector);
  if (message) {
    await expect(page.locator(errorSelector)).toContainText(message);
  }
}

/**
 * 创建测试数据 - Admin 用户
 */
export async function createAdminUser(page: Page, userData: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'organizer' | 'sponsor';
  phone?: string;
}) {
  // 导航到用户管理页面
  await page.goto('/users');
  
  // 点击添加用户按钮
  await page.click('button:has-text("添加"), button:has-text("新建"), button:has-text("创建")');
  
  // 填写表单
  await page.fill('input[name="name"], input[placeholder*="姓名"]', userData.name);
  await page.fill('input[name="email"], input[placeholder*="邮箱"]', userData.email);
  await page.fill('input[name="password"], input[placeholder*="密码"]', userData.password);
  
  // 选择角色
  if (userData.role) {
    await page.click('select[name="role"], .ant-select:has-text("角色")');
    await page.click(`text=${userData.role === 'admin' ? '管理员' : userData.role === 'organizer' ? '主办方' : '赞助商'}`);
  }
  
  if (userData.phone) {
    await page.fill('input[name="phone"], input[placeholder*="手机"]', userData.phone);
  }
  
  // 提交
  await page.click('button[type="submit"], button:has-text("确定"), button:has-text("保存")');
  
  // 等待成功消息
  await checkSuccessMessage(page);
}

/**
 * 创建测试数据 - Hackathon 活动
 */
export async function createHackathon(page: Page, hackathonData: {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  locationType: 'online' | 'offline' | 'hybrid';
  locationDetail?: string;
}) {
  // 导航到创建活动页面
  await page.goto('/hackathons/create');
  
  // 填写基本信息
  await page.fill('input[name="name"], input[placeholder*="活动名称"]', hackathonData.name);
  
  // 填写描述（可能是富文本编辑器）
  const descriptionInput = page.locator('textarea[name="description"], .ql-editor, [contenteditable="true"]').first();
  await descriptionInput.fill(hackathonData.description);
  
  // 填写时间
  await page.fill('input[placeholder*="开始时间"], input[name="start_time"]', hackathonData.startTime);
  await page.fill('input[placeholder*="结束时间"], input[name="end_time"]', hackathonData.endTime);
  
  // 选择地点类型
  await page.click(`text=${hackathonData.locationType === 'online' ? '线上' : hackathonData.locationType === 'offline' ? '线下' : '混合'}`);
  
  if (hackathonData.locationDetail) {
    await page.fill('input[placeholder*="具体地址"], input[name="location_detail"]', hackathonData.locationDetail);
  }
  
  // 保存
  await page.click('button:has-text("保存"), button:has-text("创建"), button[type="submit"]');
  
  // 等待成功消息或页面跳转
  await page.waitForTimeout(2000);
}

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

