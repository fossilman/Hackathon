import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space, message } from 'antd'
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
  const { walletAddress, connectWallet } = useAuthStore()
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
        const { token, participant } = await request.post('/auth/verify', {
          wallet_address: address,
          signature,
        })

        connectWallet(address, token, participant.id)
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

  return (
    <div className="page-content" data-testid="home-page">
      <div className="page-header" data-testid="home-header">
        <h1 className="page-title" data-testid="home-title" style={{ fontSize: '28px' }}>
          <TrophyOutlined style={{ marginRight: 8, color: 'var(--primary-color)' }} />
          Hackathon Arena
        </h1>
        {walletAddress ? (
          <Space data-testid="home-wallet-info">
            <span 
              data-testid="home-wallet-address"
              style={{ 
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}
            >
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </Space>
        ) : (
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
              testIdPrefix="home-hackathon"
            />
          ))}
        </div>
      )}
    </div>
  )
}

