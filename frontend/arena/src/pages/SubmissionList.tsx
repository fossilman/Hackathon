import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, List, Button, message, Space } from 'antd'
import { LikeOutlined } from '@ant-design/icons'
import request from '../api/request'

export default function SubmissionList() {
  const { id } = useParams()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (id) {
      fetchSubmissions()
      fetchMyVotes()
    }
  }, [id])

  const fetchSubmissions = async () => {
    try {
      const data = await request.get(`/hackathons/${id}/submissions`)
      setSubmissions(data.list || [])
    } catch (error) {
      message.error('获取作品列表失败')
    }
  }

  const fetchMyVotes = async () => {
    try {
      const votes = await request.get(`/hackathons/${id}/votes`)
      const ids = new Set(votes.map((v: any) => v.submission_id))
      setVotedIds(ids)
    } catch (error) {
      // 忽略错误
    }
  }

  const handleVote = async (submissionId: number) => {
    try {
      await request.post(`/submissions/${submissionId}/vote`)
      message.success('投票成功')
      setVotedIds(new Set([...votedIds, submissionId]))
      fetchSubmissions()
    } catch (error: any) {
      message.error(error.message || '投票失败')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="作品列表">
        <List
          dataSource={submissions}
          renderItem={(submission) => (
            <List.Item
              actions={[
                <Button
                  type={votedIds.has(submission.id) ? 'default' : 'primary'}
                  icon={<LikeOutlined />}
                  onClick={() => handleVote(submission.id)}
                  disabled={votedIds.has(submission.id)}
                >
                  {votedIds.has(submission.id) ? '已投票' : '投票'}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={submission.name}
                description={
                  <div>
                    <div dangerouslySetInnerHTML={{ __html: submission.description }} />
                    <div style={{ marginTop: 8 }}>
                      <a href={submission.link} target="_blank" rel="noopener noreferrer">
                        {submission.link}
                      </a>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

