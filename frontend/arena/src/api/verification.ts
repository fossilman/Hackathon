import axios from 'axios';

const API_BASE_URL = '/api/v1/arena';

export interface VerificationRequest {
  event_id: number;
  verify_votes: boolean;
}

export interface EventInfoData {
  event_id: number;
  event_name: string;
  description: string;
  start_time: number;
  end_time: number;
  location: string;
  organizer: string;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface EventInfoComparison {
  database_data: EventInfoData;
  blockchain_data: EventInfoData;
  is_match: boolean;
}

export interface VoteStatsData {
  total_votes: number;
  active_votes: number;
  revoked_votes: number;
}

export interface VoteStatsComparison {
  database_data: VoteStatsData;
  blockchain_data: VoteStatsData;
  is_match: boolean;
}

export interface CheckInStatsData {
  total_checkins: number;
  unique_participants: number;
  last_checkin_time: number;
}

export interface CheckInStatsComparison {
  database_data: CheckInStatsData;
  blockchain_data: CheckInStatsData;
  is_match: boolean;
}

export interface NFTStatsData {
  total_nfts: number;
  unique_participants: number;
  last_mint_time: number;
}

export interface NFTStatsComparison {
  database_data: NFTStatsData;
  blockchain_data: NFTStatsData;
  is_match: boolean;
}

export interface VerificationResponse {
  success: boolean;
  event_id: number;
  event_info_match: boolean;
  vote_records_match: boolean;
  checkin_match?: boolean;
  nft_records_match?: boolean;
  verification_time: number;
  discrepancies?: string[];
  event_info?: EventInfoComparison;
  vote_stats?: VoteStatsComparison;
  checkin_stats?: CheckInStatsComparison;
  nft_stats?: NFTStatsComparison;
  transaction_hashes?: string[];
}

// 验证活动信息（活动中）
export const verifyEventInfo = async (
  eventId: number,
  verifyVotes: boolean = true
): Promise<VerificationResponse> => {
  const response = await axios.post(`${API_BASE_URL}/verification/event`, {
    event_id: eventId,
    verify_votes: verifyVotes,
  });
  return response.data;
};

// 获取活动验证状态（活动后，游客可用）
export const getEventVerificationStatus = async (
  eventId: number
): Promise<VerificationResponse> => {
  const response = await axios.get(`${API_BASE_URL}/verification/event/${eventId}`);
  return response.data;
};
