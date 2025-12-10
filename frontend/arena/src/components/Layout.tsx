import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button, Space, Avatar, Menu } from 'antd'
import { TrophyOutlined, WalletOutlined, LogoutOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { ethers } from 'ethers'
import { message } from 'antd'
import request from '../api/request'

const { Header, Content } = AntLayout

export default function Layout() {
  const navigate = useNavigate()
  const { walletAddress, token, connectWallet, clearAuth } = useAuthStore()

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_requestAccounts', [])
        const address = accounts[0]
        
        // 获取nonce
        const { nonce } = await request.post('/auth/connect', {
          wallet_address: address,
        })

        // 签名
        const signer = await provider.getSigner()
        const messageText = `Please sign this message to authenticate: ${nonce}`
        const signature = await signer.signMessage(messageText)

        // 验证签名
        const { token: authToken, participant } = await request.post('/auth/verify', {
          wallet_address: address,
          signature,
        })

        connectWallet(address, authToken, participant.id)
        message.success('连接成功')
      } catch (error: any) {
        message.error(error.message || '连接失败')
      }
    } else {
      message.error('请安装Metamask')
    }
  }

  const handleDisconnect = () => {
    clearAuth()
    message.success('已断开连接')
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }} data-testid="arena-layout">
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
        data-testid="arena-header"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
          data-testid="arena-header-title"
        >
          <TrophyOutlined style={{ fontSize: '24px' }} />
          <span
            style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            Hackathon Arena
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} data-testid="arena-header-actions">
          {walletAddress ? (
            <Space>
              <Button
                type="text"
                icon={<AppstoreOutlined />}
                style={{ color: '#fff' }}
                onClick={() => navigate('/my-hackathons')}
                data-testid="nav-my-hackathons"
                aria-label="我的活动"
              >
                我的活动
              </Button>
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ color: '#fff' }}
                onClick={() => navigate('/profile')}
                data-testid="nav-profile"
                aria-label="个人中心"
              >
                个人中心
              </Button>
              <Avatar
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                }}
                icon={<WalletOutlined />}
                data-testid="arena-wallet-avatar"
                aria-label="钱包头像"
              />
              <span style={{ fontSize: '14px', opacity: 0.9 }} data-testid="arena-wallet-address">
                {formatAddress(walletAddress)}
              </span>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                style={{ color: '#fff' }}
                onClick={handleDisconnect}
                data-testid="arena-disconnect-button"
                aria-label="断开连接"
              >
                断开
              </Button>
            </Space>
          ) : (
            <Button
              type="primary"
              icon={<WalletOutlined />}
              onClick={handleConnectWallet}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#fff',
              }}
              data-testid="arena-connect-button"
              aria-label="连接钱包"
            >
              连接钱包
            </Button>
          )}
        </div>
      </Header>
      <Content
        style={{
          background: '#f5f7fa',
          minHeight: 'calc(100vh - 64px)',
        }}
        data-testid="arena-content"
      >
        <Outlet />
      </Content>
    </AntLayout>
  )
}

