import { useState } from 'react'
import { Form, Input, Button, Card, message, Tabs, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState('phone')

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true)
    try {
      const data = await login(values)
      setAuth(data.token, data.user)
      message.success(t('login.loginSuccess'))
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
      message.error(error?.response?.data?.message || t('login.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const [walletForm] = Form.useForm()

  const handleWalletLogin = async (values: { phone: string }) => {
    if (!window.ethereum) {
      message.error(t('login.installMetamask'))
      return
    }

    setWalletLoading(true)
    try {
      // 请求连接钱包
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const walletAddress = accounts[0]

      if (!walletAddress) {
        message.error(t('login.noWalletAddress'))
        return
      }

      // 生成签名消息
      const signMessage = `${t('login.signMessage')}\n\nWallet Address: ${walletAddress}\nPhone: ${values.phone}\nTimestamp: ${Date.now()}`
      
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
      message.success(t('login.loginSuccess'))
      // 根据角色跳转到不同页面
      if (data.user.role === 'sponsor') {
        navigate('/profile', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      if (error?.code === 4001) {
        message.error(t('login.signRejected'))
      } else {
        message.error(error?.response?.data?.message || t('login.walletLoginFailed'))
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
              label: t('login.phoneLogin'),
              children: (
                <Form 
                  onFinish={onFinish} 
                  layout="vertical" 
                  size="large"
                  data-testid="login-form"
                >
                  <Form.Item
                    name="phone"
                    label={t('login.phone')}
                    rules={[
                      { required: true, message: t('login.phoneRequired') },
                      { pattern: /^1[3-9]\d{9}$/, message: t('login.phoneInvalid') },
                    ]}
                  >
                    <Input 
                      placeholder={t('login.phonePlaceholder')} 
                      data-testid="login-phone-input"
                      aria-label={t('login.phone')}
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label={t('login.password')}
                    rules={[{ required: true, message: t('login.passwordRequired') }]}
                  >
                    <Input.Password 
                      placeholder={t('login.passwordPlaceholder')} 
                      data-testid="login-password-input"
                      aria-label={t('login.password')}
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
                      aria-label={t('login.submit')}
                    >
                      {t('login.submit')}
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'wallet',
              label: t('login.walletLogin'),
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
                    label={t('login.phone')}
                    rules={[
                      { required: true, message: t('login.phoneRequired') },
                      { pattern: /^1[3-9]\d{9}$/, message: t('login.phoneInvalid') },
                    ]}
                  >
                    <Input 
                      placeholder={t('login.phonePlaceholder')} 
                      data-testid="login-wallet-phone-input"
                      aria-label={t('login.phone')}
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={walletLoading}
                      data-testid="login-wallet-button"
                      aria-label={t('login.walletSubmit')}
                      style={{ width: '100%' }}
                    >
                      {t('login.walletSubmit')}
                    </Button>
                  </Form.Item>
                  <div style={{ marginTop: '16px', color: '#999', fontSize: '12px', textAlign: 'center' }}>
                    {t('login.walletTip')}
                  </div>
                </Form>
              ),
            },
            {
              key: 'sponsor',
              label: t('login.sponsorApply'),
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Alert
                    message={t('sponsor.applyTitle')}
                    description={t('sponsor.applyDescription')}
                    type="info"
                    showIcon
                    style={{ marginBottom: '24px' }}
                    data-testid="sponsor-apply-alert"
                  />
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => navigate('/sponsor/apply')}
                    data-testid="sponsor-apply-button"
                    aria-label="前往赞助商申请页面"
                  >
                    {t('sponsor.goToApply')}
                  </Button>
                  <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>{t('login.applyProcess')}</div>
                    <ol style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                      <li>{t('login.applyStep1')}</li>
                      <li>{t('login.applyStep2')}</li>
                      <li>{t('login.applyStep3')}</li>
                      <li>{t('login.applyStep4')}</li>
                    </ol>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

