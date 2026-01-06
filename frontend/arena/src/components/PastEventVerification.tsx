import React, { useState } from 'react';
import { Button, List, Tag, Modal, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { getEventVerificationStatus, VerificationResponse } from '../api/verification';

interface PastEventVerificationProps {
  eventId: number;
  eventName: string;
}

export const PastEventVerification: React.FC<PastEventVerificationProps> = ({
  eventId,
  eventName,
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setModalVisible(true);
    try {
      const result = await getEventVerificationStatus(eventId);
      setVerificationResult(result);
    } catch (error: any) {
      console.error('验证失败:', error);
      Modal.error({
        title: '验证失败',
        content: error.message || '无法完成验证，请稍后重试',
      });
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationModal = () => {
    if (!verificationResult) return null;

    const { event_info_match, vote_records_match, discrepancies } = verificationResult;
    const allMatch = event_info_match && vote_records_match;

    return (
      <Modal
        title={`${eventName} - 验证结果`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="正在验证活动信息..." />
          </div>
        ) : (
          <div className="verification-modal-content">
            <div className="verification-status" style={{ textAlign: 'center', marginBottom: 20 }}>
              {allMatch ? (
                <div className="status-success">
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                  <h3>验证通过</h3>
                  <p>活动信息与区块链记录完全一致</p>
                </div>
              ) : (
                <div className="status-error">
                  <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                  <h3>验证失败</h3>
                  <p>发现数据不一致</p>
                </div>
              )}
            </div>

            <List
              header={<div><strong>验证项目</strong></div>}
              bordered
              dataSource={[
                {
                  label: '活动基本信息',
                  status: event_info_match,
                },
                {
                  label: '投票记录',
                  status: vote_records_match,
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <span>{item.label}</span>
                  {item.status ? (
                    <Tag color="success">一致</Tag>
                  ) : (
                    <Tag color="error">不一致</Tag>
                  )}
                </List.Item>
              )}
            />

            {discrepancies && discrepancies.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4>不一致项详情：</h4>
                <List
                  size="small"
                  bordered
                  dataSource={discrepancies}
                  renderItem={(item: string) => (
                    <List.Item style={{ color: 'red' }}>{item}</List.Item>
                  )}
                />
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <p><strong>验证时间：</strong>{new Date(verificationResult.verification_time * 1000).toLocaleString()}</p>
            </div>

            {verificationResult.transaction_hashes && verificationResult.transaction_hashes.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4>区块链交易记录：</h4>
                <List
                  size="small"
                  bordered
                  dataSource={verificationResult.transaction_hashes}
                  renderItem={(hash: string) => (
                    <List.Item>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {hash}
                      </a>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  return (
    <>
      <Button
        type="default"
        icon={<SearchOutlined />}
        onClick={handleVerify}
        loading={loading}
      >
        验证活动信息
      </Button>
      {renderVerificationModal()}
    </>
  );
};
