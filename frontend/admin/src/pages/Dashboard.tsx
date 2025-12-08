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
      <div style={{ textAlign: 'center', padding: '50px' }}>
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
    <div className="page-container">
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
        仪表盘
      </h2>

      {/* 系统概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活动总数"
              value={dashboard.system_overview?.total_hackathons || 0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中活动"
              value={dashboard.system_overview?.active_hackathons || 0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={dashboard.system_overview?.total_users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="参赛者数"
              value={dashboard.system_overview?.total_participants || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 人员统计（仅Admin） */}
      {user?.role === 'admin' && dashboard.user_stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={12}>
            <Card>
              <Statistic
                title="主办方人数"
                value={dashboard.user_stats.total_organizers || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Card>
              <Statistic
                title="赞助商人数"
                value={dashboard.user_stats.total_sponsors || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 活动状态统计 */}
      <Card title="活动状态统计" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {Object.entries(dashboard.hackathon_stats?.by_status || {}).map(
            ([status, count]) => {
              const statusInfo = statusMap[status] || { label: status, color: 'default' }
              return (
                <Col xs={12} sm={8} lg={6} key={status}>
                  <Card size="small">
                    <Statistic
                      title={statusInfo.label}
                      value={count as number}
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Card>
                </Col>
              )
            }
          )}
        </Row>
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动">
        <Table
          columns={recentColumns}
          dataSource={dashboard.hackathon_stats?.recent || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

