import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { ethers } from 'ethers'
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
  const navigate = useNavigate()
  const { walletAddress, connectWallet, setParticipant } = useAuthStore()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHackathons = async () => {
    setLoading(true)
    try {
      const data = await request.get('/hackathons', {
        params: { page: 1, page_size: 100 },
      })
      setHackathons(data.list || [])
    } catch (error) {
      message.error('获取活动列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHackathons()
  }, [])

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
        const message = `Please sign this message to authenticate: ${nonce}`
        const signature = await signer.signMessage(message)

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
        
        message.success('连接成功')
      } catch (error: any) {
        message.error(error.message || '连接失败')
      }
    } else {
      message.error('请安装Metamask')
    }
  }

  const statusMap: Record<string, string> = {
    published: '发布',
    registration: '报名',
    checkin: '签到',
    team_formation: '组队',
    submission: '提交',
    voting: '投票',
    results: '公布结果',
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
      <div className="page-header" data-testid="home-header">
        <h1 className="page-title" data-testid="home-title" style={{ fontSize: '28px' }}>
          <TrophyOutlined style={{ marginRight: 8, color: 'var(--primary-color)' }} />
          活动列表
        </h1>
        {!walletAddress && (
          <Button 
            type="primary" 
            onClick={handleConnectWallet}
            data-testid="home-connect-button"
            aria-label="连接钱包"
          >
            连接钱包
          </Button>
        )}
      </div>

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
          加载中...
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

