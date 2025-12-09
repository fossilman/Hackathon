import { ReactNode } from 'react'
import { Space } from 'antd'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
  testId?: string
}

/**
 * 可复用的页面头部组件
 * 统一了页面标题和操作按钮的布局
 */
export default function PageHeader({ title, actions, testId = 'page-header' }: PageHeaderProps) {
  return (
    <div className="page-header" data-testid={testId}>
      <h2 className="page-title" data-testid={`${testId}-title`}>
        {title}
      </h2>
      {actions && (
        <div data-testid={`${testId}-actions`}>
          {actions}
        </div>
      )}
    </div>
  )
}

