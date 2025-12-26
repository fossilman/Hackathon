import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, List, Button, message, Space } from 'antd'
import { LikeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import request from '../api/request'
import GasEstimateModal from '../components/GasEstimateModal'

export default function SubmissionList() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set())
  const [showGasEstimate, setShowGasEstimate] = useState(false)
  const [gasEstimateUrl, setGasEstimateUrl] = useState('')
  const [gasOperationType, setGasOperationType] = useState<'checkin' | 'vote' | 'revoke'>('vote')
  const [currentSubmissionId, setCurrentSubmissionId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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
      message.error(t('submission.fetchFailed'))
    }
  }

  const fetchMyVotes = async () => {
    try {
      const votes = await request.get(`/hackathons/${id}/votes`)
      const ids = new Set<number>(votes.map((v: any) => v.submission_id))
      setVotedIds(ids)
    } catch (error) {
      // 忽略错误
    }
  }

  const handleVote = async (submissionId: number) => {
    // 显示 Gas 费预估模态框
    setCurrentSubmissionId(submissionId)
    setGasEstimateUrl(`/submissions/${submissionId}/estimate-vote-gas`)
    setGasOperationType('vote')
    setShowGasEstimate(true)
  }

  const confirmVote = async () => {
    if (!currentSubmissionId) return
    
    setActionLoading(true)
    try {
      await request.post(`/submissions/${currentSubmissionId}/vote`)
      message.success(t('submission.voteSuccess'))
      setVotedIds(new Set([...votedIds, currentSubmissionId]))
      fetchSubmissions()
      setShowGasEstimate(false)
    } catch (error: any) {
      message.error(error.message || t('submission.voteFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelVote = async (submissionId: number) => {
    // 显示 Gas 费预估模态框
    setCurrentSubmissionId(submissionId)
    setGasEstimateUrl(`/submissions/${submissionId}/estimate-revoke-vote-gas`)
    setGasOperationType('revoke')
    setShowGasEstimate(true)
  }

  const confirmCancelVote = async () => {
    if (!currentSubmissionId) return
    
    setActionLoading(true)
    try {
      await request.delete(`/submissions/${currentSubmissionId}/vote`)
      message.success(t('submission.cancelVoteSuccess'))
      const newVotedIds = new Set(votedIds)
      newVotedIds.delete(currentSubmissionId)
      setVotedIds(newVotedIds)
      fetchSubmissions()
      setShowGasEstimate(false)
    } catch (error: any) {
      message.error(error.message || t('submission.cancelVoteFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="page-content" data-testid="submission-list-page">
      <div className="page-container" data-testid="submission-list-container">
        <div className="page-header" data-testid="submission-list-header">
          <h2 className="page-title" data-testid="submission-list-title">{t('submission.list')}</h2>
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
                    aria-label={`${t('submission.cancelVote')}: ${submission.name}`}
                  >
                    {t('submission.cancelVote')}
                  </Button>
                ) : (
                  <Button
                    key={`vote-${submission.id}`}
                    type="primary"
                    icon={<LikeOutlined />}
                    onClick={() => handleVote(submission.id)}
                    data-testid={`submission-list-vote-button-${submission.id}`}
                    aria-label={`${t('submission.vote')}: ${submission.name}`}
                  >
                    {t('submission.vote')}
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
                        aria-label={`${t('submission.submissionLink')}: ${submission.name}`}
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

        {/* Gas 费预估模态框 */}
        <GasEstimateModal
          visible={showGasEstimate}
          onCancel={() => setShowGasEstimate(false)}
          onConfirm={gasOperationType === 'vote' ? confirmVote : confirmCancelVote}
          estimateUrl={gasEstimateUrl}
          operationType={gasOperationType}
          loading={actionLoading}
        />
      </div>
    </div>
  )
}

