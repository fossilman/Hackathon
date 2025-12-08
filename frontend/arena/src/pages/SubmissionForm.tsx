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
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="提交作品">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="作品名称"
            rules={[{ required: true, message: '请输入作品名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="作品描述"
            rules={[{ required: true, message: '请输入作品描述' }]}
          >
            <ReactQuill theme="snow" />
          </Form.Item>
          <Form.Item
            name="link"
            label="作品链接"
            rules={[
              { required: true, message: '请输入作品链接' },
              { type: 'url', message: '请输入有效的URL' },
            ]}
          >
            <Input placeholder="https://github.com/xxx" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(`/hackathons/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

