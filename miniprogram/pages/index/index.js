// pages/index/index.js
const app = getApp()

Page({
  data: {
    greeting: '早上好',
    userInfo: {},
    isLogin: false,
    overview: {},
    recentRecords: [],
    healthAlerts: [],
    weather: null
  },

  onLoad() {
    this.setGreeting()
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    // 无论是否登录都可以浏览首页，但只有登录用户才加载个人数据
    if (this.data.isLogin) {
      this.loadData()
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好'
    
    if (hour >= 6 && hour < 12) {
      greeting = '早上好'
    } else if (hour >= 12 && hour < 18) {
      greeting = '下午好'
    } else {
      greeting = '晚上好'
    }
    
    this.setData({ greeting })
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.checkLoginStatus()
    const userInfo = app.globalData.userInfo || {}
    
    this.setData({
      isLogin,
      userInfo
    })
  },

  // 加载数据
  async loadData() {
    try {
      await Promise.all([
        this.loadOverview(),
        this.loadRecentRecords(),
        this.loadHealthAlerts()
      ])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  },

  // 加载概览数据
  async loadOverview() {
    try {
      const res = await app.request({
        url: '/api/statistics/overview',
        method: 'GET'
      })
      
      if (res.success) {
        this.setData({
          overview: res.data
        })
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  },

  // 加载最近记录
  async loadRecentRecords() {
    try {
      const res = await app.request({
        url: '/api/records/recent',
        method: 'GET',
        data: { limit: 5 }
      })
      
      if (res.success) {
        const allRecords = []
        
        // 处理喂食记录
        if (res.data.feeding && Array.isArray(res.data.feeding)) {
          res.data.feeding.forEach(record => {
            allRecords.push({
              id: `feeding_${record.id}`,
              title: `喂食 ${record.feed_type_name || ''}`,
              type: 'feeding',
              parrot_name: record.parrot_name,
              time: app.formatDate(record.feeding_time)
            })
          })
        }
        
        // 处理健康记录
        if (res.data.health && Array.isArray(res.data.health)) {
          res.data.health.forEach(record => {
            allRecords.push({
              id: `health_${record.id}`,
              title: record.record_type || '健康检查',
              type: 'health',
              parrot_name: record.parrot_name,
              time: app.formatDate(record.record_date)
            })
          })
        }
        
        // 处理清洁记录
        if (res.data.cleaning && Array.isArray(res.data.cleaning)) {
          res.data.cleaning.forEach(record => {
            allRecords.push({
              id: `cleaning_${record.id}`,
              title: `${record.cleaning_type || ''}清洁`,
              type: 'cleaning',
              parrot_name: record.parrot_name,
              time: app.formatDate(record.cleaning_time)
            })
          })
        }
        
        // 按时间排序，最新的在前
        allRecords.sort((a, b) => new Date(b.time) - new Date(a.time))
        
        // 只取前5条
        const recentRecords = allRecords.slice(0, 5)
        
        this.setData({
          recentRecords
        })
      }
    } catch (error) {
      console.error('加载最近记录失败:', error)
    }
  },

  // 加载健康提醒
  async loadHealthAlerts() {
    try {
      // 这里可以根据实际需求加载健康提醒
      // 比如疫苗提醒、体检提醒等
      const alerts = []
      
      // 检查是否有鹦鹉需要健康检查
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // 这里可以添加更多的健康提醒逻辑
      
      this.setData({
        healthAlerts: alerts
      })
    } catch (error) {
      console.error('加载健康提醒失败:', error)
    }
  },

  // 处理登录
  handleLogin() {
    // 跳转到个人资料页面进行登录
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 导航到鹦鹉页面
  navigateToParrots() {
    // 游客模式也可以浏览鹦鹉页面
    wx.switchTab({
      url: '/pages/parrots/parrots'
    })
  },

  // 导航到记录页面
  navigateToRecords() {
    if (!this.data.isLogin) {
      app.showError('请先登录')
      return
    }
    wx.switchTab({
      url: '/pages/records/records'
    })
  },

  // 查看全部记录
  viewAllRecords() {
    this.navigateToRecords()
  },

  // 快速喂食
  quickFeeding() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-feeding/add-feeding'
    })
  },

  // 快速清洁
  quickCleaning() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-cleaning/add-cleaning'
    })
  },

  // 快速健康检查
  quickHealth() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-health/add-health'
    })
  },

  // 添加鹦鹉
  addParrot() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/parrots/add-parrot/add-parrot'
    })
  }
})