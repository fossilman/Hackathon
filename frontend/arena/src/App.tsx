import { Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Home from './pages/Home'
import HackathonDetail from './pages/HackathonDetail'
import TeamList from './pages/TeamList'
import SubmissionForm from './pages/SubmissionForm'
import SubmissionList from './pages/SubmissionList'
import Results from './pages/Results'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hackathons/:id" element={<HackathonDetail />} />
        <Route path="/hackathons/:id/teams" element={<TeamList />} />
        <Route path="/hackathons/:id/submit" element={<SubmissionForm />} />
        <Route path="/hackathons/:id/submissions" element={<SubmissionList />} />
        <Route path="/hackathons/:id/results" element={<Results />} />
      </Routes>
    </ConfigProvider>
  )
}

export default App

