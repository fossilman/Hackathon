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

  const menuItems: MenuProps['items'] = []

  // 根据角色显示不同的菜单
  if (user?.role === 'admin' || user?.role === 'organizer') {
    menuItems.push({
      key: '/dashboard',
      icon: <TrophyOutlined />,
      label: '仪表盘',
      'data-testid': 'admin-menu-dashboard',
    })
    menuItems.push({
      key: '/hackathons',
      icon: <TrophyOutlined />,
      label: '活动管理',
      'data-testid': 'admin-menu-hackathons',
    })
  }

  if (user?.role === 'admin') {
    menuItems.splice(1, 0, {
      key: '/users',
      icon: <UserOutlined />,
      label: '人员管理',
      'data-testid': 'admin-menu-users',
    })
  }

  // 赞助商第一期不显示菜单项（仅显示个人中心）
  if (user?.role === 'sponsor') {
    // 赞助商第一期功能待定，不显示菜单
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: () => navigate('/profile'),
      'data-testid': 'admin-menu-profile',
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
      'data-testid': 'admin-menu-logout',
    },
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }} data-testid="admin-layout">
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
        data-testid="admin-header"
      >
        <div
          style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
          data-testid="admin-header-title"
        >
          🏆 Hackathon Admin Platform
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} data-testid="admin-header-actions">
          <span style={{ fontSize: '14px', opacity: 0.9 }} data-testid="admin-user-name">{user?.name}</span>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              style={{ color: '#fff' }}
              data-testid="admin-user-menu-button"
              aria-label="用户菜单"
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
          data-testid="admin-sider"
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
            data-testid="admin-sidebar-menu"
          />
        </Sider>
        <Content
          style={{
            padding: '24px',
            background: '#f5f7fa',
            minHeight: 'calc(100vh - 64px)',
          }}
          data-testid="admin-content"
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

