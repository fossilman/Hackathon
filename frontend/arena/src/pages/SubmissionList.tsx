import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, List, Button, message, Space } from 'antd'
import { LikeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import request from '../api/request'
import { sendVote } from '../solana/vote'

const DEFAULT_PROGRAM_ID = '2BE9YFPLME8in2tsSeTY7CpKg7btYubQW5BFG9vdAMYX'

export default function SubmissionList() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const [hackathon, setHackathon] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set())
  const [votingId, setVotingId] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      fetchHackathon()
      fetchSubmissions()
      fetchMyVotes()
    }
  }, [id])

  const fetchHackathon = async () => {
    try {
      const data = await request.get(`/hackathons/${id}`)
      setHackathon(data)
    } catch {
      // ignore
    }
  }

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
    if (votingId != null) return
    setVotingId(submissionId)
    try {
      const programId = import.meta.env.VITE_SOLANA_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
      const hasChain = hackathon?.event_pda && publicKey && signTransaction
      let voteTxSig = ''
      if (hasChain) {
        try {
          const sig = await sendVote(
            connection,
            publicKey,
            {
              program_id: programId,
              event_id: Number(id),
              event_pda: hackathon.event_pda,
              submission_id: submissionId,
            },
            signTransaction
          )
          voteTxSig = sig
        } catch (chainErr: any) {
          const errMsg = String(chainErr?.message ?? chainErr?.cause?.message ?? '')
          if (/already in use|already exists|account already exists/i.test(errMsg)) {
            message.info(t('submission.voteAlreadyDone'))
            await request.post(`/submissions/${submissionId}/vote`, {})
            await fetchMyVotes()
            await fetchSubmissions()
            setVotingId(null)
            return
          }
          throw chainErr
        }
      }
      await request.post(`/submissions/${submissionId}/vote`, voteTxSig ? { vote_tx_sig: voteTxSig } : {})
      message.success(t('submission.voteSuccess'))
      setVotedIds(new Set([...votedIds, submissionId]))
      fetchSubmissions()
    } catch (error: any) {
      message.error(error.message || t('submission.voteFailed'))
    } finally {
      setVotingId(null)
    }
  }

  const handleCancelVote = async (submissionId: number) => {
    try {
      await request.delete(`/submissions/${submissionId}/vote`)
      message.success(t('submission.cancelVoteSuccess'))
      const newVotedIds = new Set(votedIds)
      newVotedIds.delete(submissionId)
      setVotedIds(newVotedIds)
      fetchSubmissions()
    } catch (error: any) {
      message.error(error.message || t('submission.cancelVoteFailed'))
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
                    loading={votingId === submission.id}
                    disabled={votingId != null}
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
      </div>
    </div>
  )
}

