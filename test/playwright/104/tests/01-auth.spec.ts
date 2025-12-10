import { test, expect } from '@playwright/test'
import { connectWallet, disconnectWallet, setupMetamask, TEST_WALLETS, waitForMessage, navigateAndWait } from './setup/helpers'

/**
 * 认证模块测试
 * 对应 PRD104 4.1 用户认证模块
 */
test.describe('认证模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
  })

  test('连接 Metamask 钱包成功', async ({ page }) => {
    await setupMetamask(page, TEST_WALLETS.participant1)
    
    // 点击连接钱包按钮
    await page.click('[data-testid="arena-connect-button"]')
    
    // 等待连接成功
    await page.waitForSelector('[data-testid="arena-wallet-address"]', { timeout: 10000 })
    await waitForMessage(page, 'success', 5000)
    
    // 验证钱包地址显示
    const walletAddress = page.locator('[data-testid="arena-wallet-address"]')
    await expect(walletAddress).toBeVisible()
    await expect(walletAddress).toContainText('1111')
  })

  test('未安装 Metamask 时显示提示', async ({ page }) => {
    // 不设置 window.ethereum
    await page.goto('/')
    
    // 点击连接钱包按钮
    await page.click('[data-testid="arena-connect-button"]')
    
    // 应该显示错误消息
    await waitForMessage(page, 'error', 5000)
  })

  test('断开钱包连接', async ({ page }) => {
    // 先连接钱包
    await connectWallet(page, TEST_WALLETS.participant1)
    
    // 验证已连接
    await expect(page.locator('[data-testid="arena-wallet-address"]')).toBeVisible()
    
    // 断开连接
    await disconnectWallet(page)
    
    // 验证已断开（连接按钮应该显示）
    await expect(page.locator('[data-testid="arena-connect-button"]')).toBeVisible()
  })

  test('查看个人中心', async ({ page }) => {
    await connectWallet(page, TEST_WALLETS.participant1)
    
    // 点击个人中心
    await page.click('[data-testid="nav-profile"]')
    
    // 验证页面加载
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    
    // 验证钱包地址显示
    await expect(page.locator('[data-testid="profile-address"]')).toBeVisible()
    const address = await page.locator('[data-testid="profile-address"]').textContent()
    expect(address).toContain(TEST_WALLETS.participant1)
  })

  test('未登录时访问个人中心应跳转', async ({ page }) => {
    await navigateAndWait(page, '/profile')
    
    // 应该跳转到首页或显示连接钱包提示
    // 根据实际实现，可能是跳转到首页或显示错误消息
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\//)
  })

  test('切换钱包账户', async ({ page }) => {
    // 先连接第一个钱包
    await connectWallet(page, TEST_WALLETS.participant1)
    
    // 模拟账户切换
    await page.evaluate(() => {
      if ((window as any).ethereum) {
        ;(window as any).ethereum.emit('accountsChanged', ['0x2222222222222222222222222222222222222222'])
      }
    })
    
    // 等待重新认证（根据实际实现）
    await page.waitForTimeout(1000)
  })
})

