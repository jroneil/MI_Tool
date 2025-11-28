import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('API error', error)
    return Promise.reject(error)
  }
)
