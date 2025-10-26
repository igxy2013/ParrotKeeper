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
      // 检查是否需要刷新数据（模式切换后）
      if (app.globalData.needRefresh) {
        console.log('检测到needRefresh标志，刷新首页数据');
        app.globalData.needRefresh = false; // 重置标志
      }
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
    console.log('首页检查登录状态')
    console.log('app.globalData.openid:', app.globalData.openid)
    console.log('app.globalData.userInfo:', app.globalData.userInfo)
    
    const isLogin = !!(app.globalData.openid && app.globalData.userInfo)
    const userInfo = app.globalData.userInfo || {}
    
    console.log('登录状态:', isLogin)
    
    this.setData({
      isLogin,
      userInfo
    })
    
    // 如果未登录，跳转到登录页面
    if (!isLogin) {
      console.log('用户未登录，跳转到登录页面')
      wx.navigateTo({
        url: '/pages/login/login'
      })
    }
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
        
        // 喂食记录聚合
        const feedingAgg = this.aggregateRecentFeeding(res.data.feeding || [])
        feedingAgg.forEach(item => allRecords.push(item))
        
        // 处理健康记录（保持非聚合）
        if (res.data.health && Array.isArray(res.data.health)) {
          res.data.health.forEach(record => {
            allRecords.push({
              id: `health_${record.id}`,
              title: record.record_type || '健康检查',
              type: 'health',
              parrot_name: record.parrot_name || (record.parrot && record.parrot.name) || '',
              time: app.formatDate(record.record_date)
            })
          })
        }
        
        // 清洁记录聚合
        const cleaningAgg = this.aggregateRecentCleaning(res.data.cleaning || [])
        cleaningAgg.forEach(item => allRecords.push(item))
        
        // 处理繁殖记录（保持非聚合）
        if (res.data.breeding && Array.isArray(res.data.breeding)) {
          res.data.breeding.forEach(record => {
            allRecords.push({
              id: `breeding_${record.id}`,
              title: '繁殖记录',
              type: 'breeding',
              parrot_name: `${record.male_parrot_name || (record.male_parrot && record.male_parrot.name) || ''} × ${record.female_parrot_name || (record.female_parrot && record.female_parrot.name) || ''}`,
              time: app.formatDate(record.mating_date || record.created_at)
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

  // 聚合首页喂食记录
  aggregateRecentFeeding(records) {
    const grouped = {}
    records.forEach(record => {
      const time = record.feeding_time
      const key = `${time}_${record.notes || ''}_${record.amount || ''}`
      if (!grouped[key]) {
        grouped[key] = {
          id: `feeding_group_${record.id || key}`,
          type: 'feeding',
          time: app.formatDate(time),
          parrot_names: [],
          feed_type_names: []
        }
      }
      const parrotName = record.parrot_name || (record.parrot && record.parrot.name) || ''
      const feedTypeName = record.feed_type_name || (record.feed_type && record.feed_type.name) || ''
      if (parrotName && !grouped[key].parrot_names.includes(parrotName)) {
        grouped[key].parrot_names.push(parrotName)
      }
      if (feedTypeName && !grouped[key].feed_type_names.includes(feedTypeName)) {
        grouped[key].feed_type_names.push(feedTypeName)
      }
    })
    const result = Object.values(grouped).map(item => ({
      id: item.id,
      title: `喂食 ${item.feed_type_names.join('、')}`,
      type: 'feeding',
      parrot_name: item.parrot_names.join('、'),
      time: item.time
    }))
    // 按时间倒序
    result.sort((a, b) => new Date(b.time) - new Date(a.time))
    return result
  },

  // 聚合首页清洁记录
  aggregateRecentCleaning(records) {
    const grouped = {}
    records.forEach(record => {
      const time = record.cleaning_time
      const key = `${time}_${record.cleaning_type || ''}_${record.notes || ''}`
      if (!grouped[key]) {
        grouped[key] = {
          id: `cleaning_group_${record.id || key}`,
          type: 'cleaning',
          time: app.formatDate(time),
          parrot_names: [],
          cleaning_type: record.cleaning_type || '',
          cleaning_type_text: record.cleaning_type_text || record.cleaning_type || ''
        }
      }
      const parrotName = record.parrot_name || (record.parrot && record.parrot.name) || ''
      if (parrotName && !grouped[key].parrot_names.includes(parrotName)) {
        grouped[key].parrot_names.push(parrotName)
      }
      // 如果同一组记录的清洁类型不同，合并为"综合清洁"
      if (grouped[key].cleaning_type && record.cleaning_type && grouped[key].cleaning_type !== record.cleaning_type) {
        grouped[key].cleaning_type = '综合'
        grouped[key].cleaning_type_text = '综合'
      }
    })
    const result = Object.values(grouped).map(item => ({
      id: item.id,
      title: item.cleaning_type_text || `${item.cleaning_type || ''}清洁`,
      type: 'cleaning',
      parrot_name: item.parrot_names.join('、'),
      time: item.time
    }))
    // 按时间倒序
    result.sort((a, b) => new Date(b.time) - new Date(a.time))
    return result
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
    // 检查是否支持微信快速登录
    if (wx.getUserProfile) {
      // 支持新版本的微信快速登录
      this.quickWechatLogin()
    } else {
      // 跳转到个人资料页面进行登录
      wx.navigateTo({
        url: '/pages/profile/profile'
      })
    }
  },

  // 微信快速登录
  quickWechatLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        // 获取用户信息成功，继续获取登录凭证
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 调用后端登录接口
              wx.request({
                url: 'https://bimai.xyz/api/auth/login',
                method: 'POST',
                data: {
                  code: loginRes.code,
                  userInfo: {
                    nickName: profileRes.userInfo.nickName,
                    avatarUrl: '/images/default-avatar.png' // 使用默认头像
                  }
                },
                header: {
                  'content-type': 'application/json'
                },
                success: (res) => {
                  console.log('快速登录接口响应', res);
                  if (res.data.success) {
                    const responseUserInfo = res.data.data.user;
                    
                    // 构建用户信息对象，使用默认头像
                    const userInfo = {
                      nickname: responseUserInfo.nickname,
                      avatar_url: '/images/default-avatar.png', // 强制使用默认头像
                      openid: responseUserInfo.openid,
                      created_at: responseUserInfo.created_at
                    };
                    
                    // 存储用户信息和openid
                    wx.setStorageSync('userInfo', userInfo);
                    wx.setStorageSync('openid', responseUserInfo.openid);
                    
                    // 更新全局状态
                    app.globalData.userInfo = userInfo;
                    app.globalData.openid = responseUserInfo.openid;
                    app.globalData.isLogin = true;
                    
                    // 更新页面状态
                    this.checkLoginStatus();
                    
                    // 登录成功后加载数据
                    this.loadData();
                    
                    wx.showToast({
                      title: '登录成功',
                      icon: 'success'
                    });
                  } else {
                    wx.showToast({
                      title: res.data.message || '登录失败',
                      icon: 'none'
                    });
                  }
                },
                fail: (err) => {
                  console.error('登录接口调用失败', err);
                  wx.showToast({
                    title: '网络错误，请检查网络连接',
                    icon: 'none'
                  });
                }
              });
            } else {
              wx.showToast({
                title: '获取登录凭证失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('微信登录失败', err);
            wx.showToast({
              title: '微信登录失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.log('用户取消授权或授权失败', err);
        // 用户取消授权，跳转到个人资料页面
        wx.navigateTo({
          url: '/pages/profile/profile'
        });
      }
    });
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
    console.log('navigateToRecords 被调用')
    console.log('当前登录状态:', this.data.isLogin)
    
    if (!this.data.isLogin) {
      console.log('用户未登录，显示错误提示')
      app.showError('请先登录')
      return
    }
    
    console.log('准备跳转到记录页面')
    wx.navigateTo({
      url: '/pages/records/records',
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        app.showError('跳转失败，请重试')
      }
    })
  },

  // 查看全部记录
  viewAllRecords() {
    console.log('viewAllRecords 被调用')
    console.log('当前登录状态:', this.data.isLogin)
    this.navigateToRecords()
  },

  // 快速喂食
  quickFeeding() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=feeding'
    })
  },

  // 快速清洁
  quickCleaning() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=cleaning'
    })
  },

  // 快速健康检查
  quickHealth() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=health'
    })
  },

  // 快速繁殖记录
  quickBreeding() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }

    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=breeding'
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
  },

  // 快速添加支出
  quickExpense() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/expenses/add-expense/add-expense'
    })
  },

  // 管理支出
  goToExpenseManagement() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/expenses/expenses'
    })
  }
})