import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Space, message } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { ethers } from 'ethers'
import request from '../api/request'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1>
          <TrophyOutlined /> Hackathon Arena
        </h1>
        {walletAddress ? (
          <Space>
            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </Space>
        ) : (
          <Button type="primary" onClick={handleConnectWallet}>
            连接钱包
          </Button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {hackathons.map((hackathon) => (
          <Card
            key={hackathon.id}
            title={hackathon.name}
            extra={<span>{statusMap[hackathon.status] || hackathon.status}</span>}
            hoverable
            onClick={() => navigate(`/hackathons/${hackathon.id}`)}
          >
            <p style={{ color: '#666', marginBottom: 8 }}>
              {dayjs(hackathon.start_time).format('YYYY-MM-DD')} - {dayjs(hackathon.end_time).format('YYYY-MM-DD')}
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              {hackathon.description.substring(0, 100)}...
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

