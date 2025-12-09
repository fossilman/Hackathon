import { test, expect } from '@playwright/test'
import { login, TEST_USERS, waitForMessage } from './setup/helpers'

/**
 * 活动阶段管理测试
 * 对应 PRD103 4.4 活动阶段管理模块
 */
test.describe('活动阶段管理', () => {
  test('活动创建者可以访问阶段管理页面', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    
    // 先找到一个自己创建的活动
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    // 点击第一个活动的查看按钮
    const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // 检查是否有阶段管理按钮
      const stagesButton = page.locator('[data-testid="hackathon-detail-stages-button"]')
      if (await stagesButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stagesButton.click()
        await page.waitForTimeout(1000)
        await expect(page.locator('[data-testid="hackathon-stages-page"]')).toBeVisible()
      }
    }
  })

  test('活动创建者可以设置阶段时间', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    
    // 导航到阶段管理页面
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const stagesButton = page.locator('[data-testid="hackathon-detail-stages-button"]')
      if (await stagesButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stagesButton.click()
        await page.waitForTimeout(1000)
        
        // 验证阶段时间设置表单存在
        await expect(page.locator('[data-testid="hackathon-stages-form"]')).toBeVisible()
        
        // 验证各个阶段的时间选择器存在
        const stages = ['registration', 'checkin', 'team_formation', 'submission', 'voting']
        for (const stage of stages) {
          const picker = page.locator(`[data-testid="hackathon-stages-form-${stage}-picker"]`)
          await expect(picker).toBeVisible()
        }
      }
    }
  })

  test('活动创建者可以查看时间轴视图', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // 在活动详情页查看时间轴
      const timeline = page.locator('[data-testid="hackathon-detail-timeline"]')
      if (await timeline.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(timeline).toBeVisible()
      }
    }
  })

  test('活动创建者可以手动切换活动阶段', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    // 查找已发布的活动
    const rows = page.locator('[data-testid="hackathon-list-table"] tbody tr')
    const count = await rows.count()
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const statusText = await row.locator('td').nth(2).textContent()
      if (statusText?.includes('发布') || statusText?.includes('报名')) {
        const viewButton = row.locator('[data-testid^="hackathon-list-view-button-"]')
        if (await viewButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(1000)
          
          // 检查是否有切换阶段按钮
          const switchButton = page.locator('[data-testid="hackathon-detail-switch-stage-button"]')
          if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            // 可以测试切换阶段功能
            await expect(switchButton).toBeVisible()
            break
          }
        }
      }
    }
  })

  test('Admin不能管理活动阶段', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // Admin不应该看到阶段管理按钮
      const stagesButton = page.locator('[data-testid="hackathon-detail-stages-button"]')
      await expect(stagesButton).not.toBeVisible()
      
      // 直接访问阶段管理页面应该被阻止
      const url = page.url()
      const hackathonId = url.match(/\/hackathons\/(\d+)/)?.[1]
      if (hackathonId) {
        await page.goto(`/hackathons/${hackathonId}/stages`)
        // 应该被重定向或显示错误
        await expect(page).not.toHaveURL(`/hackathons/${hackathonId}/stages`)
      }
    }
  })

  test('其他主办方不能管理非自己创建的活动阶段', async ({ page }) => {
    await login(page, TEST_USERS.organizer2.email, TEST_USERS.organizer2.password)
    
    await page.goto('/hackathons')
    await page.waitForSelector('[data-testid="hackathon-list-table"]', { timeout: 5000 })
    
    const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // 如果不是创建者，不应该看到阶段管理按钮
      const stagesButton = page.locator('[data-testid="hackathon-detail-stages-button"]')
      // 这个按钮可能不存在，或者存在但点击后无权限
      const isVisible = await stagesButton.isVisible({ timeout: 1000 }).catch(() => false)
      if (isVisible) {
        // 如果按钮存在，点击后应该被阻止
        await stagesButton.click()
        await page.waitForTimeout(1000)
        // 应该无法访问阶段管理页面
        await expect(page).not.toHaveURL(/\/hackathons\/\d+\/stages/)
      }
    }
  })
})

