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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title="队伍列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            创建队伍
          </Button>
        }
      >
        <List
          dataSource={teams}
          renderItem={(team) => (
            <List.Item>
              <List.Item.Meta
                title={team.name}
                description={`成员数: ${team.members?.length || 0}/${team.max_size}`}
              />
              <Button onClick={() => handleJoinTeam(team.id)}>加入</Button>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="创建队伍"
        open={modalVisible}
        onOk={handleCreateTeam}
        onCancel={() => setModalVisible(false)}
      >
        <Input
          placeholder="队伍名称"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </Modal>
    </div>
  )
}

