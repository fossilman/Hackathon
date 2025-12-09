import { Space, Button } from 'antd'
import { ButtonProps } from 'antd/es/button'

interface FormActionsProps {
  submitLabel?: string
  cancelLabel?: string
  onSubmit?: () => void
  onCancel?: () => void
  loading?: boolean
  submitButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  testId?: string
}

/**
 * 可复用的表单操作按钮组组件
 * 统一了表单提交和取消按钮的样式和行为
 */
export default function FormActions({
  submitLabel = '保存',
  cancelLabel = '取消',
  onSubmit,
  onCancel,
  loading = false,
  submitButtonProps,
  cancelButtonProps,
  testId = 'form-actions',
}: FormActionsProps) {
  return (
    <Space data-testid={testId}>
      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        size="large"
        onClick={onSubmit}
        data-testid={`${testId}-submit-button`}
        aria-label={submitLabel}
        {...submitButtonProps}
      >
        {submitLabel}
      </Button>
      <Button
        onClick={onCancel}
        size="large"
        data-testid={`${testId}-cancel-button`}
        aria-label={cancelLabel}
        {...cancelButtonProps}
      >
        {cancelLabel}
      </Button>
    </Space>
  )
}

