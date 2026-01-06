import React, { useState } from 'react';
import { Button, Card, Spin, Alert, Descriptions, Tag, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { verifyEventInfo, VerificationResponse } from '../api/verification';

interface EventVerificationProps {
  eventId: number;
  showVoteVerification?: boolean;
}

export const EventVerification: React.FC<EventVerificationProps> = ({
  eventId,
  showVoteVerification = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await verifyEventInfo(eventId, showVoteVerification);
      setVerificationResult(result);
    } catch (error: any) {
      console.error('验证失败:', error);
      Modal.error({
        title: '验证失败',
        content: error.message || '无法完成验证，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationStatus = () => {
    if (!verificationResult) return null;

    const {
      event_info_match,
      vote_records_match,
      checkin_match,
      nft_records_match,
      discrepancies,
    } = verificationResult;
    const allMatch =
      event_info_match &&
      vote_records_match &&
      (checkin_match ?? true) &&
      (nft_records_match ?? true);

    return (
      <Card className="verification-result" style={{ marginTop: 20 }}>
        <div className="verification-summary">
          {allMatch ? (
            <Alert
              message="验证通过"
              description="活动信息与区块链记录完全一致"
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
            />
          ) : (
            <Alert
              message="验证失败"
              description="发现数据不一致，请查看详细信息"
              type="error"
              icon={<CloseCircleOutlined />}
              showIcon
            />
          )}
        </div>

        <Descriptions title="验证详情" bordered column={2} style={{ marginTop: 20 }}>
          <Descriptions.Item label="活动信息">
            {event_info_match ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="投票记录">
            {vote_records_match ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="签到记录">
            {checkin_match == null ? (
              <Tag>未验证</Tag>
            ) : checkin_match ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="NFT 发放">
            {nft_records_match == null ? (
              <Tag>未验证</Tag>
            ) : nft_records_match ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="验证时间" span={2}>
            {new Date(verificationResult.verification_time * 1000).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {discrepancies && discrepancies.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4>不一致项：</h4>
            <ul>
              {discrepancies.map((item: string, index: number) => (
                <li key={index} style={{ color: 'red' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          type="link"
          onClick={() => setShowDetails(true)}
          style={{ marginTop: 10 }}
        >
          查看详细对比数据
        </Button>

        {verificationResult.transaction_hashes && verificationResult.transaction_hashes.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4>相关交易哈希：</h4>
            <ul>
              {verificationResult.transaction_hashes.map((hash: string, index: number) => (
                <li key={index}>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hash}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    );
  };

  const renderDetailModal = () => {
    if (!verificationResult || !verificationResult.event_info) return null;

    return (
      <Modal
        title="详细对比数据"
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        footer={null}
        width={800}
      >
        <Descriptions title="活动信息对比" bordered column={1}>
          <Descriptions.Item label="活动名称">
            <div>
              <div>数据库: {verificationResult.event_info?.database_data?.event_name}</div>
              <div>区块链: {verificationResult.event_info?.blockchain_data?.event_name}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="活动描述">
            <div>
              <div>数据库: {verificationResult.event_info?.database_data?.description}</div>
              <div>区块链: {verificationResult.event_info?.blockchain_data?.description}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            <div>
              <div>数据库: {new Date(verificationResult.event_info?.database_data?.start_time * 1000).toLocaleString()}</div>
              <div>区块链: {new Date(verificationResult.event_info?.blockchain_data?.start_time * 1000).toLocaleString()}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            <div>
              <div>数据库: {new Date(verificationResult.event_info?.database_data?.end_time * 1000).toLocaleString()}</div>
              <div>区块链: {new Date(verificationResult.event_info?.blockchain_data?.end_time * 1000).toLocaleString()}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="活动地点">
            <div>
              <div>数据库: {verificationResult.event_info?.database_data?.location}</div>
              <div>区块链: {verificationResult.event_info?.blockchain_data?.location}</div>
            </div>
          </Descriptions.Item>
        </Descriptions>

        {verificationResult.vote_stats && (
          <Descriptions title="投票统计对比" bordered column={1} style={{ marginTop: 20 }}>
            <Descriptions.Item label="总投票数">
              <div>
                <div>数据库: {verificationResult.vote_stats?.database_data?.total_votes}</div>
                <div>区块链: {verificationResult.vote_stats?.blockchain_data?.total_votes}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="有效投票数">
              <div>
                <div>数据库: {verificationResult.vote_stats?.database_data?.active_votes}</div>
                <div>区块链: {verificationResult.vote_stats?.blockchain_data?.active_votes}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="已撤销投票数">
              <div>
                <div>数据库: {verificationResult.vote_stats?.database_data?.revoked_votes}</div>
                <div>区块链: {verificationResult.vote_stats?.blockchain_data?.revoked_votes}</div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}

        {verificationResult.checkin_stats && (
          <Descriptions title="签到统计对比" bordered column={1} style={{ marginTop: 20 }}>
            <Descriptions.Item label="签到总次数">
              <div>
                <div>数据库: {verificationResult.checkin_stats.database_data.total_checkins}</div>
                <div>区块链: {verificationResult.checkin_stats.blockchain_data.total_checkins}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="唯一参赛人数">
              <div>
                <div>
                  数据库: {verificationResult.checkin_stats.database_data.unique_participants}
                </div>
                <div>
                  区块链: {verificationResult.checkin_stats.blockchain_data.unique_participants}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="最后签到时间">
              <div>
                <div>
                  数据库:{' '}
                  {verificationResult.checkin_stats.database_data.last_checkin_time
                    ? new Date(
                        verificationResult.checkin_stats.database_data.last_checkin_time * 1000
                      ).toLocaleString()
                    : '-'}
                </div>
                <div>
                  区块链:{' '}
                  {verificationResult.checkin_stats.blockchain_data.last_checkin_time
                    ? new Date(
                        verificationResult.checkin_stats.blockchain_data.last_checkin_time * 1000
                      ).toLocaleString()
                    : '-'}
                </div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}

        {verificationResult.nft_stats && (
          <Descriptions title="NFT 发放统计对比" bordered column={1} style={{ marginTop: 20 }}>
            <Descriptions.Item label="NFT 总数">
              <div>
                <div>数据库: {verificationResult.nft_stats.database_data.total_nfts}</div>
                <div>区块链: {verificationResult.nft_stats.blockchain_data.total_nfts}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="唯一参赛人数">
              <div>
                <div>
                  数据库: {verificationResult.nft_stats.database_data.unique_participants}
                </div>
                <div>
                  区块链: {verificationResult.nft_stats.blockchain_data.unique_participants}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="最后发放时间">
              <div>
                <div>
                  数据库:{' '}
                  {verificationResult.nft_stats.database_data.last_mint_time
                    ? new Date(
                        verificationResult.nft_stats.database_data.last_mint_time * 1000
                      ).toLocaleString()
                    : '-'}
                </div>
                <div>
                  区块链:{' '}
                  {verificationResult.nft_stats.blockchain_data.last_mint_time
                    ? new Date(
                        verificationResult.nft_stats.blockchain_data.last_mint_time * 1000
                      ).toLocaleString()
                    : '-'}
                </div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  };

  return (
    <div className="event-verification-container">
      <Card
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            活动信息真实性验证
          </span>
        }
      >
        <p>
          点击下方按钮验证活动信息的真实性。系统将对比数据库和区块链上的数据，确保信息的一致性和可信度。
        </p>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleVerify}
          icon={<CheckCircleOutlined />}
        >
          {loading ? '验证中...' : '开始验证'}
        </Button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Spin size="large" tip="正在验证活动信息..." />
        </div>
      )}

      {renderVerificationStatus()}
      {renderDetailModal()}
    </div>
  );
};
