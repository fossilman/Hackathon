import { Page, expect } from '@playwright/test'

/**
 * 测试钱包地址（用于模拟 Metamask）
 */
export const TEST_WALLETS = {
  participant1: '0x1111111111111111111111111111111111111111',
  participant2: '0x2222222222222222222222222222222222222222',
  participant3: '0x3333333333333333333333333333333333333333',
  participant4: '0x4444444444444444444444444444444444444444',
  participant5: '0x5555555555555555555555555555555555555555',
}

/**
 * 模拟 Metamask 钱包连接
 */
export async function setupMetamask(page: Page, walletAddress: string = TEST_WALLETS.participant1) {
  await page.addInitScript(() => {
    // 模拟 window.ethereum
    ;(window as any).ethereum = {
      isMetaMask: true,
      request: async (args: any) => {
        if (args.method === 'eth_requestAccounts') {
          return [walletAddress]
        }
        if (args.method === 'personal_sign') {
          // 返回模拟签名
          return '0x' + 'a'.repeat(128)
        }
        return []
      },
      on: () => {},
      removeListener: () => {},
    }
  })
}

/**
 * 连接钱包
 */
export async function connectWallet(page: Page, walletAddress: string = TEST_WALLETS.participant1) {
  await setupMetamask(page, walletAddress)
  
  // 点击连接钱包按钮
  const connectButton = page.locator('[data-testid="arena-connect-button"]')
  if (await connectButton.isVisible()) {
    await connectButton.click()
    
    // 等待连接成功（检查钱包地址是否显示）
    await page.waitForSelector('[data-testid="arena-wallet-address"]', { timeout: 10000 })
    
    // 等待成功消息
    await waitForMessage(page, 'success', 5000)
  }
}

/**
 * 断开钱包连接
 */
export async function disconnectWallet(page: Page) {
  const disconnectButton = page.locator('[data-testid="arena-disconnect-button"]')
  if (await disconnectButton.isVisible()) {
    await disconnectButton.click()
    await waitForMessage(page, 'success', 5000)
  }
}

/**
 * 等待消息提示
 */
export async function waitForMessage(
  page: Page,
  type: 'success' | 'error' | 'info' | 'warning',
  timeout: number = 3000
) {
  const messageSelector = `.ant-message-${type}`
  try {
    await page.waitForSelector(messageSelector, { timeout, state: 'visible' })
    // 等待消息消失
    await page.waitForSelector(messageSelector, { timeout: 2000, state: 'hidden' }).catch(() => {})
  } catch (e) {
    // 忽略超时错误
  }
}

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // 额外等待500ms确保渲染完成
}

/**
 * 导航到页面并等待加载
 */
export async function navigateAndWait(page: Page, path: string) {
  await page.goto(path)
  await waitForPageLoad(page)
}

/**
 * 获取活动ID（从URL或页面元素）
 */
export async function getHackathonIdFromUrl(page: Page): Promise<number | null> {
  const url = page.url()
  const match = url.match(/\/hackathons\/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * 等待元素可见并点击
 */
export async function waitAndClick(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
  await page.click(selector)
}

/**
 * 填写表单字段
 */
export async function fillFormField(page: Page, testId: string, value: string) {
  const field = page.locator(`[data-testid="${testId}"]`)
  await field.waitFor({ state: 'visible', timeout: 5000 })
  await field.fill(value)
}

/**
 * 提交表单
 */
export async function submitForm(page: Page, submitButtonTestId: string) {
  const submitButton = page.locator(`[data-testid="${submitButtonTestId}"]`)
  await submitButton.waitFor({ state: 'visible', timeout: 5000 })
  await submitButton.click()
  await waitForPageLoad(page)
}

/**
 * 验证元素文本
 */
export async function expectText(page: Page, testId: string, expectedText: string | RegExp) {
  const element = page.locator(`[data-testid="${testId}"]`)
  await expect(element).toHaveText(expectedText)
}

/**
 * 验证元素可见
 */
export async function expectVisible(page: Page, testId: string) {
  const element = page.locator(`[data-testid="${testId}"]`)
  await expect(element).toBeVisible()
}

/**
 * 验证元素不可见
 */
export async function expectNotVisible(page: Page, testId: string) {
  const element = page.locator(`[data-testid="${testId}"]`)
  await expect(element).not.toBeVisible()
}

/**
 * 等待列表加载
 */
export async function waitForListLoad(page: Page, listTestId: string, timeout: number = 10000) {
  await page.waitForSelector(`[data-testid="${listTestId}"]`, { state: 'visible', timeout })
  await page.waitForTimeout(500) // 等待列表渲染
}

/**
 * 获取列表项数量
 */
export async function getListItemCount(page: Page, listTestId: string): Promise<number> {
  const items = page.locator(`[data-testid^="${listTestId}-item-"]`)
  return await items.count()
}

/**
 * 点击列表项
 */
export async function clickListItem(page: Page, listTestId: string, itemId: number | string) {
  const item = page.locator(`[data-testid="${listTestId}-item-${itemId}"]`)
  await item.waitFor({ state: 'visible', timeout: 5000 })
  await item.click()
}

/**
 * 等待 Modal 打开
 */
export async function waitForModal(page: Page, modalTestId: string, timeout: number = 5000) {
  const modal = page.locator(`[data-testid="${modalTestId}"]`)
  await modal.waitFor({ state: 'visible', timeout })
  await page.waitForTimeout(300) // 等待动画完成
}

/**
 * 关闭 Modal
 */
export async function closeModal(page: Page, modalTestId: string) {
  const modal = page.locator(`[data-testid="${modalTestId}"]`)
  const cancelButton = modal.locator('.ant-modal-close, [aria-label="Close"]')
  if (await cancelButton.isVisible()) {
    await cancelButton.click()
  }
  await page.waitForTimeout(300)
}

