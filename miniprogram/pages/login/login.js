const app = getApp()

Page({
  data: {
    canLogin: true
  },

  onLoad() {
    console.log('登录页面加载')
    // 检查是否已经登录
    if (app.globalData.openid) {
      console.log('用户已登录，openid:', app.globalData.openid)
      wx.navigateBack()
    }
  },

  // 使用测试用户登录
  async onTestLogin() {
    console.log('开始测试登录')
    
    try {
      // 直接设置测试用户数据
      const testOpenid = 'test_openid_001'
      const testUserInfo = {
        openid: testOpenid,
        nickname: '测试用户',
        avatar_url: ''
      }
      
      // 保存到全局数据
      app.globalData.openid = testOpenid
      app.globalData.userInfo = testUserInfo
      app.globalData.isLogin = true
      
      // 保存到本地存储
      wx.setStorageSync('openid', testOpenid)
      wx.setStorageSync('userInfo', testUserInfo)
      
      console.log('测试登录成功，openid:', testOpenid)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('测试登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (!this.data.canLogin) return
    
    this.setData({ canLogin: false })
    
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
    } finally {
      this.setData({ canLogin: true })
    }
  }
})