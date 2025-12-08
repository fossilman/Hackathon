import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import HackathonList from './pages/HackathonList'
import HackathonDetail from './pages/HackathonDetail'
import HackathonCreate from './pages/HackathonCreate'
import HackathonStages from './pages/HackathonStages'
import Profile from './pages/Profile'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'

// 首页重定向组件
function IndexRedirect() {
  const { user } = useAuthStore()
  if (user?.role === 'sponsor') {
    return <Navigate to="/profile" replace />
  }
  return <Navigate to="/dashboard" replace />
}

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
          <Route
            index
            element={<IndexRedirect />}
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="hackathons"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer']}>
                <HackathonList />
              </ProtectedRoute>
            }
          />
          <Route
            path="hackathons/create"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <HackathonCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="hackathons/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer']}>
                <HackathonDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="hackathons/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <HackathonCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="hackathons/:id/stages"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <HackathonStages />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer', 'sponsor']}>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </ConfigProvider>
  )
}

export default App

