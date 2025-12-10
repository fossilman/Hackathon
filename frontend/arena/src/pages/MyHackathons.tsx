import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space, message, Tag, Empty, Spin } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import request from '../api/request'
import HackathonCard from '../components/HackathonCard'

interface Hackathon {
  id: number
  name: string
  description: string
  status: string
  start_time: string
  end_time: string
}

export default function MyHackathons() {
  const navigate = useNavigate()
  const { token, walletAddress } = useAuthStore()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      message.error('请先登录')
      navigate('/')
      return
    }
    fetchHackathons()
  }, [token, navigate])

  const fetchHackathons = async () => {
    setLoading(true)
    try {
      const data = await request.get('/my-hackathons', {
        params: { page: 1, page_size: 100 },
      })
      setHackathons(data.list || [])
    } catch (error) {
      message.error('获取我的活动失败')
    } finally {
      setLoading(false)
    }
  }

  const statusMap: Record<string, string> = {
    published: '发布',
    registration: '报名',
    checkin: '签到',
    team_formation: '组队',
    submission: '提交',
    voting: '投票',
    results: '公布结果',
  }

  const statusColorMap: Record<string, string> = {
    published: 'default',
    registration: 'blue',
    checkin: 'cyan',
    team_formation: 'purple',
    submission: 'orange',
    voting: 'green',
    results: 'red',
  }

  if (!token) {
    return null
  }

  return (
    <div className="page-content" data-testid="my-hackathons-page">
      <div className="page-header" data-testid="my-hackathons-header">
        <h1 className="page-title" data-testid="my-hackathons-title" style={{ fontSize: '28px' }}>
          <TrophyOutlined style={{ marginRight: 8, color: 'var(--primary-color)' }} />
          我的活动
        </h1>
      </div>

      <Spin spinning={loading}>
        {hackathons.length === 0 ? (
          <div className="page-container">
            <Empty
              description="您还没有报名任何活动"
              data-testid="my-hackathons-empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                onClick={() => navigate('/')}
                data-testid="my-hackathons-empty-browse-button"
                aria-label="去浏览活动"
              >
                去浏览活动
              </Button>
            </Empty>
          </div>
        ) : (
          <div 
            className="grid-container"
            data-testid="my-hackathons-list"
          >
            {hackathons.map((hackathon) => (
              <HackathonCard
                key={hackathon.id}
                hackathon={hackathon}
                statusMap={statusMap}
                statusColorMap={statusColorMap}
                testIdPrefix="my-hackathons"
                showDateIcon={true}
              />
            ))}
          </div>
        )}
      </Spin>
    </div>
  )
}

