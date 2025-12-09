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
  Row,
  Col,
  Statistic,
  Table,
  Tabs,
  Timeline,
} from 'antd'
import {
  EditOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import request from '../api/request'
import { useAuthStore } from '../store/authStore'
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
  const [stats, setStats] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const [hackathonData, statsData, stagesData] = await Promise.all([
        request.get(`/hackathons/${id}`),
        request.get(`/hackathons/${id}/stats`),
        request.get(`/hackathons/${id}/stages`),
      ])
      setHackathon(hackathonData)
      setStats(statsData)
      setStages(stagesData || [])
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

  const isCreator = hackathon?.organizer_id === user?.id
  const canEdit = isCreator && hackathon?.status === 'preparation'
  const canManageStages = isCreator

  const stageLabels: Record<string, string> = {
    registration: '报名阶段',
    checkin: '签到阶段',
    team_formation: '组队阶段',
    submission: '提交阶段',
    voting: '投票阶段',
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }} data-testid="hackathon-detail-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (!hackathon) {
    return <div data-testid="hackathon-detail-empty">加载中...</div>
  }

  const statusInfo = statusMap[hackathon.status] || {
    label: hackathon.status,
    color: 'default',
  }
  const nextStage = getNextStage()

  return (
    <div className="page-container" data-testid="hackathon-detail-page">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }} data-testid="hackathon-detail-title">
            {hackathon.name}
          </div>
        }
        extra={
          <Space data-testid="hackathon-detail-actions">
            {canEdit && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/hackathons/${id}/edit`)}
                  data-testid="hackathon-detail-edit-button"
                  aria-label="编辑活动"
                >
                  编辑
                </Button>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={handlePublish}
                  data-testid="hackathon-detail-publish-button"
                  aria-label="发布活动"
                >
                  发布活动
                </Button>
              </>
            )}
            {canManageStages && (
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate(`/hackathons/${id}/stages`)}
                data-testid="hackathon-detail-stages-button"
                aria-label="阶段管理"
              >
                阶段管理
              </Button>
            )}
          </Space>
        }
        data-testid="hackathon-detail-card"
      >
        <Descriptions column={2} bordered data-testid="hackathon-detail-descriptions">
          <Descriptions.Item label="状态" data-testid="hackathon-detail-status">
            <Tag color={statusInfo.color} style={{ fontSize: '14px' }} data-testid="hackathon-detail-status-tag">
              {statusInfo.label}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间" data-testid="hackathon-detail-start-time">
            {dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间" data-testid="hackathon-detail-end-time">
            {dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="地点类型" data-testid="hackathon-detail-location-type">
            {hackathon.location_type === 'online'
              ? '线上'
              : hackathon.location_type === 'offline'
              ? '线下'
              : '混合'}
          </Descriptions.Item>
          {hackathon.location_detail && (
            <Descriptions.Item label="具体地址" span={2} data-testid="hackathon-detail-location-detail">
              {hackathon.location_detail}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="描述" span={2} data-testid="hackathon-detail-description">
            <div
              dangerouslySetInnerHTML={{ __html: hackathon.description }}
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '12px',
                background: '#fafafa',
                borderRadius: '8px',
              }}
              data-testid="hackathon-detail-description-content"
            />
          </Descriptions.Item>
        </Descriptions>

        {/* 统计信息 */}
        <Divider orientation="left" style={{ marginTop: '32px' }} data-testid="hackathon-detail-stats-divider">
          <span style={{ fontSize: '16px', fontWeight: 600 }}>统计信息</span>
        </Divider>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }} data-testid="hackathon-detail-stats">
          <Col xs={12} sm={8} lg={6}>
            <Card data-testid="hackathon-detail-stat-registration">
              <Statistic
                title="报名人数"
                value={stats?.registration_count || 0}
                prefix={<UserOutlined />}
                data-testid="hackathon-detail-stat-registration-value"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <Card data-testid="hackathon-detail-stat-checkin">
              <Statistic
                title="签到人数"
                value={stats?.checkin_count || 0}
                prefix={<UserOutlined />}
                data-testid="hackathon-detail-stat-checkin-value"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <Card data-testid="hackathon-detail-stat-team">
              <Statistic
                title="队伍数量"
                value={stats?.team_count || 0}
                prefix={<TeamOutlined />}
                data-testid="hackathon-detail-stat-team-value"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <Card data-testid="hackathon-detail-stat-submission">
              <Statistic
                title="作品数量"
                value={stats?.submission_count || 0}
                prefix={<FileTextOutlined />}
                data-testid="hackathon-detail-stat-submission-value"
              />
            </Card>
          </Col>
        </Row>

        {/* 阶段时间轴 */}
        {stages.length > 0 && (
          <>
            <Divider orientation="left" style={{ marginTop: '32px' }} data-testid="hackathon-detail-timeline-divider">
              <span style={{ fontSize: '16px', fontWeight: 600 }}>阶段时间轴</span>
            </Divider>
            <Card style={{ marginTop: '16px' }} data-testid="hackathon-detail-timeline-card">
              <Timeline data-testid="hackathon-detail-timeline">
                {stages.map((stage) => (
                  <Timeline.Item
                    key={stage.stage}
                    color={hackathon.status === stage.stage ? 'green' : 'blue'}
                    data-testid={`hackathon-detail-timeline-item-${stage.stage}`}
                  >
                    <div>
                      <strong>{stageLabels[stage.stage] || stage.stage}</strong>
                      <div style={{ marginTop: '8px', color: '#8c8c8c' }}>
                        {dayjs(stage.start_time).format('YYYY-MM-DD HH:mm')} -{' '}
                        {dayjs(stage.end_time).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </>
        )}

        {/* 阶段切换 */}
        {nextStage && canManageStages && (
          <>
            <Divider orientation="left" style={{ marginTop: '32px' }} data-testid="hackathon-detail-stage-switch-divider">
              <span style={{ fontSize: '16px', fontWeight: 600 }}>阶段切换</span>
            </Divider>
            <div style={{ marginTop: '16px' }} data-testid="hackathon-detail-stage-switch">
              <Space>
                <span style={{ color: '#8c8c8c' }}>当前阶段：</span>
                <Tag color={statusInfo.color} data-testid="hackathon-detail-current-stage-tag">{statusInfo.label}</Tag>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ color: '#8c8c8c' }}>下一阶段：</span>
                <Tag color={statusMap[nextStage.to]?.color || 'default'} data-testid="hackathon-detail-next-stage-tag">
                  {nextStage.label}
                </Tag>
                <Button
                  type="primary"
                  onClick={() => handleSwitchStage(nextStage.to)}
                  style={{ marginLeft: '16px' }}
                  data-testid="hackathon-detail-switch-stage-button"
                  aria-label={`切换到 ${nextStage.label}`}
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

