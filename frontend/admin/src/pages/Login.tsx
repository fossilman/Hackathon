import { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import '../index.css'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const data = await login(values)
      setAuth(data.token, data.user)
      message.success('登录成功')
      // 根据角色跳转到不同页面
      if (data.user.role === 'sponsor') {
        navigate('/profile', { replace: true })
      } else {
        // 直接跳转到 dashboard，而不是通过 IndexRedirect
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      message.error('登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" data-testid="login-page">
      <Card
        title={
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 600 }}>
            🏆 Hackathon Admin Platform
          </div>
        }
        className="login-card"
        data-testid="login-card"
      >
        <Form 
          onFinish={onFinish} 
          layout="vertical" 
          size="large"
          data-testid="login-form"
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input 
              placeholder="请输入邮箱" 
              data-testid="login-email-input"
              aria-label="邮箱输入框"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              placeholder="请输入密码" 
              data-testid="login-password-input"
              aria-label="密码输入框"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading} 
              size="large"
              data-testid="login-submit-button"
              aria-label="登录按钮"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

