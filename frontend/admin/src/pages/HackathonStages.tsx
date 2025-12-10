import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  DatePicker,
  Button,
  message,
  Space,
  Row,
  Col,
  Timeline,
  Alert,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import request from '../api/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const stageOptions = [
  { value: 'registration', label: '报名阶段' },
  { value: 'checkin', label: '签到阶段' },
  { value: 'team_formation', label: '组队阶段' },
  { value: 'submission', label: '提交阶段' },
  { value: 'voting', label: '投票阶段' },
]

export default function HackathonStages() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [hackathon, setHackathon] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const fetchData = async () => {
    try {
      const [hackathonData, stagesData] = await Promise.all([
        request.get(`/hackathons/${id}`),
        request.get(`/hackathons/${id}/stages`),
      ])
      setHackathon(hackathonData)
      
      // 设置表单初始值
      const initialValues: any = {}
      stagesData.forEach((stage: any) => {
        initialValues[stage.stage] = [
          dayjs(stage.start_time),
          dayjs(stage.end_time),
        ]
      })
      form.setFieldsValue(initialValues)
      setStages(stagesData)
    } catch (error) {
      message.error('获取数据失败')
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const stagesData = stageOptions.map((option) => {
        const range = values[option.value]
        if (!range || !range[0] || !range[1]) {
          return null
        }
        // 使用 RFC3339 格式：YYYY-MM-DDTHH:mm:ssZ
        return {
          stage: option.value,
          start_time: range[0].toISOString(),
          end_time: range[1].toISOString(),
        }
      }).filter(Boolean)

      await request.put(`/hackathons/${id}/stages`, { stages: stagesData })
      message.success('保存成功')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" data-testid="hackathon-stages-page">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }} data-testid="hackathon-stages-title">
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/hackathons/${id}`)}
                data-testid="hackathon-stages-back-button"
                aria-label="返回"
              >
                返回
              </Button>
              <span>阶段时间管理 - {hackathon?.name}</span>
            </Space>
          </div>
        }
        data-testid="hackathon-stages-card"
      >
        {hackathon && (
          <Alert
            message={`活动时间：${dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')} - ${dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}`}
            type="info"
            style={{ marginBottom: '24px' }}
            data-testid="hackathon-stages-alert"
          />
        )}

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          data-testid="hackathon-stages-form"
        >
          <Row gutter={[16, 16]}>
            {stageOptions.map((option) => (
              <Col xs={24} sm={12} lg={12} key={option.value}>
                <Form.Item
                  name={option.value}
                  label={option.label}
                  rules={[
                    { required: true, message: `请设置${option.label}时间` },
                  ]}
                >
                  <RangePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                    placeholder={['开始时间', '结束时间']}
                    data-testid={`hackathon-stages-form-${option.value}-picker`}
                    aria-label={`${option.label}时间选择器`}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item style={{ marginTop: '24px' }}>
            <Space data-testid="hackathon-stages-form-actions">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
                data-testid="hackathon-stages-form-submit-button"
                aria-label="保存"
              >
                保存
              </Button>
              <Button 
                onClick={() => navigate(`/hackathons/${id}`)} 
                size="large"
                data-testid="hackathon-stages-form-cancel-button"
                aria-label="取消"
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 时间轴预览 */}
        {stages.length > 0 && (
          <div style={{ marginTop: '32px' }} data-testid="hackathon-stages-timeline">
            <h3 style={{ marginBottom: '16px' }}>时间轴预览</h3>
            <Timeline data-testid="hackathon-stages-timeline-list">
              {stages
                .sort((a, b) =>
                  dayjs(a.start_time).isBefore(dayjs(b.start_time)) ? -1 : 1
                )
                .map((stage) => {
                  const option = stageOptions.find(
                    (opt) => opt.value === stage.stage
                  )
                  return (
                    <Timeline.Item 
                      key={stage.stage} 
                      color="blue"
                      data-testid={`hackathon-stages-timeline-item-${stage.stage}`}
                    >
                      <div>
                        <strong>{option?.label || stage.stage}</strong>
                        <div style={{ marginTop: '8px', color: '#8c8c8c' }}>
                          {dayjs(stage.start_time).format('YYYY-MM-DD HH:mm')} -{' '}
                          {dayjs(stage.end_time).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    </Timeline.Item>
                  )
                })}
            </Timeline>
          </div>
        )}
      </Card>
    </div>
  )
}

