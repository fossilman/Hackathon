import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  message,
  Spin,
} from 'antd'
import {
  TrophyOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
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

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [dashboard, setDashboard] = useState<any>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const data = await request.get('/dashboard')
      setDashboard(data)
    } catch (error) {
      message.error('获取仪表盘数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }} data-testid="dashboard-loading">
        <Spin size="large" />
      </div>
    )
  }

  const recentColumns = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusInfo = statusMap[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div className="page-container" data-testid="dashboard-page">
      <h2 
        style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}
        data-testid="dashboard-title"
      >
        仪表盘
      </h2>

      {/* 系统概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }} data-testid="dashboard-overview">
        <Col xs={24} sm={12} lg={6}>
          <Card data-testid="dashboard-stat-total-hackathons">
            <Statistic
              title="活动总数"
              value={dashboard.system_overview?.total_hackathons || 0}
              prefix={<TrophyOutlined />}
              data-testid="dashboard-stat-total-hackathons-value"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card data-testid="dashboard-stat-active-hackathons">
            <Statistic
              title="进行中活动"
              value={dashboard.system_overview?.active_hackathons || 0}
              prefix={<TrophyOutlined />}
              data-testid="dashboard-stat-active-hackathons-value"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card data-testid="dashboard-stat-total-users">
            <Statistic
              title="总用户数"
              value={dashboard.system_overview?.total_users || 0}
              prefix={<UserOutlined />}
              data-testid="dashboard-stat-total-users-value"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card data-testid="dashboard-stat-total-participants">
            <Statistic
              title="参赛者数"
              value={dashboard.system_overview?.total_participants || 0}
              prefix={<TeamOutlined />}
              data-testid="dashboard-stat-total-participants-value"
            />
          </Card>
        </Col>
      </Row>

      {/* 人员统计（仅Admin） */}
      {user?.role === 'admin' && dashboard.user_stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }} data-testid="dashboard-user-stats">
          <Col xs={24} sm={12} lg={12}>
            <Card data-testid="dashboard-stat-organizers">
              <Statistic
                title="主办方人数"
                value={dashboard.user_stats.total_organizers || 0}
                prefix={<UserOutlined />}
                data-testid="dashboard-stat-organizers-value"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Card data-testid="dashboard-stat-sponsors">
              <Statistic
                title="赞助商人数"
                value={dashboard.user_stats.total_sponsors || 0}
                prefix={<UserOutlined />}
                data-testid="dashboard-stat-sponsors-value"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 活动状态统计 */}
      <Card 
        title="活动状态统计" 
        style={{ marginBottom: '24px' }}
        data-testid="dashboard-status-stats"
      >
        <Row gutter={[16, 16]}>
          {Object.entries(dashboard.hackathon_stats?.by_status || {}).map(
            ([status, count]) => {
              const statusInfo = statusMap[status] || { label: status, color: 'default' }
              return (
                <Col xs={12} sm={8} lg={6} key={status}>
                  <Card size="small" data-testid={`dashboard-status-stat-${status}`}>
                    <Statistic
                      title={statusInfo.label}
                      value={count as number}
                      valueStyle={{ fontSize: '20px' }}
                      data-testid={`dashboard-status-stat-${status}-value`}
                    />
                  </Card>
                </Col>
              )
            }
          )}
        </Row>
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动" data-testid="dashboard-recent-hackathons">
        <Table
          columns={recentColumns}
          dataSource={dashboard.hackathon_stats?.recent || []}
          rowKey="id"
          pagination={false}
          size="small"
          data-testid="dashboard-recent-hackathons-table"
        />
      </Card>
    </div>
  )
}

