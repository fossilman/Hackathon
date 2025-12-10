import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Space, message } from 'antd'
import { UserOutlined, WalletOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import request from '../api/request'

export default function Profile() {
  const navigate = useNavigate()
  const { walletAddress, participant, setParticipant } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!walletAddress) {
      message.error('请先登录')
      navigate('/')
      return
    }
    fetchProfile()
  }, [walletAddress, navigate])

  const fetchProfile = async () => {
    try {
      setFetching(true)
      const data = await request.get('/profile')
      form.setFieldsValue({
        nickname: data.nickname || '',
      })
      setParticipant(data)
    } catch (error) {
      message.error('获取个人信息失败')
    } finally {
      setFetching(false)
    }
  }

  const handleUpdate = async (values: any) => {
    setLoading(true)
    try {
      await request.patch('/profile', values)
      message.success('更新成功')
      const updatedParticipant = { ...participant, ...values } as any
      setParticipant(updatedParticipant)
    } catch (error: any) {
      message.error(error.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="page-content" data-testid="profile-page">
      <div className="page-container" style={{ maxWidth: '800px' }} data-testid="profile-container">
        <div className="page-header" data-testid="profile-header">
          <h1 className="page-title" data-testid="profile-title">
            <UserOutlined style={{ marginRight: '8px', color: 'var(--primary-color)' }} />
            个人中心
          </h1>
        </div>

        <Card data-testid="profile-info-card" loading={fetching}>
        <Form 
          form={form} 
          onFinish={handleUpdate} 
          layout="vertical" 
          data-testid="profile-form"
        >
          <Form.Item
            name="nickname"
            label="用户昵称"
            rules={[{ max: 50, message: '昵称长度不能超过50个字符' }]}
            data-testid="profile-nickname-item"
          >
            <Input 
              placeholder="请输入用户昵称（可选）"
              prefix={<UserOutlined />}
              data-testid="profile-nickname-input"
              aria-label="用户昵称输入框"
            />
          </Form.Item>

          <Form.Item label="钱包地址" data-testid="profile-address-item">
            <Input 
              value={walletAddress}
              disabled
              prefix={<WalletOutlined />}
              data-testid="profile-address-input"
              aria-label="钱包地址"
            />
          </Form.Item>

          <Form.Item data-testid="profile-actions">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              data-testid="profile-update-button"
              aria-label="更新个人信息"
            >
              更新
            </Button>
          </Form.Item>
        </Form>
        </Card>
      </div>
    </div>
  )
}

