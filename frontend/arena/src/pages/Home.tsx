import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PageHeader } from '@shared/components'
import request from '../api/request'
import { useAuthStore } from '../store/authStore'
import HackathonCard from '../components/HackathonCard'

interface Hackathon {
  id: number
  name: string
  description: string
  status: string
  start_time: string
  end_time: string
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { walletAddress, connectWallet, setParticipant } = useAuthStore()
  const { publicKey, signMessage } = useWallet()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const fetchHackathons = async () => {
    setLoading(true)
    try {
      const data = await request.get('/hackathons', {
        params: { page: 1, page_size: 100 },
      })
      setHackathons(data.list || [])
    } catch (error) {
      message.error(t('hackathon.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHackathons()
  }, [])

  const handleConnectWallet = async () => {
    if (!publicKey || !signMessage) {
      message.warning(t('common.pleaseInstallPhantom'))
      return
    }
    setConnecting(true)
    try {
      const raw = publicKey.toBase58()
      const address = typeof raw === 'string' ? raw.trim() : String(raw).trim()
      if (!address || address.length < 32 || address.length > 44) {
        message.warning(t('common.walletAddressInvalid'))
        setConnecting(false)
        return
      }
      const { nonce } = await request.post('/auth/connect', {
        wallet_address: address,
      })
      const messageText = `Please sign this message to authenticate: ${nonce}`
      const encodedMessage = new TextEncoder().encode(messageText)
      const sigBytes = await signMessage(encodedMessage)
      const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
      const { token, participant: participantData } = await request.post('/auth/verify', {
        wallet_address: address,
        signature,
      })
      connectWallet(address, token, participantData.id, participantData)
      try {
        const fullParticipant = await request.get('/profile')
        setParticipant(fullParticipant)
      } catch {
        console.warn('获取完整用户信息失败，使用基本信息')
      }
      message.success(t('common.connected'))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const msg = err.response?.data?.message || err.message || t('common.error')
      message.error({ content: msg, duration: 5 })
    } finally {
      setConnecting(false)
    }
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

  // 活动状态配色（与 Admin 系统保持一致）
  const statusColorMap: Record<string, string> = {
    preparation: 'default',
    published: 'blue',
    registration: 'cyan',
    checkin: 'orange',
    team_formation: 'purple',
    submission: 'geekblue',
    voting: 'magenta',
    results: 'green',
  }

  return (
    <div className="page-content" data-testid="home-page">
      <PageHeader
        title={
          <>
          <TrophyOutlined style={{ marginRight: 8, color: 'var(--primary-color)' }} />
          {t('home.title')}
          </>
        }
        actions={
          !walletAddress ? (
            publicKey ? (
              <Button
                type="primary"
                onClick={handleConnectWallet}
                loading={connecting}
                data-testid="home-connect-button"
                aria-label={t('common.connectWallet')}
              >
                {t('common.signIn')}
              </Button>
            ) : (
              <WalletMultiButton style={{ height: '36px', borderRadius: 'var(--radius-md)' }} />
            )
          ) : undefined
        }
        testId="home-header"
      />

      {loading ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--text-secondary)',
            fontSize: '16px'
          }} 
          data-testid="home-loading"
        >
          {t('home.loading')}
        </div>
      ) : (
        <div 
          className="grid-container"
          data-testid="home-hackathon-list"
        >
          {hackathons.map((hackathon) => (
            <HackathonCard
              key={hackathon.id}
              hackathon={hackathon}
              statusMap={statusMap}
              statusColorMap={statusColorMap}
              testIdPrefix="home-hackathon"
            />
          ))}
        </div>
      )}
    </div>
  )
}

