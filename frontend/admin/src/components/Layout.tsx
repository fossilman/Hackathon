import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { useAuthStore } from '../store/authStore'
import {
  UserOutlined,
  TrophyOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Header, Content, Sider } = AntLayout

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: '/hackathons',
      icon: <TrophyOutlined />,
      label: '活动管理',
    },
  ]

  if (user?.role === 'admin') {
    menuItems.unshift({
      key: '/users',
      icon: <UserOutlined />,
      label: '人员管理',
    })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人设置',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
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
      >
        <div
          style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          🏆 Hackathon Admin Platform
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>{user?.name}</span>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              style={{ color: '#fff' }}
            >
              退出
            </Button>
          </Dropdown>
        </div>
      </Header>
      <AntLayout>
        <Sider
          width={220}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              height: '100%',
              borderRight: 0,
              paddingTop: '16px',
            }}
          />
        </Sider>
        <Content
          style={{
            padding: '24px',
            background: '#f5f7fa',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

