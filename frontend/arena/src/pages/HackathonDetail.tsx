import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, message, Tag, Descriptions } from 'antd'
import { useAuthStore } from '../store/authStore'
import request from '../api/request'
import dayjs from 'dayjs'

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [hackathon, setHackathon] = useState<any>(null)
  const [registered, setRegistered] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)

  useEffect(() => {
    if (id) {
      fetchDetail()
      if (token) {
        checkStatus()
      }
    }
  }, [id, token])

  const fetchDetail = async () => {
    try {
      const data = await request.get(`/hackathons/${id}`)
      setHackathon(data)
    } catch (error) {
      message.error('获取活动详情失败')
    }
  }

  const checkStatus = async () => {
    try {
      const regStatus = await request.get(`/hackathons/${id}/registration-status`)
      setRegistered(regStatus.registered)
      const checkinStatus = await request.get(`/hackathons/${id}/checkin-status`)
      setCheckedIn(checkinStatus.checked_in)
    } catch (error) {
      // 忽略错误
    }
  }

  const handleRegister = async () => {
    try {
      await request.post(`/hackathons/${id}/register`)
      message.success('报名成功')
      setRegistered(true)
    } catch (error: any) {
      message.error(error.message || '报名失败')
    }
  }

  const handleCheckin = async () => {
    try {
      await request.post(`/hackathons/${id}/checkin`)
      message.success('签到成功')
      setCheckedIn(true)
    } catch (error: any) {
      message.error(error.message || '签到失败')
    }
  }

  if (!hackathon) {
    return <div>加载中...</div>
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={hackathon.name}
        extra={<Tag>{statusMap[hackathon.status] || hackathon.status}</Tag>}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="开始时间">
            {dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            <div dangerouslySetInnerHTML={{ __html: hackathon.description }} />
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24 }}>
          {!token && (
            <Button type="primary" onClick={() => message.info('请先连接钱包')}>
              连接钱包
            </Button>
          )}
          {token && hackathon.status === 'registration' && !registered && (
            <Button type="primary" onClick={handleRegister}>
              报名
            </Button>
          )}
          {token && hackathon.status === 'checkin' && registered && !checkedIn && (
            <Button type="primary" onClick={handleCheckin}>
              签到
            </Button>
          )}
          {token && hackathon.status === 'team_formation' && checkedIn && (
            <Button type="primary" onClick={() => navigate(`/hackathons/${id}/teams`)}>
              组队
            </Button>
          )}
          {token && hackathon.status === 'submission' && (
            <Space>
              <Button onClick={() => navigate(`/hackathons/${id}/submit`)}>
                提交作品
              </Button>
            </Space>
          )}
          {hackathon.status === 'voting' && (
            <Button onClick={() => navigate(`/hackathons/${id}/submissions`)}>
              查看作品并投票
            </Button>
          )}
          {hackathon.status === 'results' && (
            <Button onClick={() => navigate(`/hackathons/${id}/results`)}>
              查看结果
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

