import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, List, Space, message, Modal, Input } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import request from '../api/request'

export default function TeamList() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<any[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    if (id) {
      fetchTeams()
    }
  }, [id])

  const fetchTeams = async () => {
    try {
      const data = await request.get(`/hackathons/${id}/teams`)
      setTeams(data.list || [])
    } catch (error) {
      message.error('获取队伍列表失败')
    }
  }

  const handleCreateTeam = async () => {
    try {
      await request.post(`/hackathons/${id}/teams`, {
        name: teamName,
        max_size: 3,
      })
      message.success('创建队伍成功')
      setModalVisible(false)
      setTeamName('')
      fetchTeams()
    } catch (error: any) {
      message.error(error.message || '创建队伍失败')
    }
  }

  const handleJoinTeam = async (teamId: number) => {
    try {
      await request.post(`/teams/${teamId}/join`)
      message.success('加入队伍成功')
      fetchTeams()
    } catch (error: any) {
      message.error(error.message || '加入队伍失败')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="team-list-page">
      <Card
        title="队伍列表"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setModalVisible(true)}
            data-testid="team-list-create-button"
            aria-label="创建队伍"
          >
            创建队伍
          </Button>
        }
        data-testid="team-list-card"
      >
        <List
          dataSource={teams}
          data-testid="team-list"
          renderItem={(team) => (
            <List.Item data-testid={`team-list-item-${team.id}`}>
              <List.Item.Meta
                title={<span data-testid={`team-list-item-${team.id}-name`}>{team.name}</span>}
                description={
                  <span data-testid={`team-list-item-${team.id}-members`}>
                    成员数: {team.members?.length || 0}/{team.max_size}
                  </span>
                }
              />
              <Button 
                onClick={() => handleJoinTeam(team.id)}
                data-testid={`team-list-join-button-${team.id}`}
                aria-label={`加入队伍: ${team.name}`}
              >
                加入
              </Button>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="创建队伍"
        open={modalVisible}
        onOk={handleCreateTeam}
        onCancel={() => setModalVisible(false)}
        data-testid="team-list-create-modal"
        aria-label="创建队伍对话框"
      >
        <Input
          placeholder="队伍名称"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          data-testid="team-list-create-modal-name-input"
          aria-label="队伍名称输入框"
        />
      </Modal>
    </div>
  )
}

