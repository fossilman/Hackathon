import { useState } from 'react'
import { Button, Modal, Descriptions, Alert, Spin, Tag, Divider, Collapse, Typography } from 'antd'
import { SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import request from '../api/request'
import dayjs from 'dayjs'

const { Panel } = Collapse
const { Text, Paragraph } = Typography

interface VerificationReportProps {
  hackathonId: number
}

interface VerificationData {
  hackathon_id: number
  verified_at: string
  is_valid: boolean
  summary: string
  event_verification?: {
    is_valid: boolean
    database_data: Record<string, any>
    blockchain_data: Record<string, any>
    differences?: string[]
  }
  votes_verification?: {
    is_valid: boolean
    total_votes_db: number
    total_votes_chain: number
    verified_voters: number
    mismatched_voters?: string[]
    differences?: string[]
  }
  issues?: string[]
}

export default function VerificationReport({ hackathonId }: VerificationReportProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)

  const handleVerify = async () => {
    setVisible(true)
    setLoading(true)
    try {
      const data = await request.get(`/hackathons/${hackathonId}/verify-all`)
      setVerificationData(data)
    } catch (error: any) {
      Modal.error({
        title: t('verification.verifyFailed'),
        content: error.message || t('verification.verifyFailedDesc'),
      })
      setVisible(false)
    } finally {
      setLoading(false)
    }
  }

  const renderEventVerification = () => {
    if (!verificationData?.event_verification) return null

    const { is_valid, database_data, blockchain_data, differences } = verificationData.event_verification

    return (
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          {is_valid ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          {t('verification.eventInfo')}
        </h3>

        {differences && differences.length > 0 ? (
          <Alert
            type="error"
            message={t('verification.differencesFound')}
            description={
              <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
                {differences.map((diff, index) => (
                  <li key={index}>{diff}</li>
                ))}
              </ul>
            }
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
        ) : (
          <Alert
            type="success"
            message={t('verification.eventInfoMatched')}
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
        )}

        <Collapse>
          <Panel header={t('verification.viewDetails')} key="1">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t('verification.name')}>
                <div>
                  <Text type="secondary">{t('verification.database')}: </Text>
                  <Text>{database_data.name}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">{t('verification.blockchain')}: </Text>
                  <Text>{blockchain_data.name}</Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={t('verification.location')}>
                <div>
                  <Text type="secondary">{t('verification.database')}: </Text>
                  <Text>{database_data.location}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">{t('verification.blockchain')}: </Text>
                  <Text>{blockchain_data.location}</Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={t('verification.startTime')}>
                <div>
                  <Text type="secondary">{t('verification.database')}: </Text>
                  <Text>{dayjs(database_data.start_time).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">{t('verification.blockchain')}: </Text>
                  <Text>{dayjs(blockchain_data.start_time).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={t('verification.endTime')}>
                <div>
                  <Text type="secondary">{t('verification.database')}: </Text>
                  <Text>{dayjs(database_data.end_time).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">{t('verification.blockchain')}: </Text>
                  <Text>{dayjs(blockchain_data.end_time).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Panel>
        </Collapse>
      </div>
    )
  }

  const renderVotesVerification = () => {
    if (!verificationData?.votes_verification) return null

    const { is_valid, total_votes_db, verified_voters, mismatched_voters, differences } = verificationData.votes_verification

    return (
      <div>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          {is_valid ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          {t('verification.votingRecords')}
        </h3>

        <Descriptions column={2} size="small" bordered style={{ marginBottom: 'var(--spacing-md)' }}>
          <Descriptions.Item label={t('verification.totalVotes')}>
            {total_votes_db}
          </Descriptions.Item>
          <Descriptions.Item label={t('verification.verifiedVoters')}>
            {verified_voters}
          </Descriptions.Item>
        </Descriptions>

        {differences && differences.length > 0 && (
          <Alert
            type="warning"
            message={t('verification.votesDifferencesFound')}
            description={
              <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)', marginBottom: 0 }}>
                {differences.slice(0, 5).map((diff, index) => (
                  <li key={index}>{diff}</li>
                ))}
                {differences.length > 5 && (
                  <li>{t('verification.andMore', { count: differences.length - 5 })}</li>
                )}
              </ul>
            }
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
        )}

        {mismatched_voters && mismatched_voters.length > 0 && (
          <Collapse>
            <Panel header={`${t('verification.mismatchedVoters')} (${mismatched_voters.length})`} key="1">
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {mismatched_voters.map((voter, index) => (
                  <div key={index} style={{ 
                    padding: 'var(--spacing-xs)', 
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>
                    {voter}
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        )}
      </div>
    )
  }

  return (
    <>
      <Button
        type="default"
        icon={<SafetyOutlined />}
        onClick={handleVerify}
        style={{ marginRight: 'var(--spacing-md)' }}
      >
        {t('verification.verifyButton')}
      </Button>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <SafetyOutlined />
            {t('verification.title')}
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            {t('verification.close')}
          </Button>
        ]}
        width={800}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
            <Spin size="large" />
            <p style={{ marginTop: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>
              {t('verification.verifying')}
            </p>
          </div>
        ) : verificationData ? (
          <div>
            <Alert
              type={verificationData.is_valid ? 'success' : 'error'}
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  {verificationData.is_valid ? (
                    <>
                      <CheckCircleOutlined />
                      {t('verification.allValid')}
                    </>
                  ) : (
                    <>
                      <WarningOutlined />
                      {t('verification.hasIssues')}
                    </>
                  )}
                </div>
              }
              description={verificationData.summary}
              style={{ marginBottom: 'var(--spacing-xl)' }}
            />

            <div style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: '14px' }}>
              {t('verification.verifiedAt')}: {dayjs(verificationData.verified_at).format('YYYY-MM-DD HH:mm:ss')}
            </div>

            <Divider />

            {renderEventVerification()}
            {renderVotesVerification()}

            {verificationData.issues && verificationData.issues.length > 0 && (
              <>
                <Divider />
                <Alert
                  type="error"
                  message={t('verification.issues')}
                  description={
                    <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)', marginBottom: 0 }}>
                      {verificationData.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  }
                />
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  )
}
