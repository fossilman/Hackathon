import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Card,
  Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, UndoOutlined } from '@ant-design/icons'
import request from '../api/request'

interface User {
  id: number
  name: string
  role: string
  phone: string
  status: number // 1-启用，0-禁用
}

const roleMap: Record<string, { label: string; color: string }> = {
  organizer: { label: '主办方', color: 'blue' },
  sponsor: { label: '赞助商', color: 'green' },
  admin: { label: '管理员', color: 'red' },
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resettingUser, setResettingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
  })

  const fetchUsers = async (page = 1, pageSize = 100) => {
    setLoading(true)
    try {
      const data = await request.get('/users', {
        params: { page, page_size: pageSize, include_deleted: true },
      })
      setUsers(data.list || [])
      setPagination({
        current: page,
        pageSize: pageSize,
        total: data.pagination?.total || data.total || 0,
      })
    } catch (error) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchUsers(pagination.current, pagination.pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/users/${id}`)
      message.success('禁用成功')
      fetchUsers(pagination.current, pagination.pageSize)
    } catch (error) {
      message.error('禁用失败')
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await request.post(`/users/${id}/restore`)
      message.success('启用成功')
      fetchUsers(pagination.current, pagination.pageSize)
    } catch (error) {
      message.error('启用失败')
    }
  }

  const handleResetPassword = (user: User) => {
    setResettingUser(user)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handleResetPasswordSubmit = async (values: any) => {
    if (!resettingUser) return
    try {
      await request.post(`/users/${resettingUser.id}/reset-password`, {
        password: values.password,
      })
      message.success('密码重置成功')
      setPasswordModalVisible(false)
      passwordForm.resetFields()
    } catch (error) {
      message.error('密码重置失败')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        await request.patch(`/users/${editingUser.id}`, values)
        message.success('更新成功')
      } else {
        await request.post('/users', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      // 刷新表格，如果是新建用户，跳转到第一页以确保能看到新用户
      if (!editingUser) {
        await fetchUsers(1, pagination.pageSize)
      } else {
        await fetchUsers(pagination.current, pagination.pageSize)
      }
    } catch (error) {
      message.error(editingUser ? '更新失败' : '创建失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const roleInfo = roleMap[role] || { label: role, color: 'default' }
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
      },
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: User) => {
        if (record.status === 0) {
          return <Tag color="red">已禁用</Tag>
        }
        return <Tag color="green">正常</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: User) => {
        const isDisabled = record.status === 0
        return (
          <Space size="small" data-testid={`user-management-actions-${record.id}`} wrap>
            {!isDisabled && (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  size="small"
                  data-testid={`user-management-edit-button-${record.id}`}
                  aria-label={`编辑用户 ${record.name}`}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  icon={<LockOutlined />}
                  onClick={() => handleResetPassword(record)}
                  size="small"
                  data-testid={`user-management-reset-password-button-${record.id}`}
                  aria-label={`重置用户 ${record.name} 的密码`}
                >
                  重置密码
                </Button>
                <Popconfirm
                  title="确定要禁用这个用户吗？"
                  description="禁用后用户将无法登录"
                  onConfirm={() => handleDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                  data-testid={`user-management-delete-confirm-${record.id}`}
                >
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    data-testid={`user-management-delete-button-${record.id}`}
                    aria-label={`禁用用户 ${record.name}`}
                  >
                    禁用
                  </Button>
                </Popconfirm>
              </>
            )}
            {isDisabled && (
              <Button
                type="link"
                icon={<UndoOutlined />}
                onClick={() => handleRestore(record.id)}
                size="small"
                data-testid={`user-management-restore-button-${record.id}`}
                aria-label={`恢复用户 ${record.name}`}
              >
                启用
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div className="page-container" data-testid="user-management-page">
      <div className="page-header">
        <h2 className="page-title" data-testid="user-management-title">人员管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          size="large"
          data-testid="user-management-create-button"
          aria-label="添加用户"
        >
          添加用户
        </Button>
      </div>
      <Card data-testid="user-management-table-card">
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              fetchUsers(page, pageSize)
            },
            onShowSizeChange: (current, size) => {
              fetchUsers(1, size)
            },
          }}
          data-testid="user-management-table"
        />
      </Card>
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
        data-testid="user-management-form-modal"
        aria-label={editingUser ? '编辑用户对话框' : '添加用户对话框'}
      >
        <Form 
          form={form} 
          onFinish={handleSubmit} 
          layout="vertical" 
          size="large"
          data-testid="user-management-form"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input 
              placeholder="请输入姓名" 
              data-testid="user-management-form-name-input"
              aria-label="姓名输入框"
            />
          </Form.Item>
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
              disabled={!!editingUser}
              data-testid="user-management-form-phone-input"
              aria-label="手机号输入框"
            />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少8位' },
              ]}
            >
              <Input.Password 
                placeholder="请输入密码（至少8位）" 
                data-testid="user-management-form-password-input"
                aria-label="密码输入框"
              />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select 
              placeholder="请选择角色" 
              disabled={!!editingUser}
              data-testid="user-management-form-role-select"
              aria-label="角色选择框"
            >
              <Select.Option value="organizer" data-testid="user-management-form-role-organizer">主办方</Select.Option>
              <Select.Option value="sponsor" data-testid="user-management-form-role-sponsor">赞助商</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`重置密码 - ${resettingUser?.name}`}
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false)
          passwordForm.resetFields()
        }}
        onOk={() => passwordForm.submit()}
        width={500}
        destroyOnClose
        data-testid="user-management-reset-password-modal"
        aria-label="重置密码对话框"
      >
        <Form
          form={passwordForm}
          onFinish={handleResetPasswordSubmit}
          layout="vertical"
          size="large"
          data-testid="user-management-reset-password-form"
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8位' },
            ]}
          >
            <Input.Password 
              placeholder="请输入新密码（至少8位）" 
              data-testid="user-management-reset-password-input"
              aria-label="新密码输入框"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

