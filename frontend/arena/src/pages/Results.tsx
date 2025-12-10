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
    { 
      title: '排名', 
      dataIndex: 'rank', 
      key: 'rank',
      render: (text: any) => <span data-testid={`results-table-rank-${text}`}>{text}</span>
    },
    { 
      title: '队伍名称', 
      dataIndex: ['team', 'name'], 
      key: 'team_name',
      render: (text: any) => <span data-testid={`results-table-team-${text}`}>{text}</span>
    },
    { 
      title: '作品名称', 
      dataIndex: ['submission', 'name'], 
      key: 'submission_name',
      render: (text: any) => <span data-testid={`results-table-submission-${text}`}>{text}</span>
    },
    { 
      title: '得票数', 
      dataIndex: 'vote_count', 
      key: 'vote_count',
      render: (text: any, record: any) => (
        <span data-testid={`results-table-votes-${record.rank}`}>{text}</span>
      )
    },
    {
      title: '奖项',
      key: 'award',
      render: (_: any, record: any) => (
        record.award ? (
          <Tag color="gold" data-testid={`results-table-award-${record.rank}`}>
            {record.award.name} - {record.award.prize}
          </Tag>
        ) : (
          <span data-testid={`results-table-award-${record.rank}`}>-</span>
        )
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="results-page">
      <Card title="比赛结果" data-testid="results-card">
        <div style={{ marginBottom: 24 }} data-testid="results-statistics">
          <p data-testid="results-stat-votes">总投票数: {statistics.total_votes}</p>
          <p data-testid="results-stat-teams">参与队伍数: {statistics.total_teams}</p>
          <p data-testid="results-stat-submissions">提交作品数: {statistics.total_submissions}</p>
        </div>
        <Table
          columns={columns}
          dataSource={results}
          rowKey="rank"
          pagination={false}
          data-testid="results-table"
        />
      </Card>
    </div>
  )
}

