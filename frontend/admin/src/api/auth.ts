import request from './request'

export interface LoginParams {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: string
  }
}

export const login = (params: LoginParams) => {
  return request.post<LoginResponse>('/auth/login', params)
}

export const logout = () => {
  return request.post('/auth/logout')
}

