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

  const handleCancelVote = async (submissionId: number) => {
    try {
      await request.delete(`/submissions/${submissionId}/vote`)
      message.success('撤回投票成功')
      const newVotedIds = new Set(votedIds)
      newVotedIds.delete(submissionId)
      setVotedIds(newVotedIds)
      fetchSubmissions()
    } catch (error: any) {
      message.error(error.message || '撤回投票失败')
    }
  }

  return (
    <div className="page-content" data-testid="submission-list-page">
      <div className="page-container" data-testid="submission-list-container">
        <div className="page-header" data-testid="submission-list-header">
          <h2 className="page-title" data-testid="submission-list-title">作品列表</h2>
        </div>
        <Card data-testid="submission-list-card">
        <List
          dataSource={submissions}
          data-testid="submission-list"
          renderItem={(submission) => (
            <List.Item
              data-testid={`submission-list-item-${submission.id}`}
              actions={[
                votedIds.has(submission.id) ? (
                  <Button
                    key={`cancel-vote-${submission.id}`}
                    danger
                    icon={<LikeOutlined />}
                    onClick={() => handleCancelVote(submission.id)}
                    data-testid={`submission-list-cancel-vote-button-${submission.id}`}
                    aria-label={`撤回投票: ${submission.name}`}
                  >
                    撤回投票
                  </Button>
                ) : (
                  <Button
                    key={`vote-${submission.id}`}
                    type="primary"
                    icon={<LikeOutlined />}
                    onClick={() => handleVote(submission.id)}
                    data-testid={`submission-list-vote-button-${submission.id}`}
                    aria-label={`投票: ${submission.name}`}
                  >
                    投票
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={<span data-testid={`submission-list-item-${submission.id}-name`}>{submission.name}</span>}
                description={
                  <div data-testid={`submission-list-item-${submission.id}-description`}>
                    <div dangerouslySetInnerHTML={{ __html: submission.description }} />
                    <div style={{ marginTop: 8 }}>
                      <a 
                        href={submission.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        data-testid={`submission-list-item-${submission.id}-link`}
                        aria-label={`作品链接: ${submission.name}`}
                      >
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
    </div>
  )
}

