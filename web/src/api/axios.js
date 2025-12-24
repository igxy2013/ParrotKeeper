import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const userId = localStorage.getItem('user_id')
  if (userId) {
    config.headers['X-OpenID'] = `account_${userId}`
    const userMode = localStorage.getItem('user_mode') || 'personal'
    config.headers['X-User-Mode'] = userMode
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user_id')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
