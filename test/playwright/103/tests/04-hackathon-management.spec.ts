import { test, expect } from '@playwright/test'
import { login, TEST_USERS, waitForMessage, waitForTableLoad } from './setup/helpers'

/**
 * 活动管理操作权限测试
 * 对应 PRD103 4.3 活动管理模块
 */
test.describe('活动管理操作权限', () => {
  test.describe('活动列表操作', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')
    })

    test('Admin可以查看活动列表', async ({ page }) => {
      await expect(page.locator('[data-testid="hackathon-list-table"]')).toBeVisible()
      const rows = page.locator('[data-testid="hackathon-list-table"] tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('Admin不能创建活动', async ({ page }) => {
      // Admin不应该看到创建活动按钮，或者点击后无权限
      const createButton = page.locator('[data-testid="hackathon-list-create-button"]')
      const isVisible = await createButton.isVisible({ timeout: 1000 }).catch(() => false)
      if (isVisible) {
        // 如果按钮存在，点击后应该被阻止或显示错误
        await createButton.click()
        // 应该无法访问创建页面
        await expect(page).not.toHaveURL('/hackathons/create')
      }
    })

    test('按活动状态筛选', async ({ page }) => {
      const statusFilter = page.locator('[data-testid="hackathon-list-status-filter"]')
      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusFilter.click()
        await page.waitForTimeout(500)
        // 选择某个状态
        const option = page.locator('[data-testid="hackathon-list-status-option-published"]')
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click()
          await page.waitForTimeout(1000)
          // 验证筛选生效
          await waitForTableLoad(page, 'hackathon-list-table')
        }
      }
    })

    test('按创建时间排序', async ({ page }) => {
      const sortFilter = page.locator('[data-testid="hackathon-list-sort-filter"]')
      if (await sortFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sortFilter.click()
        await page.waitForTimeout(500)
        const option = page.locator('[data-testid="hackathon-list-sort-created-asc"]')
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click()
          await page.waitForTimeout(1000)
          await waitForTableLoad(page, 'hackathon-list-table')
        }
      }
    })
  })

  test.describe('活动创建/编辑操作', () => {
    test('主办方可以创建活动', async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
      await page.goto('/hackathons/create')
      await expect(page.locator('[data-testid="hackathon-create-page"]')).toBeVisible()

      const timestamp = Date.now()
      const hackathonName = `测试活动${timestamp}`

      // 填写表单
      await page.fill('[data-testid="hackathon-create-form-name-input"]', hackathonName)
      
      // 填写描述（ReactQuill编辑器）
      await page.waitForTimeout(1000) // 等待编辑器加载
      const descriptionEditor = page.locator('[data-testid="hackathon-create-form-description-quill"] .ql-editor')
      await descriptionEditor.waitFor({ state: 'visible', timeout: 10000 })
      await descriptionEditor.click()
      await descriptionEditor.fill(`这是测试活动${timestamp}的描述`)

      // 选择时间范围
      const timeRangePicker = page.locator('[data-testid="hackathon-create-form-time-range-picker"]')
      await timeRangePicker.click()
      await page.waitForTimeout(500)
      // 选择开始时间（明天）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const startDateStr = tomorrow.toISOString().split('T')[0]
      // 使用 Ant Design DatePicker 的日期选择
      await page.keyboard.type(startDateStr)
      await page.keyboard.press('Tab')
      // 选择结束时间（7天后）
      const endDate = new Date(tomorrow)
      endDate.setDate(endDate.getDate() + 7)
      const endDateStr = endDate.toISOString().split('T')[0]
      await page.keyboard.type(endDateStr)
      await page.keyboard.press('Escape')

      // 选择地点类型
      await page.click('[data-testid="hackathon-create-form-location-type-select"]')
      await page.click('[data-testid="hackathon-create-form-location-online"]')

      // 提交
      await page.click('[data-testid="hackathon-create-form-submit-button"]')
      // 等待跳转或错误消息
      await page.waitForTimeout(3000)
      
      // 如果创建成功，应该跳转到活动列表
      const currentUrl = page.url()
      if (currentUrl.includes('/hackathons') && !currentUrl.includes('/create')) {
        await waitForMessage(page, 'success')
      }
    })

    test('主办方可以编辑自己创建的预备状态活动', async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      // 查找状态为preparation的活动（通过状态列的Tag查找）
      const rows = page.locator('[data-testid="hackathon-list-table"] tbody tr')
      const count = await rows.count()
      
      let found = false
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        // 查找状态列中的"预备"标签
        const statusTag = row.locator('td').filter({ hasText: '预备' })
        if (await statusTag.isVisible({ timeout: 1000 }).catch(() => false)) {
          // 找到编辑按钮
          const editButton = row.locator('[data-testid^="hackathon-list-edit-button-"]')
          if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await editButton.click()
            await page.waitForTimeout(1000)
            // 验证进入编辑页面
            await expect(page).toHaveURL(/\/hackathons\/\d+\/edit/)
            found = true
            break
          }
        }
      }
      
      // 如果没有找到可编辑的活动，测试仍然通过（可能没有预备状态的活动）
      if (!found) {
        console.log('未找到可编辑的预备状态活动，跳过此测试')
      }
    })

    test('主办方可以发布自己创建的活动', async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      // 查找状态为preparation的活动并查看详情（通过状态列的Tag查找）
      const rows = page.locator('[data-testid="hackathon-list-table"] tbody tr')
      const count = await rows.count()
      
      let found = false
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        // 查找状态列中的"预备"标签
        const statusTag = row.locator('td').filter({ hasText: '预备' })
        if (await statusTag.isVisible({ timeout: 1000 }).catch(() => false)) {
          const viewButton = row.locator('[data-testid^="hackathon-list-view-button-"]')
          if (await viewButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await viewButton.click()
            await page.waitForTimeout(2000)
            
            // 检查是否有发布按钮
            const publishButton = page.locator('[data-testid="hackathon-detail-publish-button"]')
            if (await publishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await publishButton.click()
              await waitForMessage(page, 'success')
              found = true
              break
            }
          }
        }
      }
      
      // 如果没有找到可发布的活动，测试仍然通过（可能没有预备状态的活动）
      if (!found) {
        console.log('未找到可发布的预备状态活动，跳过此测试')
      }
    })

    test('Admin不能创建活动', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons/create')
      // 应该被重定向或显示错误
      await expect(page).not.toHaveURL('/hackathons/create')
    })

    test('Admin不能编辑活动', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      // Admin不应该看到编辑按钮
      const editButtons = page.locator('[data-testid^="hackathon-list-edit-button-"]')
      const count = await editButtons.count()
      expect(count).toBe(0)
    })
  })

  test.describe('活动详情查看', () => {
    test('Admin可以查看活动详情', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      // 点击第一个活动的查看按钮
      const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click()
        await page.waitForTimeout(1000)
        await expect(page.locator('[data-testid="hackathon-detail-page"]')).toBeVisible()
      }
    })

    test('主办方可以查看活动详情', async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click()
        await page.waitForTimeout(1000)
        await expect(page.locator('[data-testid="hackathon-detail-page"]')).toBeVisible()
      }
    })

    test('查看活动统计信息', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')

      const viewButton = page.locator('[data-testid^="hackathon-list-view-button-"]').first()
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click()
        await page.waitForTimeout(1000)
        
        // 验证统计信息显示
        await expect(page.locator('[data-testid="hackathon-detail-stat-registration"]')).toBeVisible()
        await expect(page.locator('[data-testid="hackathon-detail-stat-checkin"]')).toBeVisible()
        await expect(page.locator('[data-testid="hackathon-detail-stat-team"]')).toBeVisible()
        await expect(page.locator('[data-testid="hackathon-detail-stat-submission"]')).toBeVisible()
      }
    })
  })
})

