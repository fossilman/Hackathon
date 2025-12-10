import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Space, message, Alert, Descriptions, Tag } from 'antd'
import request from '../api/request'
import { useAuthStore } from '../store/authStore'

export default function SubmissionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { participantId } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [userTeam, setUserTeam] = useState<any>(null)
  const [existingSubmission, setExistingSubmission] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (id && participantId) {
      checkPermission()
    } else {
      setChecking(false)
    }
  }, [id, participantId])

  const checkPermission = async () => {
    try {
      setChecking(true)
      // 获取用户队伍信息
      const team = await request.get(`/hackathons/${id}/teams/my-team`)
      setUserTeam(team)

      // 检查是否已有提交
      try {
        const submissions = await request.get(`/hackathons/${id}/submissions`)
        const submissionList = Array.isArray(submissions) ? submissions : (submissions.list || [])
        const teamSubmission = submissionList.find((s: any) => s.team_id === team?.id)
        if (teamSubmission) {
          setExistingSubmission(teamSubmission)
          // 如果已有提交，填充表单
          form.setFieldsValue({
            name: teamSubmission.name,
            description: teamSubmission.description,
            link: teamSubmission.link,
          })
        }
      } catch (error) {
        // 没有提交，忽略错误
      }
    } catch (error) {
      message.error('获取队伍信息失败')
    } finally {
      setChecking(false)
    }
  }

  const isLeader = userTeam?.leader_id === participantId || 
                   userTeam?.members?.some((m: any) => m.participant_id === participantId && m.role === 'leader')
  const canSubmit = isLeader && !existingSubmission // 只有队长可以初次提交

  const handleSubmit = async (values: any) => {
    if (!canSubmit && !existingSubmission) {
      message.error('只有队长可以初次提交作品')
      return
    }

    setLoading(true)
    try {
      if (existingSubmission) {
        // 更新已有提交
        await request.put(`/submissions/${existingSubmission.id}`, {
          ...values,
          draft: 0, // 0-已提交，1-草稿
        })
        message.success('更新成功')
      } else {
        // 创建新提交
        await request.post(`/hackathons/${id}/submissions`, {
          ...values,
          draft: 0, // 0-已提交，1-草稿
        })
        message.success('提交成功')
      }
      navigate(`/hackathons/${id}`)
    } catch (error: any) {
      message.error(error.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="page-content" data-testid="submission-form-page">
        <div className="page-container" style={{ maxWidth: '800px' }} data-testid="submission-form-container">
          <Card data-testid="submission-form-card">加载中...</Card>
        </div>
      </div>
    )
  }

  if (!userTeam) {
    return (
      <div className="page-content" data-testid="submission-form-page">
        <div className="page-container" style={{ maxWidth: '800px' }} data-testid="submission-form-container">
          <Card data-testid="submission-form-card">
            <Alert
              message="您还没有加入队伍"
              description="请先加入或创建一个队伍后再提交作品"
              type="warning"
              showIcon
              action={
                <Button size="small" onClick={() => navigate(`/hackathons/${id}/teams`)}>
                  前往组队
                </Button>
              }
            />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" data-testid="submission-form-page">
      <div className="page-container" style={{ maxWidth: '800px' }} data-testid="submission-form-container">
        <div className="page-header" data-testid="submission-form-header">
          <h2 className="page-title" data-testid="submission-form-title">
            {existingSubmission ? '修改作品' : '提交作品'}
          </h2>
        </div>
        <Card data-testid="submission-form-card">
        {!canSubmit && !existingSubmission && (
          <Alert
            message="只有队长可以初次提交作品"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {existingSubmission && (
          <Card 
            type="inner" 
            title="当前提交内容" 
            style={{ marginBottom: 16 }}
            data-testid="submission-form-current-submission"
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="作品名称">
                <span data-testid="submission-form-current-name">{existingSubmission.name}</span>
              </Descriptions.Item>
              <Descriptions.Item label="作品描述">
                <div 
                  data-testid="submission-form-current-description"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {existingSubmission.description}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="作品链接">
                <a 
                  href={existingSubmission.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="submission-form-current-link"
                >
                  {existingSubmission.link}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                <span data-testid="submission-form-current-time">
                  {new Date(existingSubmission.created_at).toLocaleString('zh-CN')}
                </span>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <Tag color="blue" data-testid="submission-form-current-status">已提交</Tag>
              <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                队长和队员都可以修改提交内容
              </span>
            </div>
          </Card>
        )}
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
            <Input.TextArea 
              rows={6}
              data-testid="submission-form-description-input"
              aria-label="作品描述输入框"
              placeholder="请输入作品描述"
            />
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
                disabled={!canSubmit && !existingSubmission}
                data-testid="submission-form-submit-button"
                aria-label={existingSubmission ? "更新作品" : "提交作品"}
              >
                {existingSubmission ? '更新' : '提交'}
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
    </div>
  )
}

