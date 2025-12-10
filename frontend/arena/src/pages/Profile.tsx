import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Space, message, Spin } from 'antd'
import { WalletOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

export default function Profile() {
  const navigate = useNavigate()
  const { walletAddress, clearAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!walletAddress) {
      message.error('请先登录')
      navigate('/')
    }
  }, [walletAddress, navigate])

  const handleDisconnect = () => {
    clearAuth()
    message.success('已断开连接')
    navigate('/')
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="page-content" data-testid="profile-page">
      <div className="page-container" style={{ maxWidth: '800px' }} data-testid="profile-container">
        <div className="page-header" data-testid="profile-header">
          <h1 className="page-title" data-testid="profile-title">
            <UserOutlined style={{ marginRight: '8px', color: 'var(--primary-color)' }} />
            个人中心
          </h1>
        </div>

        <Card data-testid="profile-info-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }} data-testid="profile-info-content">
          <div data-testid="profile-address-section">
            <div 
              style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}
              data-testid="profile-address-label"
            >
              钱包地址
            </div>
            <div
              style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '16px',
                wordBreak: 'break-all',
              }}
              data-testid="profile-address"
              aria-label={`钱包地址: ${walletAddress}`}
            >
              {walletAddress}
            </div>
          </div>

          <div data-testid="profile-actions">
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleDisconnect}
              block
              data-testid="profile-disconnect-button"
              aria-label="断开钱包连接"
            >
              断开连接
            </Button>
          </div>
        </Space>
        </Card>
      </div>
    </div>
  )
}

