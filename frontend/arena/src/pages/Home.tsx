import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { ethers } from 'ethers'
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

interface HackathonWithStatus extends Hackathon {
  registered?: boolean
  checkinStatus?: boolean
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { walletAddress, connectWallet, setParticipant, token } = useAuthStore()
  const [hackathons, setHackathons] = useState<HackathonWithStatus[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (hackathons.length > 0 && token) {
      fetchUserStatuses()
    }
  }, [hackathons, token])

  const fetchUserStatuses = async () => {
    const hackathonsWithStatus = await Promise.all(
      hackathons.map(async (hackathon) => {
        try {
          const [registrationStatus, checkinStatus] = await Promise.all([
            request.get(`/hackathons/${hackathon.id}/registration-status`),
            request.get(`/hackathons/${hackathon.id}/checkin-status`)
          ])
          
          return {
            ...hackathon,
            registered: registrationStatus.registered || false,
            checkinStatus: checkinStatus.checked_in || false
          }
        } catch (error) {
          // 如果获取状态失败，返回默认状态
          return {
            ...hackathon,
            registered: false,
            checkinStatus: false
          }
        }
      })
    )
    
    setHackathons(hackathonsWithStatus)
  }

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_requestAccounts', [])
        const address = accounts[0]
        
        // 获取nonce
        const { nonce } = await request.post('/auth/connect', {
          wallet_address: address,
        })

        // 签名
        const signer = await provider.getSigner()
        const messageText = `Please sign this message to authenticate: ${nonce}`
        const signature = await signer.signMessage(messageText)

        // 验证签名
        const { token, participant: participantData } = await request.post('/auth/verify', {
          wallet_address: address,
          signature,
        })

        connectWallet(address, token, participantData.id, participantData)
        
        // 获取完整的 participant 信息（包括 nickname）
        try {
          const fullParticipant = await request.get('/profile')
          setParticipant(fullParticipant)
        } catch (error) {
          // 如果获取失败，使用基本信息
          console.warn('获取完整用户信息失败，使用基本信息')
        }
        
        message.success(t('common.connected'))
      } catch (error: any) {
        message.error(error.message || t('common.error'))
      }
    } else {
      message.error(t('common.pleaseInstallMetamask'))
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
          <Button 
            type="primary" 
            onClick={handleConnectWallet}
            data-testid="home-connect-button"
            aria-label={t('common.connectWallet')}
          >
            {t('common.connectWallet')}
          </Button>
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
              showCheckinStatus={!!token}
              checkinStatus={hackathon.checkinStatus}
              registered={hackathon.registered}
            />
          ))}
        </div>
      )}
    </div>
  )
}

