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
    <div className="page-container">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {isEdit ? '编辑活动' : '创建活动'}
          </div>
        }
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          initialValues={{ location_type: 'online', max_team_size: 3 }}
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <ReactQuill
              theme="snow"
              style={{
                background: '#fff',
                borderRadius: '8px',
              }}
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
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location_type"
                label="地点类型"
                rules={[{ required: true, message: '请选择地点类型' }]}
              >
                <Select placeholder="请选择地点类型">
                  <Select.Option value="online">线上</Select.Option>
                  <Select.Option value="offline">线下</Select.Option>
                  <Select.Option value="hybrid">混合</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location_detail" label="具体地址">
                <Input placeholder="请输入具体地址（可选）" />
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
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/hackathons')} size="large">
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

