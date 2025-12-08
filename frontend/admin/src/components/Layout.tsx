import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Button } from 'antd'
import { useAuthStore } from '../store/authStore'
import {
  UserOutlined,
  TrophyOutlined,
  LogoutOutlined,
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

  const menuItems = [
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

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#001529',
          color: '#fff',
        }}
      >
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
          Hackathon Admin Platform
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{user?.name}</span>
          <Button type="link" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出
          </Button>
        </div>
      </Header>
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

