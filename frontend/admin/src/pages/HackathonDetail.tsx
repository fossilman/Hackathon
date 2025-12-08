import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, message, Tag } from 'antd'
import request from '../api/request'
import dayjs from 'dayjs'

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hackathon, setHackathon] = useState<any>(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const data = await request.get(`/hackathons/${id}`)
      setHackathon(data)
    } catch (error) {
      message.error('获取活动详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchDetail()
    }
  }, [id])

  const handlePublish = async () => {
    try {
      await request.post(`/hackathons/${id}/publish`)
      message.success('发布成功')
      fetchDetail()
    } catch (error) {
      message.error('发布失败')
    }
  }

  const handleSwitchStage = async (stage: string) => {
    try {
      await request.post(`/hackathons/${id}/stages/${stage}/switch`)
      message.success('切换阶段成功')
      fetchDetail()
    } catch (error) {
      message.error('切换阶段失败')
    }
  }

  const statusMap: Record<string, string> = {
    preparation: '预备',
    published: '发布',
    registration: '报名',
    checkin: '签到',
    team_formation: '组队',
    submission: '提交',
    voting: '投票',
    results: '公布结果',
  }

  if (!hackathon) {
    return <div>加载中...</div>
  }

  return (
    <div>
      <Card
        title={hackathon.name}
        extra={
          <Space>
            {hackathon.status === 'preparation' && (
              <>
                <Button onClick={() => navigate(`/hackathons/${id}/edit`)}>
                  编辑
                </Button>
                <Button type="primary" onClick={handlePublish}>
                  发布
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="状态">
            <Tag>{statusMap[hackathon.status] || hackathon.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="地点类型">
            {hackathon.location_type}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            <div dangerouslySetInnerHTML={{ __html: hackathon.description }} />
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 24 }}>
          <h3>阶段管理</h3>
          <Space wrap>
            {hackathon.status === 'preparation' && (
              <Button onClick={() => handleSwitchStage('published')}>
                切换到发布
              </Button>
            )}
            {hackathon.status === 'published' && (
              <Button onClick={() => handleSwitchStage('registration')}>
                切换到报名
              </Button>
            )}
            {hackathon.status === 'registration' && (
              <Button onClick={() => handleSwitchStage('checkin')}>
                切换到签到
              </Button>
            )}
            {hackathon.status === 'checkin' && (
              <Button onClick={() => handleSwitchStage('team_formation')}>
                切换到组队
              </Button>
            )}
            {hackathon.status === 'team_formation' && (
              <Button onClick={() => handleSwitchStage('submission')}>
                切换到提交
              </Button>
            )}
            {hackathon.status === 'submission' && (
              <Button onClick={() => handleSwitchStage('voting')}>
                切换到投票
              </Button>
            )}
            {hackathon.status === 'voting' && (
              <Button onClick={() => handleSwitchStage('results')}>
                切换到公布结果
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

