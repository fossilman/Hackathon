import { Space, Button } from 'antd'
import { ButtonProps } from 'antd/es/button'
import { useTranslation } from 'react-i18next'

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
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  loading = false,
  submitButtonProps,
  cancelButtonProps,
  testId = 'form-actions',
}: FormActionsProps) {
  const { t } = useTranslation()
  const finalSubmitLabel = submitLabel || t('common.save')
  const finalCancelLabel = cancelLabel || t('cancel')
  
  return (
    <Space data-testid={testId}>
      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        size="large"
        onClick={onSubmit}
        data-testid={`${testId}-submit-button`}
        aria-label={finalSubmitLabel}
        {...submitButtonProps}
      >
        {finalSubmitLabel}
      </Button>
      <Button
        onClick={onCancel}
        size="large"
        data-testid={`${testId}-cancel-button`}
        aria-label={finalCancelLabel}
        {...cancelButtonProps}
      >
        {finalCancelLabel}
      </Button>
    </Space>
  )
}

