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
} from 'antd'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import request from '../api/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function HackathonCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
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
      })
    } catch (error) {
      message.error('获取活动详情失败')
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const [startTime, endTime] = values.timeRange
      const payload = {
        ...values,
        start_time: startTime.format('YYYY-MM-DD HH:mm:ss'),
        end_time: endTime.format('YYYY-MM-DD HH:mm:ss'),
        timeRange: undefined,
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
            <div data-testid="hackathon-create-form-description-editor">
              <ReactQuill
                theme="snow"
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                }}
                data-testid="hackathon-create-form-description-quill"
              />
            </div>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="timeRange"
                label="活动时间"
                rules={[{ required: true, message: '请选择活动时间' }]}
              >
                <RangePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location_detail" label="具体地址">
                <Input 
                  placeholder="请输入具体地址（可选）" 
                  data-testid="hackathon-create-form-location-detail-input"
                  aria-label="具体地址输入框"
                />
              </Form.Item>
            </Col>
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
          </Row>

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

