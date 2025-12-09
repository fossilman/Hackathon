import { useState, useEffect } from 'react'
import { Table, Button, Select, Space, message, Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import request from '../api/request'
import dayjs from 'dayjs'

interface Hackathon {
  id: number
  name: string
  status: string
  start_time: string
  end_time: string
  created_at: string
}

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

export default function HackathonList() {
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created_at_desc')

  const fetchHackathons = async () => {
    setLoading(true)
    try {
      const data = await request.get('/hackathons', {
        params: { page: 1, page_size: 100, status, sort },
      })
      setHackathons(data.list || [])
    } catch (error) {
      message.error('获取活动列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHackathons()
  }, [status, sort])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusInfo = statusMap[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Hackathon) => (
        <Space size="small" data-testid={`hackathon-list-actions-${record.id}`}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/hackathons/${record.id}`)}
            size="small"
            data-testid={`hackathon-list-view-button-${record.id}`}
            aria-label={`查看活动 ${record.name}`}
          >
            查看
          </Button>
          {record.status === 'preparation' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/hackathons/${record.id}/edit`)}
              size="small"
              data-testid={`hackathon-list-edit-button-${record.id}`}
              aria-label={`编辑活动 ${record.name}`}
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container" data-testid="hackathon-list-page">
      <div className="page-header">
        <div>
          <h2 className="page-title" data-testid="hackathon-list-title">活动管理</h2>
          <Space style={{ marginTop: '8px' }} data-testid="hackathon-list-filters">
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 200 }}
              value={status}
              onChange={setStatus}
              data-testid="hackathon-list-status-filter"
              aria-label="筛选状态"
            >
              {Object.entries(statusMap).map(([key, value]) => (
                <Select.Option key={key} value={key} data-testid={`hackathon-list-status-option-${key}`}>
                  {value.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="排序方式"
              style={{ width: 200 }}
              value={sort}
              onChange={setSort}
              data-testid="hackathon-list-sort-filter"
              aria-label="排序方式"
            >
              <Select.Option value="created_at_desc" data-testid="hackathon-list-sort-created-desc">创建时间（降序）</Select.Option>
              <Select.Option value="created_at_asc" data-testid="hackathon-list-sort-created-asc">创建时间（升序）</Select.Option>
              <Select.Option value="start_time_desc" data-testid="hackathon-list-sort-start-desc">开始时间（降序）</Select.Option>
              <Select.Option value="start_time_asc" data-testid="hackathon-list-sort-start-asc">开始时间（升序）</Select.Option>
              <Select.Option value="end_time_desc" data-testid="hackathon-list-sort-end-desc">结束时间（降序）</Select.Option>
              <Select.Option value="end_time_asc" data-testid="hackathon-list-sort-end-asc">结束时间（升序）</Select.Option>
            </Select>
          </Space>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/hackathons/create')}
          size="large"
          data-testid="hackathon-list-create-button"
          aria-label="创建活动"
        >
          创建活动
        </Button>
      </div>
      <Card data-testid="hackathon-list-table-card">
        <Table
          columns={columns}
          dataSource={hackathons}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          data-testid="hackathon-list-table"
        />
      </Card>
    </div>
  )
}

