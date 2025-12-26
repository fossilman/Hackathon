import { Modal, Button, Alert, Descriptions, Spin, Space, Typography } from 'antd'
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import request from '../api/request'

const { Text } = Typography

interface GasEstimateData {
  gas_limit: number
  gas_price: string
  gas_price_gwei: string
  total_cost: string
  total_cost_eth: string
  user_balance: string
  user_balance_eth: string
  is_sufficient: boolean
  shortfall_eth: string
}

interface GasEstimateModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
  estimateUrl: string
  operationType: 'checkin' | 'vote' | 'revoke'
  loading?: boolean
}

export default function GasEstimateModal({
  visible,
  onCancel,
  onConfirm,
  estimateUrl,
  operationType,
  loading = false
}: GasEstimateModalProps) {
  const { t } = useTranslation()
  const [estimating, setEstimating] = useState(false)
  const [gasData, setGasData] = useState<GasEstimateData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      fetchGasEstimate()
    } else {
      // 重置状态
      setGasData(null)
      setError(null)
    }
  }, [visible, estimateUrl])

  const fetchGasEstimate = async () => {
    setEstimating(true)
    setError(null)
    try {
      const data = await request.get(estimateUrl)
      setGasData(data)
    } catch (err: any) {
      setError(err.message || t('gasEstimate.estimateFailed'))
    } finally {
      setEstimating(false)
    }
  }

  const getOperationTitle = () => {
    switch (operationType) {
      case 'checkin':
        return t('gasEstimate.checkinTitle')
      case 'vote':
        return t('gasEstimate.voteTitle')
      case 'revoke':
        return t('gasEstimate.revokeTitle')
      default:
        return t('gasEstimate.title')
    }
  }

  return (
    <Modal
      title={getOperationTitle()}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          loading={loading}
          disabled={!gasData || !gasData.is_sufficient || estimating}
        >
          {t('common.confirm')}
        </Button>
      ]}
      width={600}
    >
      {estimating && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">{t('gasEstimate.estimating')}</Text>
          </div>
        </div>
      )}

      {error && (
        <Alert
          message={t('gasEstimate.error')}
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {!estimating && gasData && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 余额充足提示 */}
          {gasData.is_sufficient ? (
            <Alert
              message={t('gasEstimate.sufficientBalance')}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          ) : (
            <Alert
              message={t('gasEstimate.insufficientBalance')}
              description={t('gasEstimate.needToRecharge', { amount: gasData.shortfall_eth })}
              type="error"
              showIcon
              icon={<WarningOutlined />}
            />
          )}

          {/* Gas 费详情 */}
          <Descriptions
            title={t('gasEstimate.details')}
            bordered
            column={1}
            size="small"
          >
            <Descriptions.Item label={t('gasEstimate.gasLimit')}>
              {gasData.gas_limit.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('gasEstimate.gasPrice')}>
              {gasData.gas_price_gwei} Gwei
            </Descriptions.Item>
            <Descriptions.Item label={t('gasEstimate.estimatedCost')}>
              <Text strong>{gasData.total_cost_eth} ETH</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('gasEstimate.yourBalance')}>
              <Text type={gasData.is_sufficient ? 'success' : 'danger'}>
                {gasData.user_balance_eth} ETH
              </Text>
            </Descriptions.Item>
          </Descriptions>

          {/* 温馨提示 */}
          <Alert
            message={t('gasEstimate.tips')}
            description={t('gasEstimate.tipsContent')}
            type="info"
            showIcon
          />
        </Space>
      )}
    </Modal>
  )
}
