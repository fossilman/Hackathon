import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Table, Tag, message } from 'antd'
import request from '../api/request'

export default function Results() {
  const { id } = useParams()
  const [results, setResults] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>({})

  useEffect(() => {
    if (id) {
      fetchResults()
    }
  }, [id])

  const fetchResults = async () => {
    try {
      const data = await request.get(`/hackathons/${id}/results`)
      setResults(data.rankings || [])
      setStatistics(data.statistics || {})
    } catch (error: any) {
      message.error(error.message || '获取结果失败')
    }
  }

  const columns = [
    { title: '排名', dataIndex: 'rank', key: 'rank' },
    { title: '队伍名称', dataIndex: ['team', 'name'], key: 'team_name' },
    { title: '作品名称', dataIndex: ['submission', 'name'], key: 'submission_name' },
    { title: '得票数', dataIndex: 'vote_count', key: 'vote_count' },
    {
      title: '奖项',
      key: 'award',
      render: (_: any, record: any) => (
        record.award ? <Tag color="gold">{record.award.name} - {record.award.prize}</Tag> : '-'
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="比赛结果">
        <div style={{ marginBottom: 24 }}>
          <p>总投票数: {statistics.total_votes}</p>
          <p>参与队伍数: {statistics.total_teams}</p>
          <p>提交作品数: {statistics.total_submissions}</p>
        </div>
        <Table
          columns={columns}
          dataSource={results}
          rowKey="rank"
          pagination={false}
        />
      </Card>
    </div>
  )
}

