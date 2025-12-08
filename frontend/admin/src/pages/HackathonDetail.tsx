import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Button,
  Space,
  message,
  Tag,
  Spin,
  Divider,
} from 'antd'
import {
  EditOutlined,
  RocketOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import request from '../api/request'
import dayjs from 'dayjs'

const statusMap: Record<string, { label: string; color: string }> = {
  preparation: { label: '预备', color: 'default' },
  published: { label: '发布', color: 'blue' },
  registration: { label: '报名', color: 'cyan' },
  checkin: { label: '签到', color: 'orange' },
  team_formation: { label: '组队', color: 'purple' },
  submission: { label: '提交', color: 'geekblue' },
  voting: { label: '投票', color: 'magenta' },
  results: { label: '公布结果', color: 'green' },
}

const stageFlow = [
  { from: 'preparation', to: 'published', label: '发布' },
  { from: 'published', to: 'registration', label: '报名' },
  { from: 'registration', to: 'checkin', label: '签到' },
  { from: 'checkin', to: 'team_formation', label: '组队' },
  { from: 'team_formation', to: 'submission', label: '提交' },
  { from: 'submission', to: 'voting', label: '投票' },
  { from: 'voting', to: 'results', label: '公布结果' },
]

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hackathon, setHackathon] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

  const getNextStage = () => {
    return stageFlow.find((flow) => flow.from === hackathon?.status)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!hackathon) {
    return <div>加载中...</div>
  }

  const statusInfo = statusMap[hackathon.status] || {
    label: hackathon.status,
    color: 'default',
  }
  const nextStage = getNextStage()

  return (
    <div className="page-container">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {hackathon.name}
          </div>
        }
        extra={
          hackathon.status === 'preparation' && (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/hackathons/${id}/edit`)}
              >
                编辑
              </Button>
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={handlePublish}
              >
                发布活动
              </Button>
            </Space>
          )
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="状态">
            <Tag color={statusInfo.color} style={{ fontSize: '14px' }}>
              {statusInfo.label}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="地点类型">
            {hackathon.location_type === 'online'
              ? '线上'
              : hackathon.location_type === 'offline'
              ? '线下'
              : '混合'}
          </Descriptions.Item>
          {hackathon.location_detail && (
            <Descriptions.Item label="具体地址" span={2}>
              {hackathon.location_detail}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="描述" span={2}>
            <div
              dangerouslySetInnerHTML={{ __html: hackathon.description }}
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '12px',
                background: '#fafafa',
                borderRadius: '8px',
              }}
            />
          </Descriptions.Item>
        </Descriptions>

        {nextStage && (
          <>
            <Divider orientation="left" style={{ marginTop: '32px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>阶段管理</span>
            </Divider>
            <div style={{ marginTop: '16px' }}>
              <Space>
                <span style={{ color: '#8c8c8c' }}>当前阶段：</span>
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ color: '#8c8c8c' }}>下一阶段：</span>
                <Tag color={statusMap[nextStage.to]?.color || 'default'}>
                  {nextStage.label}
                </Tag>
                <Button
                  type="primary"
                  onClick={() => handleSwitchStage(nextStage.to)}
                  style={{ marginLeft: '16px' }}
                >
                  切换到 {nextStage.label}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

