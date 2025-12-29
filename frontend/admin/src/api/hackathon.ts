import request from './request'

export interface Hackathon {
  id: number
  name: string
  description?: string
  status: 'preparation' | 'published' | 'registration' | 'checkin' | 'team_formation' | 'submission' | 'voting' | 'results' | 'cancelled'
  start_time: string
  end_time: string
  registration_start_time?: string
  registration_end_time?: string
  max_participants?: number
  current_participants?: number
  creator_id: number
  creator_name?: string
  organizer_id: number
  organizer_name?: string
  location_type: 'online' | 'offline' | 'hybrid'
  city?: string
  location_detail?: string
  max_team_size: number
  chain_event_id?: number
  created_at: string
  updated_at: string
}

export interface ChainData {
  event_id: number
  event_name: string
  description: string
  start_time: number
  end_time: number
  location: string
  organizer: string
  created_at: number
  updated_at: number
  is_deleted: boolean
}

export interface HackathonWithChainData {
  hackathon: Hackathon
  chain_data: ChainData | null
  chain_status: 'not_on_chain' | 'blockchain_error' | 'chain_data_error' | 'synced'
}

export interface HackathonListParams {
  page?: number
  page_size?: number
  status?: string
  keyword?: string
}

export interface HackathonListResponse {
  items: Hackathon[]
  total: number
  page: number
  page_size: number
}

export const getHackathonList = (params: HackathonListParams) => {
  return request.get<HackathonListResponse>('/hackathons', { params })
}

export const getHackathonDetail = (id: number) => {
  return request.get<Hackathon>(`/hackathons/${id}`)
}

export const getHackathonWithChainData = (id: number) => {
  return request.get<HackathonWithChainData>(`/hackathons/${id}/chain-data`)
}

export const verifyHackathonIntegrity = (id: number) => {
  return request.get(`/hackathons/${id}/verify`)
}

export const createHackathon = (data: Partial<Hackathon>) => {
  return request.post<Hackathon>('/hackathons', data)
}

export const updateHackathon = (id: number, data: Partial<Hackathon>) => {
  return request.put<Hackathon>(`/hackathons/${id}`, data)
}

export const deleteHackathon = (id: number) => {
  return request.delete(`/hackathons/${id}`)
}