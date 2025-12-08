import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Divider,
  Modal,
} from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import request from '../api/request'
import { useAuthStore } from '../store/authStore'

export default function Profile() {
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const { user, setAuth } = useAuthStore()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await request.get('/profile')
      form.setFieldsValue(data)
    } catch (error) {
      message.error('获取个人信息失败')
    }
  }

  const handleUpdateProfile = async (values: any) => {
    setLoading(true)
    try {
      await request.patch('/profile', values)
      message.success('更新成功')
      // 更新store中的用户信息
      const token = useAuthStore.getState().token
      if (user && token) {
        const updatedUser = { ...user, ...values }
        setAuth(token, updatedUser)
      }
      fetchProfile()
    } catch (error) {
      message.error('更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (values: any) => {
    setLoading(true)
    try {
      await request.post('/profile/change-password', values)
      message.success('密码修改成功')
      setPasswordModalVisible(false)
      passwordForm.resetFields()
    } catch (error) {
      message.error('密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            <UserOutlined /> 个人中心
          </div>
        }
      >
        <Form
          form={form}
          onFinish={handleUpdateProfile}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="邮箱" disabled />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
          >
            <Input placeholder="角色" disabled />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => setPasswordModalVisible(true)}
              >
                修改密码
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false)
          passwordForm.resetFields()
        }}
        onOk={() => passwordForm.submit()}
        width={500}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          onFinish={handleChangePassword}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="old_password"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少8位）" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

