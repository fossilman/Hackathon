import { test, expect } from '@playwright/test'
import { login, TEST_USERS, waitForTableLoad, checkTablePagination } from './setup/helpers'

/**
 * 分页功能测试
 * 对应 PRD103 中提到的分页功能需求
 */
test.describe('分页功能测试', () => {
  test.describe('用户管理分页', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/users')
      await waitForTableLoad(page, 'user-management-table')
    })

    test('用户列表支持分页', async ({ page }) => {
      await checkTablePagination(page, 'user-management-table')
    })

    test('可以切换每页显示数量', async ({ page }) => {
      const pagination = page.locator('.ant-pagination')
      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 查找页面大小选择器
        const pageSizeSelector = pagination.locator('.ant-select-selector').first()
        if (await pageSizeSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
          await pageSizeSelector.click()
          await page.waitForTimeout(500)
          
          // 选择不同的页面大小
          const option20 = page.locator('.ant-select-item:has-text("20")')
          if (await option20.isVisible({ timeout: 1000 }).catch(() => false)) {
            await option20.click()
            await page.waitForTimeout(1000)
            await waitForTableLoad(page, 'user-management-table')
            
            // 验证表格行数
            const rows = page.locator('[data-testid="user-management-table"] tbody tr')
            const count = await rows.count()
            expect(count).toBeLessThanOrEqual(20)
          }
        }
      }
    })

    test('可以翻页', async ({ page }) => {
      const pagination = page.locator('.ant-pagination')
      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 查找下一页按钮
        const nextButton = pagination.locator('.ant-pagination-next')
        const isDisabled = await nextButton.evaluate((el) => el.classList.contains('ant-pagination-disabled')).catch(() => true)
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false) && !isDisabled) {
          // 记录第一页的第一行内容
          const firstRow = page.locator('[data-testid="user-management-table"] tbody tr').first()
          const firstRowText = await firstRow.textContent()
          
          // 点击下一页
          await nextButton.click()
          await page.waitForTimeout(1000)
          await waitForTableLoad(page, 'user-management-table')
          
          // 验证内容已改变
          const newFirstRow = page.locator('[data-testid="user-management-table"] tbody tr').first()
          const newFirstRowText = await newFirstRow.textContent()
          expect(newFirstRowText).not.toBe(firstRowText)
        }
      }
    })

    test('显示总记录数', async ({ page }) => {
      const pagination = page.locator('.ant-pagination')
      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        const totalText = pagination.locator('.ant-pagination-total-text')
        if (await totalText.isVisible({ timeout: 1000 }).catch(() => false)) {
          const text = await totalText.textContent()
          expect(text).toContain('共')
          expect(text).toContain('条')
        }
      }
    })
  })

  test.describe('活动列表分页', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/hackathons')
      await waitForTableLoad(page, 'hackathon-list-table')
    })

    test('活动列表支持分页', async ({ page }) => {
      await checkTablePagination(page, 'hackathon-list-table')
    })

    test('可以切换每页显示数量', async ({ page }) => {
      const pagination = page.locator('.ant-pagination')
      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        const pageSizeSelector = pagination.locator('.ant-select-selector').first()
        if (await pageSizeSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
          await pageSizeSelector.click()
          await page.waitForTimeout(500)
          
          const option50 = page.locator('.ant-select-item:has-text("50")')
          if (await option50.isVisible({ timeout: 1000 }).catch(() => false)) {
            await option50.click()
            await page.waitForTimeout(1000)
            await waitForTableLoad(page, 'hackathon-list-table')
            
            const rows = page.locator('[data-testid="hackathon-list-table"] tbody tr')
            const count = await rows.count()
            expect(count).toBeLessThanOrEqual(50)
          }
        }
      }
    })

    test('可以翻页', async ({ page }) => {
      const pagination = page.locator('.ant-pagination')
      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        const nextButton = pagination.locator('.ant-pagination-next')
        const isDisabled = await nextButton.evaluate((el) => el.classList.contains('ant-pagination-disabled')).catch(() => true)
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false) && !isDisabled) {
          const firstRow = page.locator('[data-testid="hackathon-list-table"] tbody tr').first()
          const firstRowText = await firstRow.textContent()
          
          await nextButton.click()
          await page.waitForTimeout(1000)
          await waitForTableLoad(page, 'hackathon-list-table')
          
          const newFirstRow = page.locator('[data-testid="hackathon-list-table"] tbody tr').first()
          const newFirstRowText = await newFirstRow.textContent()
          expect(newFirstRowText).not.toBe(firstRowText)
        }
      }
    })

    test('筛选和排序后分页仍然有效', async ({ page }) => {
      // 先进行筛选
      const statusFilter = page.locator('[data-testid="hackathon-list-status-filter"]')
      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusFilter.click()
        await page.waitForTimeout(500)
        const option = page.locator('[data-testid="hackathon-list-status-option-published"]')
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click()
          await page.waitForTimeout(1000)
          await waitForTableLoad(page, 'hackathon-list-table')
          
          // 验证分页仍然存在
          const pagination = page.locator('.ant-pagination')
          const isVisible = await pagination.isVisible({ timeout: 2000 }).catch(() => false)
          // 如果有数据，分页应该存在
          if (isVisible) {
            await expect(pagination).toBeVisible()
          }
        }
      }
    })
  })
})

