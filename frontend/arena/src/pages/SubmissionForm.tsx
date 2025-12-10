import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Space, message } from 'antd'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import request from '../api/request'

export default function SubmissionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      await request.post(`/hackathons/${id}/submissions`, {
        ...values,
        draft: false,
      })
      message.success('提交成功')
      navigate(`/hackathons/${id}`)
    } catch (error: any) {
      message.error(error.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }} data-testid="submission-form-page">
      <Card title="提交作品" data-testid="submission-form-card">
        <Form form={form} onFinish={handleSubmit} layout="vertical" data-testid="submission-form">
          <Form.Item
            name="name"
            label="作品名称"
            rules={[{ required: true, message: '请输入作品名称' }]}
            data-testid="submission-form-name-item"
          >
            <Input 
              data-testid="submission-form-name-input"
              aria-label="作品名称输入框"
              placeholder="请输入作品名称"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="作品描述"
            rules={[{ required: true, message: '请输入作品描述' }]}
            data-testid="submission-form-description-item"
          >
            <div data-testid="submission-form-description-editor" aria-label="作品描述编辑器">
              <ReactQuill theme="snow" />
            </div>
          </Form.Item>
          <Form.Item
            name="link"
            label="作品链接"
            rules={[
              { required: true, message: '请输入作品链接' },
              { type: 'url', message: '请输入有效的URL' },
            ]}
            data-testid="submission-form-link-item"
          >
            <Input 
              placeholder="https://github.com/xxx"
              data-testid="submission-form-link-input"
              aria-label="作品链接输入框"
            />
          </Form.Item>
          <Form.Item data-testid="submission-form-actions">
            <Space data-testid="submission-form-buttons">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                data-testid="submission-form-submit-button"
                aria-label="提交作品"
              >
                提交
              </Button>
              <Button 
                onClick={() => navigate(`/hackathons/${id}`)}
                data-testid="submission-form-cancel-button"
                aria-label="取消提交"
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

