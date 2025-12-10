import { Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface HackathonCardProps {
  hackathon: {
    id: number
    name: string
    description: string
    status: string
    start_time: string
    end_time: string
  }
  statusMap: Record<string, string>
  statusColorMap?: Record<string, string>
  testIdPrefix: string
  showDateIcon?: boolean
}

export default function HackathonCard({ 
  hackathon, 
  statusMap, 
  statusColorMap,
  testIdPrefix,
  showDateIcon = false
}: HackathonCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      key={hackathon.id}
      title={hackathon.name}
      extra={
        <Tag 
          color={statusColorMap?.[hackathon.status]}
          data-testid={`${testIdPrefix}-card-${hackathon.id}-status`}
        >
          {statusMap[hackathon.status] || hackathon.status}
        </Tag>
      }
      hoverable
      onClick={() => navigate(`/hackathons/${hackathon.id}`)}
      data-testid={`${testIdPrefix}-card-${hackathon.id}`}
      aria-label={`活动卡片: ${hackathon.name}`}
    >
      <p 
        style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: 8,
          fontSize: '14px'
        }} 
        data-testid={`${testIdPrefix}-card-${hackathon.id}-date`}
      >
        {showDateIcon && <CalendarOutlined style={{ marginRight: 4 }} />} 
        {dayjs(hackathon.start_time).format('YYYY-MM-DD')} - {dayjs(hackathon.end_time).format('YYYY-MM-DD')}
      </p>
      <p 
        style={{ 
          fontSize: '14px', 
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          margin: 0
        }} 
        data-testid={`${testIdPrefix}-card-${hackathon.id}-description`}
      >
        {hackathon.description.substring(0, 100)}...
      </p>
    </Card>
  )
}

