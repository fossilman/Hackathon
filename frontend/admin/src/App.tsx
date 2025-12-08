import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Login from './pages/Login'
import Layout from './components/Layout'
import UserManagement from './pages/UserManagement'
import HackathonList from './pages/HackathonList'
import HackathonDetail from './pages/HackathonDetail'
import HackathonCreate from './pages/HackathonCreate'
import { useAuthStore } from './store/authStore'

function App() {
  const { token } = useAuthStore()

  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={token ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/hackathons" />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="hackathons" element={<HackathonList />} />
          <Route path="hackathons/create" element={<HackathonCreate />} />
          <Route path="hackathons/:id" element={<HackathonDetail />} />
          <Route path="hackathons/:id/edit" element={<HackathonCreate />} />
        </Route>
      </Routes>
    </ConfigProvider>
  )
}

export default App

