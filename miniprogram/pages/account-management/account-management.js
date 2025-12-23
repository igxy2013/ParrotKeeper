// pages/account-management/account-management.js
const app = getApp()

Page({
  data: {
    username: '',
    showBindModal: false,
    showSetupModal: false,
    
    // Bind form
    bindUsername: '',
    bindPassword: '',
    
    // Setup form
    setupUsername: '',
    setupPassword: '',
    setupConfirmPassword: '',
    setupUsernameError: ''
  },

  onLoad() {
    this.fetchProfile()
  },

  async fetchProfile() {
    try {
      // 获取最新用户信息
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/auth/profile`,
          method: 'GET',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data.success) {
              resolve(res.data.data)
            } else {
              reject(res.data.message || '获取信息失败')
            }
          },
          fail: (err) => reject(err)
        })
      })

      this.setData({
        username: res.username || ''
      })
    } catch (err) {
      console.error('Fetch profile failed', err)
      wx.showToast({ title: '获取信息失败', icon: 'none' })
    }
  },

  showBindModal() {
    this.setData({ 
      showBindModal: true,
      bindUsername: '',
      bindPassword: ''
    })
  },

  hideBindModal() {
    this.setData({ showBindModal: false })
  },

  showSetupModal() {
    this.setData({ 
      showSetupModal: true,
      setupUsername: '',
      setupPassword: '',
      setupConfirmPassword: ''
    })
  },

  hideSetupModal() {
    this.setData({ showSetupModal: false })
  },

  async checkSetupUsername(e) {
    const username = e.detail.value
    if (!username) return
    
    // 简单的格式验证
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      this.setData({ setupUsernameError: '需3-20位字母、数字或下划线' })
      return
    }

    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/auth/check-username`,
          method: 'GET',
          data: { username },
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        })
      })

      if (res.statusCode === 200 && res.data.success) {
        if (!res.data.data.available) {
           this.setData({ setupUsernameError: '用户名已存在' })
        } else {
           this.setData({ setupUsernameError: '' })
        }
      }
    } catch (err) {
      console.error('Check username failed', err)
    }
  },

  onSetupUsernameInput(e) {
    this.setData({
      setupUsername: e.detail.value,
      setupUsernameError: ''
    })
  },

  stopPropagation() {
    // 阻止点击冒泡
  },

  async handleBind() {
    const { bindUsername, bindPassword } = this.data
    if (!bindUsername || !bindPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    wx.showLoading({ title: '绑定中...' })

    try {
      await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/auth/bind-account`,
          method: 'POST',
          header: {
            'X-OpenID': app.globalData.openid
          },
          data: {
            username: bindUsername,
            password: bindPassword
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data.success) {
              resolve(res.data)
            } else {
              reject(res.data.message || '绑定失败')
            }
          },
          fail: (err) => reject(err)
        })
      })

      wx.hideLoading()
      wx.showToast({ title: '绑定成功', icon: 'success' })
      this.hideBindModal()
      
      // 绑定成功后，可能需要更新本地状态或重新获取信息
      // 由于绑定已有账号可能导致身份变更（如果后端删除了临时账号）
      // 建议刷新页面或重载应用
      setTimeout(() => {
        // 简单起见，重新获取profile
        this.fetchProfile()
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: typeof err === 'string' ? err : '绑定失败', icon: 'none' })
    }
  },

  async handleSetup() {
    const { setupUsername, setupPassword, setupConfirmPassword } = this.data
    
    if (!setupUsername || !setupPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    if (setupPassword !== setupConfirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    
    if (setupPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }

    wx.showLoading({ title: '设置中...' })

    try {
      await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/auth/setup-credentials`,
          method: 'POST',
          header: {
            'X-OpenID': app.globalData.openid
          },
          data: {
            username: setupUsername,
            password: setupPassword
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data.code === 200) {
              resolve(res.data)
            } else {
              reject(res.data.message || '设置失败')
            }
          },
          fail: (err) => reject(err)
        })
      })

      wx.hideLoading()
      
      // 先关闭弹窗，再提示成功，避免遮挡
      this.setData({ showSetupModal: false })
      
      wx.showToast({ title: '账号设置成功', icon: 'success' })
      
      setTimeout(() => {
        this.fetchProfile()
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: typeof err === 'string' ? err : '设置失败', icon: 'none' })
    }
  }
})
