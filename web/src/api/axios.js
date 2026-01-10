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
  response => {
    try {
      const d = response && response.data
      const code = d && (d.code || d.status_code || d.status)
      const msg = d && (d.message || '')
      if (d && d.success === false && (code === 403 || /权限|无权|未授权|forbidden/i.test(String(msg)))) {
        const evt = new CustomEvent('permission-denied', { detail: { message: msg || '您没有权限进行此操作' } })
        window.dispatchEvent(evt)
      }
    } catch (_) {}
    return response
  },
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user_id')
      window.location.href = '/login'
    }
    if (error.response && error.response.status === 403) {
      try {
        const msg = (error.response.data && error.response.data.message) || '您没有权限进行此操作'
        const evt = new CustomEvent('permission-denied', { detail: { message: msg } })
        window.dispatchEvent(evt)
      } catch (_) {}
    }
    return Promise.reject(error)
  }
)

export default api
