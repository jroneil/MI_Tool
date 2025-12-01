import axios from 'axios'
import { clearToken, getToken } from './auth-store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
    }
    return Promise.reject(error)
  }
)

/**
 * Common API response helpers
 *
 * - GET /models/:modelId/records returns a paginated object with the queried items,
 *   the total count for the applied filters, and a has_more flag for pagination.
 */
export interface PaginatedRecordsResponse<T> {
  items: T[]
  total: number
  has_more: boolean
}
