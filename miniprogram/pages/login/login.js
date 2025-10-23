const app = getApp()

Page({
  data: {
    canLogin: true,
    username: '',
    password: '',
    selectedMode: 'personal' // 默认选择个人模式
  },

  onLoad() {
    console.log('登录页面加载')
    // 检查是否已经登录
    if (app.globalData.openid) {
      console.log('用户已登录，openid:', app.globalData.openid)
      wx.navigateBack()
    }
  },

  // 选择模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      selectedMode: mode
    })
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

  // 账号登录
  async onAccountLogin() {
    if (!this.data.canLogin) return
    
    const { username, password, selectedMode } = this.data
    
    // 验证输入
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }
    
    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }
    
    this.setData({ canLogin: false })
    
    try {
      const response = await app.request({
        url: '/api/auth/account-login',
        method: 'POST',
        data: {
          username: username.trim(),
          password: password.trim(),
          mode: selectedMode // 传递选择的模式
        }
      })
      
      if (response.success) {
        // 登录成功，保存用户信息
        const user = response.data.user
        const openid = user.openid || `account_${user.id}`
        
        app.globalData.openid = openid
        app.globalData.userInfo = user
        app.globalData.isLogin = true
        app.globalData.userMode = selectedMode // 保存用户选择的模式
        
        // 保存到本地存储
        wx.setStorageSync('openid', openid)
        wx.setStorageSync('userInfo', user)
        wx.setStorageSync('userMode', selectedMode) // 保存模式到本地存储
        
        console.log('账号登录成功，用户:', user, '模式:', selectedMode)
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: response.message || '登录失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      console.error('账号登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请检查网络',
        icon: 'none'
      })
    } finally {
      this.setData({ canLogin: true })
    }
  },

  // 注册
  onRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },
  // 微信登录
  async onWechatLogin() {
    try {
      await app.login()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('微信登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    }
  }
})