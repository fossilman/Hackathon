import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button, Space, Avatar, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { TrophyOutlined, WalletOutlined, LogoutOutlined, UserOutlined, AppstoreOutlined, HistoryOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { getUserDisplayName } from '../utils/userDisplay'
import LanguageSwitcher from './LanguageSwitcher'
import { ethers } from 'ethers'
import { message } from 'antd'
import request from '../api/request'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'

const { Header, Content } = AntLayout

export default function Layout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { walletAddress, token, participant, connectWallet, setParticipant, clearAuth } = useAuthStore()
  const [sponsors, setSponsors] = useState<any[]>([])

  // 获取长期赞助商
  useEffect(() => {
    const fetchLongTermSponsors = async () => {
      try {
        const data = await request.get('/sponsors/long-term')
        setSponsors(data || [])
      } catch (error) {
        // 忽略错误
      }
    }
    fetchLongTermSponsors()
  }, [])

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
        
        message.success(t('common.connected'))
      } catch (error: any) {
        message.error(error.message || t('common.error'))
      }
    } else {
      message.error(t('common.pleaseInstallMetamask'))
    }
  }

  const handleLogout = () => {
    clearAuth()
    message.success(t('common.disconnected'))
    navigate('/')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      danger: true,
      onClick: handleLogout,
      'data-testid': 'arena-menu-logout',
    },
  ]

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
          <LanguageSwitcher />
          {walletAddress ? (
            <Space>
              {/* 菜单顺序：我的活动，活动集锦，个人中心 */}
              <Button
                type="text"
                icon={<AppstoreOutlined />}
                style={{ color: '#fff' }}
                onClick={() => navigate('/my-hackathons')}
                data-testid="nav-my-hackathons"
                aria-label={t('nav.myHackathons')}
              >
                {t('nav.myHackathons')}
              </Button>
              <Button
                type="text"
                icon={<HistoryOutlined />}
                style={{ color: '#fff' }}
                onClick={() => navigate('/hackathons/archive')}
                data-testid="nav-archive"
                aria-label={t('nav.archive')}
              >
                {t('nav.archive')}
              </Button>
              {/* 合并个人中心和用户名显示 */}
              <Button
                type="text"
                style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => navigate('/profile')}
                data-testid="nav-profile"
                aria-label={t('nav.profile')}
              >
                <Avatar
                  size="small"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                  }}
                  icon={<UserOutlined />}
                  data-testid="arena-user-avatar"
                />
                <span>{getUserDisplayName(participant, walletAddress)}</span>
              </Button>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button
                  type="text"
                  icon={<LogoutOutlined />}
                  style={{ color: '#fff' }}
                  data-testid="arena-user-menu-button"
                  aria-label={t('nav.userMenu')}
                >
                  {t('nav.logout')}
                </Button>
              </Dropdown>
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
              aria-label={t('common.connectWallet')}
            >
              {t('common.connectWallet')}
            </Button>
          )}
        </div>
      </Header>
      <Content
        style={{
          background: '#f5f7fa',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        data-testid="arena-content"
      >
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        
        {/* 长期赞助商展示 - 在所有页面底部，透明容器，仅显示Logo */}
        {sponsors.length > 0 && (
          <div style={{ 
            padding: '24px', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            background: 'transparent'
          }}>
            {sponsors.map((sponsor) => (
              <img
                key={sponsor.id}
                src={sponsor.logo_url}
                alt={sponsor.user?.name || 'Sponsor'}
                style={{ 
                  height: '60px', 
                  maxWidth: '200px', 
                  objectFit: 'contain',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  // 可以添加跳转逻辑
                }}
              />
            ))}
          </div>
        )}
      </Content>
    </AntLayout>
  )
}

