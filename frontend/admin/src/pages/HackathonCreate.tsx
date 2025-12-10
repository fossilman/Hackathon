import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Card,
  message,
  Space,
  InputNumber,
  Row,
  Col,
  Table,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import request from '../api/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// 城市列表
const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆',
  '天津', '苏州', '长沙', '郑州', '青岛', '大连', '厦门', '福州', '济南', '合肥',
  '石家庄', '太原', '哈尔滨', '长春', '沈阳', '南昌', '昆明', '贵阳', '南宁', '海口',
  '乌鲁木齐', '拉萨', '银川', '西宁', '呼和浩特'
]

interface Award {
  name: string
  prize: string
  quantity: number
  rank: number
}

export default function HackathonCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [locationType, setLocationType] = useState('online')
  const [awards, setAwards] = useState<Award[]>([
    { name: '一等奖', prize: '1000USD', quantity: 1, rank: 1 },
    { name: '二等奖', prize: '500USD', quantity: 2, rank: 2 },
    { name: '三等奖', prize: '200USD', quantity: 3, rank: 3 },
  ])
  const isEdit = !!id

  useEffect(() => {
    if (isEdit && id) {
      fetchDetail()
    }
  }, [id, isEdit])

  const fetchDetail = async () => {
    try {
      const data = await request.get(`/hackathons/${id}`)
      form.setFieldsValue({
        ...data,
        timeRange: [dayjs(data.start_time), dayjs(data.end_time)],
        max_participants: data.max_participants || 0,
      })
      setLocationType(data.location_type || 'online')
      if (data.awards && data.awards.length > 0) {
        setAwards(data.awards)
      }
    } catch (error) {
      message.error('获取活动详情失败')
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const [startTime, endTime] = values.timeRange
      // 使用 RFC3339 格式：YYYY-MM-DDTHH:mm:ssZ
      const payload = {
        ...values,
        start_time: startTime.format('YYYY-MM-DD') + 'T00:00:00Z',
        end_time: endTime.format('YYYY-MM-DD') + 'T23:59:59Z',
        timeRange: undefined,
        awards: awards,
      }

      if (isEdit) {
        await request.put(`/hackathons/${id}`, payload)
        message.success('更新成功')
      } else {
        await request.post('/hackathons', payload)
        message.success('创建成功')
      }
      navigate('/hackathons')
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAward = () => {
    const newRank = awards.length > 0 ? Math.max(...awards.map(a => a.rank)) + 1 : 1
    setAwards([...awards, { name: '', prize: '', quantity: 1, rank: newRank }])
  }

  const handleRemoveAward = (index: number) => {
    setAwards(awards.filter((_, i) => i !== index))
  }

  const handleAwardChange = (index: number, field: keyof Award, value: any) => {
    const newAwards = [...awards]
    newAwards[index] = { ...newAwards[index], [field]: value }
    setAwards(newAwards)
  }

  return (
    <div className="page-container" data-testid="hackathon-create-page">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }} data-testid="hackathon-create-title">
            {isEdit ? '编辑活动' : '创建活动'}
          </div>
        }
        data-testid="hackathon-create-card"
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          initialValues={{ location_type: 'online', max_team_size: 3 }}
          data-testid="hackathon-create-form"
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input 
              placeholder="请输入活动名称" 
              data-testid="hackathon-create-form-name-input"
              aria-label="活动名称输入框"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <Input.TextArea 
              rows={4}
              placeholder="请输入活动描述"
              data-testid="hackathon-create-form-description-input"
              aria-label="活动描述输入框"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="timeRange"
                label="活动时间"
                rules={[{ required: true, message: '请选择活动时间' }]}
              >
                <RangePicker
                  format="YYYY-MM-DD"
                  style={{ width: '100%' }}
                  data-testid="hackathon-create-form-time-range-picker"
                  aria-label="活动时间选择器"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location_type"
                label="地点类型"
                rules={[{ required: true, message: '请选择地点类型' }]}
              >
                <Select 
                  placeholder="请选择地点类型"
                  onChange={(value) => setLocationType(value)}
                  data-testid="hackathon-create-form-location-type-select"
                  aria-label="地点类型选择框"
                >
                  <Select.Option value="online" data-testid="hackathon-create-form-location-online">线上</Select.Option>
                  <Select.Option value="offline" data-testid="hackathon-create-form-location-offline">线下</Select.Option>
                  <Select.Option value="hybrid" data-testid="hackathon-create-form-location-hybrid">混合</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {(locationType === 'offline' || locationType === 'hybrid') && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="city"
                  label="城市"
                  rules={[{ required: true, message: '请选择城市' }]}
                >
                  <Select 
                    placeholder="请选择城市"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={CITIES.map(city => ({ label: city, value: city }))}
                    data-testid="hackathon-create-form-city-select"
                    aria-label="城市选择框"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="location_detail"
                  label="具体地址"
                  rules={[{ required: true, message: '请输入具体地址' }]}
                >
                  <Input 
                    placeholder="请输入具体地址" 
                    data-testid="hackathon-create-form-location-detail-input"
                    aria-label="具体地址输入框"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {(locationType === 'offline' || locationType === 'hybrid') && (
            <Form.Item
              name="map_location"
              label="地图位置"
              tooltip="点击地图选择位置（可选）"
            >
              <div 
                id="map-container"
                style={{ 
                  width: '100%', 
                  height: '400px', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999'
                }}
                data-testid="hackathon-create-form-map-container"
              >
                地图组件（待集成）
              </div>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="max_team_size"
                label="队伍最大成员数"
                rules={[
                  { required: true, message: '请输入队伍最大成员数' },
                  { type: 'number', min: 1, message: '至少1人' },
                ]}
              >
                <InputNumber
                  min={1}
                  max={20}
                  placeholder="请输入队伍最大成员数"
                  style={{ width: '100%' }}
                  data-testid="hackathon-create-form-max-team-size-input"
                  aria-label="队伍最大成员数输入框"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_participants"
                label="最大参与人数"
                tooltip="0表示不限制人数"
                rules={[
                  { type: 'number', min: 0, message: '最大参与人数不能小于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入最大参与人数（0表示不限制）"
                  min={0}
                  data-testid="hackathon-create-form-max-participants-input"
                  aria-label="最大参与人数输入框"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="奖项设置">
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddAward}
                style={{ width: '100%' }}
                data-testid="hackathon-create-form-add-award-button"
              >
                添加奖项
              </Button>
            </div>
            <Table
              dataSource={awards}
              rowKey={(record, index) => `award-${index}`}
              pagination={false}
              columns={[
                {
                  title: '奖项名称',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text, record, index) => (
                    <Input
                      value={text}
                      onChange={(e) => handleAwardChange(index, 'name', e.target.value)}
                      placeholder="如：一等奖"
                    />
                  ),
                },
                {
                  title: '奖项金额',
                  dataIndex: 'prize',
                  key: 'prize',
                  render: (text, record, index) => (
                    <Input
                      value={text}
                      onChange={(e) => handleAwardChange(index, 'prize', e.target.value)}
                      placeholder="如：1000USD"
                    />
                  ),
                },
                {
                  title: '数量',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 100,
                  render: (text, record, index) => (
                    <InputNumber
                      value={text}
                      onChange={(value) => handleAwardChange(index, 'quantity', value || 1)}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  ),
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 80,
                  render: (_, record, index) => (
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveAward(index)}
                    >
                      删除
                    </Button>
                  ),
                },
              ]}
              data-testid="hackathon-create-form-awards-table"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
            <Space data-testid="hackathon-create-form-actions">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                size="large"
                data-testid="hackathon-create-form-submit-button"
                aria-label={isEdit ? '更新活动按钮' : '创建活动按钮'}
              >
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button 
                onClick={() => navigate('/hackathons')} 
                size="large"
                data-testid="hackathon-create-form-cancel-button"
                aria-label="取消按钮"
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

