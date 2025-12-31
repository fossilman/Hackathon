import { Card, Badge, Button, Space, message, Image } from 'antd'
import { TrophyOutlined, CheckCircleOutlined, LinkOutlined, CalendarOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

interface NFTCredentialProps {
  nftRecord?: {
    has_nft: boolean
    token_id?: number
    transaction_hash?: string
    minted_at?: string
    hackathon_id?: number
    participant_id?: number
    message?: string
  }
  hackathonName: string
  visible: boolean
}

export default function NFTCredential({ nftRecord, hackathonName, visible }: NFTCredentialProps) {
  const { t } = useTranslation()

  if (!visible || !nftRecord?.has_nft) {
    return null
  }

  const handleViewOnExplorer = () => {
    if (nftRecord.transaction_hash) {
      // Sepolia测试网的浏览器链接
      window.open(`https://sepolia.etherscan.io/tx/${nftRecord.transaction_hash}`, '_blank')
    }
  }

  const tokenId = nftRecord.token_id || 0
  const mintedDate = nftRecord.minted_at ? dayjs(nftRecord.minted_at).format('YYYY-MM-DD HH:mm') : ''

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>{t('nftCredential.title')}</span>
          <Badge count="NFT" style={{ backgroundColor: '#52c41a' }} />
        </div>
      }
      style={{
        marginTop: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        color: 'white'
      }}
      headStyle={{ 
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* NFT图片展示区域 */}
        <div 
          style={{
            width: '200px',
            height: '200px',
            margin: '0 auto 20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.3)'
          }}
        >
          <TrophyOutlined style={{ fontSize: '48px', color: '#ffd700', marginBottom: '12px' }} />
          <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
        </div>

        {/* NFT信息 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '18px' }}>
            {hackathonName}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>
              {t('nftCredential.tokenId')}: #{tokenId}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              |
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarOutlined style={{ fontSize: '14px' }} />
              {mintedDate}
            </span>
          </div>
          
          <div style={{ 
            padding: '8px 16px', 
            background: 'rgba(82, 196, 26, 0.2)', 
            borderRadius: '20px', 
            display: 'inline-block',
            marginTop: '8px'
          }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
            <span style={{ color: '#52c41a', fontWeight: 500 }}>
              {t('nftCredential.verified')}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <Space>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleViewOnExplorer}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white'
            }}
            data-testid="nft-view-on-explorer"
          >
            {t('nftCredential.viewOnExplorer')}
          </Button>
        </Space>

        {/* 交易哈希显示 */}
        {nftRecord.transaction_hash && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '8px',
            wordBreak: 'break-all'
          }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '4px' }}>
              {t('nftCredential.transactionHash')}:
            </div>
            <code style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              {nftRecord.transaction_hash}
            </code>
          </div>
        )}
      </div>
    </Card>
  )
}