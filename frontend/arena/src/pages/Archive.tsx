import { useState, useEffect } from 'react'
import { Card, Row, Col, Input, Select, Button, Pagination, Tag, message, Spin, Descriptions, Table, Divider } from 'antd'
import { SearchOutlined, TrophyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import request from '../api/request'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

interface ArchiveHackathon {
  id: number
  name: string
  description: string
  start_time: string
  end_time: string
  status: string
}

export default function Archive() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState<ArchiveHackathon[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0,
  })
  const [archiveDetail, setArchiveDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchArchiveHackathons = async (page = 1, pageSize = 12) => {
    setLoading(true)
    try {
      const data = await request.get('/hackathons/archive', {
        params: { page, page_size: pageSize, keyword: keyword || undefined, time_range: timeRange },
      })
      setHackathons(data.list || [])
      setPagination({
        current: page,
        pageSize,
        total: data.pagination?.total || data.total || 0,
      })
    } catch (error) {
      message.error(t('archive.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchArchiveDetail()
    } else {
      fetchArchiveHackathons(1, pagination.pageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, id])

  const fetchArchiveDetail = async () => {
    if (!id) return
    setDetailLoading(true)
    try {
      const data = await request.get(`/hackathons/archive/${id}`)
      setArchiveDetail(data)
    } catch (error) {
      message.error(t('archive.fetchDetailFailed'))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = () => {
    fetchArchiveHackathons(1, pagination.pageSize)
  }

  // 如果是详情页面
  if (id && archiveDetail) {
    return (
      <div className="page-content" style={{ padding: '24px' }}>
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Button
            onClick={() => navigate('/hackathons/archive')}
            style={{ marginBottom: '24px' }}
          >
            {t('archive.backToList')}
          </Button>
          <Card loading={detailLoading}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '24px' }}>
              {archiveDetail.hackathon?.name}
            </h1>
            <Descriptions column={2} bordered>
              <Descriptions.Item label={t('archive.hackathonTime')}>
                {dayjs(archiveDetail.hackathon?.start_time).format('YYYY-MM-DD')} -{' '}
                {dayjs(archiveDetail.hackathon?.end_time).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label={t('archive.stats')}>
                {t('archive.registration')}: {archiveDetail.stats?.registration_count || 0} | 
                {t('archive.checkin')}: {archiveDetail.stats?.checkin_count || 0} | 
                {t('archive.teams')}: {archiveDetail.stats?.team_count || 0} | 
                {t('archive.submissions')}: {archiveDetail.stats?.submission_count || 0}
              </Descriptions.Item>
              <Descriptions.Item label={t('archive.description')} span={2}>
                <div dangerouslySetInnerHTML={{ __html: archiveDetail.hackathon?.description }} />
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('archive.submissionList')}</Divider>
            <Table
              dataSource={archiveDetail.submissions || []}
              rowKey="id"
              columns={[
                { title: t('archive.submissionName'), dataIndex: 'name', key: 'name' },
                { title: t('archive.teamName'), dataIndex: ['team', 'name'], key: 'team_name' },
                { title: t('archive.votes'), dataIndex: 'vote_count', key: 'vote_count', render: (count) => count || 0 },
                { title: t('archive.submitTime'), dataIndex: 'created_at', key: 'created_at', render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm') },
              ]}
              pagination={false}
            />

            {archiveDetail.final_results && archiveDetail.final_results.length > 0 && (
              <>
                <Divider>{t('archive.results')}</Divider>
                {archiveDetail.final_results.map((result: any, index: number) => (
                  <Card key={index} style={{ marginBottom: '16px' }}>
                    <h3>{result.award_name}</h3>
                    <div>{t('archive.prize')}: {result.prize}</div>
                    {result.winners && result.winners.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        {result.winners.map((winner: any, wIndex: number) => (
                          <div key={wIndex} style={{ marginTop: '8px' }}>
                            <strong>{winner.team_name}</strong> - {winner.submission_name} ({t('archive.voteCount')}: {winner.vote_count})
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
            <TrophyOutlined style={{ marginRight: '8px', color: 'var(--primary-color)' }} />
            {t('archive.title')}
          </h1>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <Search
              placeholder={t('archive.searchPlaceholder')}
              allowClear
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 200 }}
            >
              <Option value="all">{t('archive.all')}</Option>
              <Option value="month">{t('archive.month')}</Option>
              <Option value="quarter">{t('archive.quarter')}</Option>
              <Option value="half_year">{t('archive.halfYear')}</Option>
            </Select>
          </div>
        </div>

        <Spin spinning={loading}>
          {hackathons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
              {t('archive.noEndedHackathons')}
            </div>
          ) : (
            <>
              <Row gutter={[16, 16]}>
                {hackathons.map((hackathon) => (
                  <Col xs={24} sm={12} lg={8} key={hackathon.id}>
                    <Card
                      hoverable
                      onClick={() => navigate(`/hackathons/archive/${hackathon.id}`)}
                      style={{ height: '100%' }}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                          {hackathon.name}
                        </h3>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                          {dayjs(hackathon.start_time).format('YYYY-MM-DD')} - {dayjs(hackathon.end_time).format('YYYY-MM-DD')}
                        </div>
                        <Tag color="green">{t('archive.ended')}</Tag>
                      </div>
                      <div style={{ color: '#999', fontSize: '12px', marginTop: '12px' }}>
                        {hackathon.description?.substring(0, 100)}
                        {hackathon.description?.length > 100 ? '...' : ''}
                      </div>
                      <Button
                        type="primary"
                        block
                        style={{ marginTop: '16px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/hackathons/archive/${hackathon.id}`)
                        }}
                      >
                        {t('archive.viewDetail')}
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showTotal={(total) => t('archive.totalRecords', { total })}
                  onChange={(page, pageSize) => {
                    fetchArchiveHackathons(page, pageSize)
                  }}
                  onShowSizeChange={(current, size) => {
                    fetchArchiveHackathons(1, size)
                  }}
                />
              </div>
            </>
          )}
        </Spin>
      </div>
    </div>
  )
}

