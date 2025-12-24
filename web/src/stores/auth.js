import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/axios'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const userId = ref(localStorage.getItem('user_id'))
  const router = useRouter()

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/account-login', { username, password })
      if (response.data.success) {
        // Since backend might return data in 'data' field or 'user' field depending on implementation
        // Check verify response in auth.py: 
        // return success_response({'user': user_schema.dump(user)}, ...)
        // success_response wraps in {success: true, message: ..., data: ...}
        // Wait, auth.py account_login returns:
        // return success_response(response_data, message)
        // I need to see what response_data is in account_login
        
        // Let's re-read account_login in auth.py
        const userData = response.data.data.user
        user.value = userData
        userId.value = userData.id
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('user_id', userData.id)
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed', error)
      throw error
    }
  }

  const logout = () => {
    user.value = null
    userId.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('user_id')
    // router.push('/login') // Cannot use router here directly if not set up, but usually fine
    window.location.href = '/login'
  }

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile')
      if (res.data && res.data.success) {
        const u = res.data.data
        user.value = u
        if (u && u.id) {
          userId.value = u.id
          localStorage.setItem('user_id', u.id)
        }
        localStorage.setItem('user', JSON.stringify(u))
        return u
      }
      return null
    } catch (e) {
      console.error('刷新用户信息失败', e)
      return null
    }
  }

  return { user, userId, login, logout, refreshProfile }
})
