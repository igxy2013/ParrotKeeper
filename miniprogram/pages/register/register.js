const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    canRegister: true
  },

  onLoad() {
    console.log('注册页面加载')
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    })
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  // 验证输入
  validateInput() {
    const { username, password, confirmPassword } = this.data
    
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return false
    }

    // 验证用户名格式
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username.trim())) {
      wx.showToast({
        title: '用户名只能包含字母、数字、下划线，长度3-20位',
        icon: 'none'
      })
      return false
    }

    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return false
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度至少6位',
        icon: 'none'
      })
      return false
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 注册
  async onRegister() {
    if (!this.data.canRegister) return
    
    if (!this.validateInput()) return
    
    this.setData({ canRegister: false })
    
    try {
      const { username, password, nickname } = this.data
      
      const response = await app.request({
        url: '/api/auth/register',
        method: 'POST',
        data: {
          username: username.trim(),
          password: password.trim(),
          nickname: nickname.trim() || username.trim()
        }
      })
      
      if (response.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: response.message || '注册失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      console.error('注册失败:', error)
      wx.showToast({
        title: error.message || '注册失败，请检查网络',
        icon: 'none'
      })
    } finally {
      this.setData({ canRegister: true })
    }
  },

  // 返回登录页面
  onBackToLogin() {
    wx.navigateBack()
  }
})