import axios from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/authStore'

const request = axios.create({
  baseURL: '/api/v1/arena',
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const { code, message: msg, data } = response.data
    if (code === 200) {
      return data
    } else {
      message.error(msg || '请求失败')
      return Promise.reject(new Error(msg || '请求失败'))
    }
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
    }
    message.error(error.response?.data?.message || '请求失败')
    return Promise.reject(error)
  }
)

export default request

