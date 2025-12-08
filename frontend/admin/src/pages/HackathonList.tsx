import { useState, useEffect } from 'react'
import { Table, Button, Select, Space, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined } from '@ant-design/icons'
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

export default function HackathonList() {
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const fetchHackathons = async () => {
    setLoading(true)
    try {
      const data = await request.get('/hackathons', {
        params: { page: 1, page_size: 100, status },
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
  }, [status])

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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '活动名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => statusMap[status] || status,
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Hackathon) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/hackathons/${record.id}`)}>
            查看
          </Button>
          {record.status === 'preparation' && (
            <Button
              type="link"
              onClick={() => navigate(`/hackathons/${record.id}/edit`)}
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 200 }}
            value={status}
            onChange={setStatus}
          >
            {Object.entries(statusMap).map(([key, value]) => (
              <Select.Option key={key} value={key}>
                {value}
              </Select.Option>
            ))}
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/hackathons/create')}>
          创建活动
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={hackathons}
        loading={loading}
        rowKey="id"
      />
    </div>
  )
}

