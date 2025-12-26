import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, message, Tag, Descriptions, Collapse, Timeline } from 'antd'
import { TrophyOutlined, LinkOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import request from '../api/request'
import dayjs from 'dayjs'
import VerificationReport from '../components/VerificationReport'
import GasEstimateModal from '../components/GasEstimateModal'

const { Panel } = Collapse

export default function HackathonDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, participantId } = useAuthStore()
  const [hackathon, setHackathon] = useState<any>(null)
  const [registered, setRegistered] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [userTeam, setUserTeam] = useState<any>(null)
  const [existingSubmission, setExistingSubmission] = useState<any>(null)
  const [sponsors, setSponsors] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showGasEstimate, setShowGasEstimate] = useState(false)
  const [gasEstimateUrl, setGasEstimateUrl] = useState('')
  const [gasOperationType, setGasOperationType] = useState<'checkin' | 'vote' | 'revoke'>('checkin')
  const [checkinLoading, setCheckinLoading] = useState(false)
  useEffect(() => {
    if (id) {
      fetchDetail()
    }
  }, [id])

  useEffect(() => {
    if (hackathon && token) {
      checkStatus()
    }
  }, [hackathon, token, id])

  const fetchDetail = async () => {
    try {
      const data = await request.get(`/hackathons/${id}`)
      // API 现在返回 { hackathon, transactions }
      if (data.hackathon) {
        setHackathon(data.hackathon)
        setTransactions(data.transactions || [])
      } else {
        // 兼容旧API格式
        setHackathon(data)
        setTransactions([])
      }
      // 获取活动的指定赞助商
      try {
        const sponsorData = await request.get(`/sponsors/events/${id}`)
        setSponsors(sponsorData || [])
      } catch (error) {
        // 忽略错误
      }
    } catch (error) {
      message.error(t('hackathonDetail.fetchFailed'))
    }
  }

  const checkStatus = async () => {
    try {
      const regStatus = await request.get(`/hackathons/${id}/registration-status`)
      setRegistered(regStatus.registered)
      const checkinStatus = await request.get(`/hackathons/${id}/checkin-status`)
      setCheckedIn(checkinStatus.checked_in)
      
      // 如果是提交阶段，检查是否有提交
      if (hackathon?.status === 'submission') {
        await checkSubmission()
      }
    } catch (error) {
      // 忽略错误
    }
  }

  const checkSubmission = async () => {
    try {
      // 获取用户队伍信息
      const team = await request.get(`/hackathons/${id}/teams/my-team`)
      setUserTeam(team)
      
      // 检查是否已有提交
      const submissions = await request.get(`/hackathons/${id}/submissions`)
      const submissionList = Array.isArray(submissions) ? submissions : (submissions.list || [])
      const teamSubmission = submissionList.find((s: any) => s.team_id === team?.id)
      if (teamSubmission) {
        setExistingSubmission(teamSubmission)
      }
    } catch (error) {
      // 忽略错误
    }
  }

  const handleRegister = async () => {
    try {
      await request.post(`/hackathons/${id}/register`)
      message.success(t('hackathonDetail.registerSuccess'))
      setRegistered(true)
    } catch (error: any) {
      message.error(error.message || t('hackathonDetail.registerFailed'))
    }
  }

  const handleCheckin = async () => {
    // 显示 Gas 费预估模态框
    setGasEstimateUrl(`/hackathons/${id}/estimate-checkin-gas`)
    setGasOperationType('checkin')
    setShowGasEstimate(true)
  }

  const confirmCheckin = async () => {
    setCheckinLoading(true)
    try {
      await request.post(`/hackathons/${id}/checkin`)
      message.success(t('hackathonDetail.checkinSuccess'))
      setCheckedIn(true)
      setShowGasEstimate(false)
    } catch (error: any) {
      message.error(error.message || t('hackathonDetail.checkinFailed'))
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleCancelRegistration = async () => {
    try {
      await request.delete(`/hackathons/${id}/register`)
      message.success(t('hackathonDetail.cancelRegisterSuccess'))
      setRegistered(false)
    } catch (error: any) {
      message.error(error.message || t('hackathonDetail.cancelRegisterFailed'))
    }
  }

  if (!hackathon) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          {t('hackathonDetail.loading')}
        </div>
      </div>
    )
  }

  const statusMap: Record<string, string> = {
    published: t('hackathon.statusPublished'),
    registration: t('hackathon.statusRegistration'),
    checkin: t('hackathon.statusCheckin'),
    team_formation: t('hackathon.statusTeamFormation'),
    submission: t('hackathon.statusSubmission'),
    voting: t('hackathon.statusVoting'),
    results: t('hackathon.statusResults'),
  }

  // 获取当前阶段信息
  const getCurrentStage = () => {
    if (!hackathon?.stages || !hackathon?.status) return null
    return hackathon.stages.find((stage: any) => stage.stage === hackathon.status)
  }

  const currentStage = getCurrentStage()

  const getTxTypeLabel = (txType: string) => {
    const labels: Record<string, string> = {
      create: t('hackathonDetail.txTypeCreate'),
      update: t('hackathonDetail.txTypeUpdate'),
      delete: t('hackathonDetail.txTypeDelete'),
      activate: t('hackathonDetail.txTypeActivate'),
      end: t('hackathonDetail.txTypeEnd'),
      checkin: t('hackathonDetail.txTypeCheckin'),
      vote: t('hackathonDetail.txTypeVote'),
      revoke_vote: t('hackathonDetail.txTypeRevokeVote'),
    }
    return labels[txType] || txType
  }

  return (
    <div className="page-content" data-testid="hackathon-detail-page">
      <div className="page-container" data-testid="hackathon-detail-container">
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrophyOutlined style={{ fontSize: '24px', color: 'var(--primary-color)' }} />
              <span>{hackathon.name}</span>
            </div>
          }
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <VerificationReport hackathonId={parseInt(id || '0')} />
              <Tag 
                color="blue"
                data-testid="hackathon-detail-status"
                style={{ fontSize: '14px', padding: '4px 12px' }}
              >
                {statusMap[hackathon.status] || hackathon.status}
              </Tag>
            </div>
          }
          data-testid="hackathon-detail-card"
        >
          <Descriptions column={2} bordered data-testid="hackathon-detail-info">
            <Descriptions.Item label={t('hackathonDetail.startTime')}>
              <span data-testid="hackathon-detail-start-time">
                {dayjs(hackathon.start_time).format('YYYY-MM-DD HH:mm')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('hackathonDetail.endTime')}>
              <span data-testid="hackathon-detail-end-time">
                {dayjs(hackathon.end_time).format('YYYY-MM-DD HH:mm')}
              </span>
            </Descriptions.Item>
            {currentStage && (
              <>
                <Descriptions.Item label={t('hackathonDetail.stageStartTime', { stage: statusMap[hackathon.status] || hackathon.status })}>
                  <span data-testid="hackathon-detail-stage-start-time">
                    {dayjs(currentStage.start_time).format('YYYY-MM-DD HH:mm')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('hackathonDetail.stageEndTime', { stage: statusMap[hackathon.status] || hackathon.status })}>
                  <span data-testid="hackathon-detail-stage-end-time">
                    {dayjs(currentStage.end_time).format('YYYY-MM-DD HH:mm')}
                  </span>
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label={t('hackathonDetail.description')} span={2}>
              <div 
                data-testid="hackathon-detail-description"
                dangerouslySetInnerHTML={{ __html: hackathon.description }}
                style={{ 
                  lineHeight: '1.6',
                  color: 'var(--text-primary)'
                }}
              />
            </Descriptions.Item>
          </Descriptions>

          {/* 活动指定赞助商展示 */}
          {sponsors.length > 0 && (
            <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px', color: '#666', fontSize: '14px', fontWeight: 600 }}>{t('hackathonDetail.eventSponsors')}</div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                {sponsors.map((sponsor) => (
                  <img
                    key={sponsor.id}
                    src={sponsor.logo_url}
                    alt={sponsor.user?.name || 'Sponsor'}
                    style={{ 
                      height: '60px', 
                      maxWidth: '200px', 
                      objectFit: 'contain',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // 可以添加跳转逻辑
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 链上交易记录展示 */}
          {transactions.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <Collapse>
                <Panel 
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LinkOutlined />
                      <span>{t('hackathonDetail.blockchainRecords')}</span>
                      <Tag color="blue">{transactions.length}</Tag>
                    </div>
                  } 
                  key="blockchain"
                >
                  <Timeline mode="left">
                    {transactions.map((tx: any) => (
                      <Timeline.Item 
                        key={tx.id}
                        label={dayjs(tx.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        color={tx.status === 'confirmed' ? 'green' : tx.status === 'failed' ? 'red' : 'blue'}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <Tag color="blue">{getTxTypeLabel(tx.tx_type)}</Tag>
                          <Tag color={tx.status === 'confirmed' ? 'success' : tx.status === 'failed' ? 'error' : 'processing'}>
                            {tx.status}
                          </Tag>
                        </div>
                        {tx.description && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
                            {tx.description}
                          </div>
                        )}
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '12px',
                          color: 'var(--text-tertiary)',
                          wordBreak: 'break-all'
                        }}>
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary-color)' }}
                          >
                            {tx.tx_hash}
                          </a>
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Panel>
              </Collapse>
            </div>
          )}

          <div style={{ marginTop: 24 }} data-testid="hackathon-detail-actions">
          {!token && (
            <Button 
              type="primary" 
              onClick={() => message.info(t('hackathonDetail.connectWalletFirst'))}
              data-testid="hackathon-detail-connect-button"
              aria-label={t('hackathonDetail.connectWallet')}
            >
              {t('hackathonDetail.connectWallet')}
            </Button>
          )}
          {token && hackathon.status === 'registration' && !registered && (
            <Button 
              type="primary" 
              onClick={handleRegister} 
              data-testid="hackathon-detail-register-button"
              aria-label={t('hackathonDetail.register')}
            >
              {t('hackathonDetail.register')}
            </Button>
          )}
          {token && hackathon.status === 'registration' && registered && (
            <Space data-testid="hackathon-detail-registered-actions">
              <Tag color="green" data-testid="hackathon-detail-registered-tag">{t('hackathonDetail.registered')}</Tag>
              <Button 
                danger 
                onClick={handleCancelRegistration} 
                data-testid="hackathon-detail-cancel-register-button"
                aria-label={t('hackathonDetail.cancelRegister')}
              >
                {t('hackathonDetail.cancelRegister')}
              </Button>
            </Space>
          )}
          {token && hackathon.status === 'checkin' && registered && !checkedIn && (
            <Button 
              type="primary" 
              onClick={handleCheckin}
              data-testid="hackathon-detail-checkin-button"
              aria-label={t('hackathonDetail.checkin')}
            >
              {t('hackathonDetail.checkin')}
            </Button>
          )}
          {token && hackathon.status === 'team_formation' && checkedIn && (
            <Button 
              type="primary" 
              onClick={() => navigate(`/hackathons/${id}/teams`)}
              data-testid="hackathon-detail-team-button"
              aria-label={t('hackathonDetail.teamFormation')}
            >
              {t('hackathonDetail.teamFormation')}
            </Button>
          )}
          {token && hackathon.status === 'submission' && (
            <Space data-testid="hackathon-detail-submission-actions">
              <Button 
                onClick={() => navigate(`/hackathons/${id}/submit`)}
                data-testid="hackathon-detail-submit-button"
                aria-label={existingSubmission ? t('hackathonDetail.modifySubmit') : t('hackathonDetail.submit')}
              >
                {existingSubmission ? t('hackathonDetail.modifySubmit') : t('hackathonDetail.submit')}
              </Button>
            </Space>
          )}
          {hackathon.status === 'voting' && (
            <Button 
              onClick={() => navigate(`/hackathons/${id}/submissions`)}
              data-testid="hackathon-detail-vote-button"
              aria-label={t('hackathonDetail.viewSubmissions')}
            >
              {t('hackathonDetail.viewSubmissions')}
            </Button>
          )}
          {hackathon.status === 'results' && (
            <Button 
              onClick={() => navigate(`/hackathons/${id}/results`)}
              data-testid="hackathon-detail-results-button"
              aria-label={t('hackathonDetail.viewResults')}
            >
              {t('hackathonDetail.viewResults')}
            </Button>
          )}
        </div>
      </Card>

      {/* Gas 费预估模态框 */}
      <GasEstimateModal
        visible={showGasEstimate}
        onCancel={() => setShowGasEstimate(false)}
        onConfirm={confirmCheckin}
        estimateUrl={gasEstimateUrl}
        operationType={gasOperationType}
        loading={checkinLoading}
      />
      </div>
    </div>
  )
}

