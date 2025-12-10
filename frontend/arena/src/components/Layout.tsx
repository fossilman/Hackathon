import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button, Space, Avatar, Menu } from 'antd'
import { TrophyOutlined, WalletOutlined, LogoutOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { getUserDisplayName } from '../utils/userDisplay'
import { ethers } from 'ethers'
import { message } from 'antd'
import request from '../api/request'

const { Header, Content } = AntLayout

export default function Layout() {
  const navigate = useNavigate()
  const { walletAddress, token, participant, connectWallet, setParticipant, clearAuth } = useAuthStore()

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
        const { token: authToken, participant: participantData } = await request.post('/auth/verify', {
          wallet_address: address,
          signature,
        })

        connectWallet(address, authToken, participantData.id, participantData)
        
        // 获取完整的 participant 信息（包括 nickname）
        try {
          const fullParticipant = await request.get('/profile')
          setParticipant(fullParticipant)
        } catch (error) {
          // 如果获取失败，使用基本信息
          console.warn('获取完整用户信息失败，使用基本信息')
        }
        
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
            Hackathon Arena Platform
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
                icon={<UserOutlined />}
                data-testid="arena-user-avatar"
                aria-label="用户头像"
              />
              <span style={{ fontSize: '14px', opacity: 0.9 }} data-testid="arena-user-name">
                {getUserDisplayName(participant, walletAddress)}
              </span>
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

