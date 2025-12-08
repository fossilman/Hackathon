import { Page } from '@playwright/test';
import { testUsers, TestUser } from './test-data';

/**
 * 登录辅助函数
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // 等待页面标题出现，确保页面已加载
  await page.waitForSelector('text=Hackathon Admin Platform', { timeout: 15000 });
  
  // 等待登录表单出现 - 使用更宽松的选择器
  await page.waitForSelector('input', { timeout: 15000 });
  
  // 尝试多种方式找到邮箱输入框
  const emailInput = page.locator('input[name="email"]').or(page.locator('input[type="email"]')).or(page.locator('input').first());
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(user.email);
  
  // 找到密码输入框
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(user.password);
  
  // 点击登录按钮
  const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("登录")')).first();
  await submitButton.waitFor({ state: 'visible', timeout: 10000 });
  await submitButton.click();
  
  // 等待登录成功消息或URL变化
  try {
    // 等待成功消息出现（antd message）
    await page.waitForSelector('.ant-message-success', { timeout: 5000 });
  } catch {
    // 如果没有成功消息，直接等待URL变化
  }
  
  // 等待登录完成（URL不再是/login）
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
}

/**
 * 登出辅助函数
 */
export async function logout(page: Page) {
  // 清除localStorage中的认证信息
  await page.evaluate(() => {
    localStorage.clear();
  });
  
  // 直接跳转到登录页
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // 等待登录页加载完成
  await page.waitForSelector('input[name="email"]', { timeout: 5000 }).catch(() => {
    // 如果找不到输入框，等待页面标题
    return page.waitForSelector('text=Hackathon Admin Platform', { timeout: 5000 });
  });
}

/**
 * 检查页面是否可访问（不重定向）
 */
export async function checkPageAccessible(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  // 等待页面加载
  await page.waitForLoadState('networkidle');
  // 检查是否被重定向到登录页
  const currentUrl = page.url();
  return !currentUrl.includes('/login');
}

/**
 * 检查元素是否存在
 */
export async function checkElementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取用户信息
 */
export function getUserByRole(role: 'admin' | 'organizer' | 'sponsor'): TestUser {
  const user = testUsers.find((u) => u.role === role);
  if (!user) {
    throw new Error(`找不到角色为 ${role} 的测试用户`);
  }
  return user;
}

