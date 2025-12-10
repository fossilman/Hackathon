import { useState } from 'react'
import { Form, Input, Button, Card, message, Tabs } from 'antd'
import { useNavigate } from 'react-router-dom'
import { login, loginWithWallet } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import '../index.css'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: any[] }) => Promise<any>
    }
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState('phone')

  const onFinish = async (values: { phone: string; password: string }) => {
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
      // 等待导航完成
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      message.error(error?.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const [walletForm] = Form.useForm()

  const handleWalletLogin = async (values: { phone: string }) => {
    if (!window.ethereum) {
      message.error('请安装 MetaMask 钱包')
      return
    }

    setWalletLoading(true)
    try {
      // 请求连接钱包
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const walletAddress = accounts[0]

      if (!walletAddress) {
        message.error('未获取到钱包地址')
        return
      }

      // 生成签名消息
      const signMessage = `请签名以登录 Hackathon Admin Platform\n\n钱包地址: ${walletAddress}\n手机号: ${values.phone}\n时间戳: ${Date.now()}`
      
      // 请求签名
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [signMessage, walletAddress],
      })

      // 调用登录接口
      const data = await loginWithWallet({
        wallet_address: walletAddress,
        phone: values.phone,
        signature: signature,
      })

      setAuth(data.token, data.user)
      message.success('登录成功')
      // 根据角色跳转到不同页面
      if (data.user.role === 'sponsor') {
        navigate('/profile', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      if (error?.code === 4001) {
        message.error('用户拒绝了签名请求')
      } else {
        message.error(error?.response?.data?.message || '钱包登录失败')
      }
    } finally {
      setWalletLoading(false)
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'phone',
              label: '手机号登录',
              children: (
                <Form 
                  onFinish={onFinish} 
                  layout="vertical" 
                  size="large"
                  data-testid="login-form"
                >
                  <Form.Item
                    name="phone"
                    label="手机号"
                    rules={[
                      { required: true, message: '请输入手机号' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                    ]}
                  >
                    <Input 
                      placeholder="请输入手机号" 
                      data-testid="login-phone-input"
                      aria-label="手机号输入框"
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
              ),
            },
            {
              key: 'wallet',
              label: '钱包登录',
              children: (
                <Form
                  form={walletForm}
                  onFinish={handleWalletLogin}
                  layout="vertical"
                  size="large"
                  data-testid="login-wallet-form"
                >
                  <Form.Item
                    name="phone"
                    label="手机号"
                    rules={[
                      { required: true, message: '请输入手机号' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                    ]}
                  >
                    <Input 
                      placeholder="请输入手机号" 
                      data-testid="login-wallet-phone-input"
                      aria-label="手机号输入框"
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={walletLoading}
                      data-testid="login-wallet-button"
                      aria-label="钱包登录按钮"
                      style={{ width: '100%' }}
                    >
                      连接钱包登录
                    </Button>
                  </Form.Item>
                  <div style={{ marginTop: '16px', color: '#999', fontSize: '12px', textAlign: 'center' }}>
                    请确保已安装 MetaMask 钱包插件
                  </div>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

