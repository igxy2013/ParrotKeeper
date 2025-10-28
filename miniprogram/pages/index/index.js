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
    weather: null,
    menuRightPadding: 0,
    // 新增：我的鹦鹉（首页展示最多三只）
    myParrots: [],
    // 新增：通知中心
    showNotifications: false,
    notifications: [],
    unreadCount: 0,

    // 添加鹦鹉弹窗&表单
    showAddParrotModal: false,
    newParrot: {
      name: '',
      type: '',
      weight: '',
      gender: '',
      color: '',
      birthDate: '',
      notes: '',
      parrot_number: '',
      ring_number: '',
      acquisition_date: '',
      photo_url: ''
    },
    parrotTypes: [],
    typeIndex: 0,
    speciesList: [],
    // 添加收支弹窗与表单
    showAddExpenseModal: false,
    parrotOptions: [],
    categoryOptions: [],
    canSubmitExpense: false,
    expenseForm: {
      type: '支出',
      parrotIndex: 0,
      categoryIndex: 0,
      amount: '',
      description: '',
      date: ''
    },
    // 类别标签列表（UI使用）
    incomeCategoryLabels: ['销售幼鸟','配种服务','其他收入'],
    expenseCategoryLabels: ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
  },

  onLoad() {
    this.setGreeting()
    this.checkLoginStatus()
    this.computeMenuRightPadding()
    this.computeModalCapsulePadding()
    // 初始化通知
    this.initNotifications()
  },

  // 计算右上角胶囊菜单到屏幕右侧的总内边距，便于自定义导航栏布局
  computeMenuRightPadding() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
      const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (win && rect && typeof win.windowWidth === 'number') {
        const rightGap = win.windowWidth - rect.right
        const menuRightPadding = rightGap + rect.width + 8
        this.setData({ menuRightPadding })
      }
    } catch (e) {
      this.setData({ menuRightPadding: 0 })
    }
  },

  // 为弹窗头部计算胶囊避让内边距
  computeModalCapsulePadding() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (win && rect && typeof win.windowWidth === 'number') {
        // 右侧需要预留：胶囊到屏幕右侧的距离 + 胶囊宽度 + 16px缓冲
        const rightGap = win.windowWidth - rect.right
        const modalRightPaddingPx = rightGap + rect.width + 16
        // 顶部微调，避免圆角与胶囊重叠
        const modalTopPaddingPx = Math.max(0, rect.top - 4)
        // 整体下移：以胶囊底部为基准，下方留出 12px
        const modalTopOffsetPx = Math.max(0, rect.bottom + 12)
        // 底部安全区：根据 safeArea 计算底部避让（再额外加 12px 让按钮更上移）
        let modalBottomOffsetPx = 24
        if (win && win.safeArea && typeof win.windowHeight === 'number') {
          const bottomInset = win.windowHeight - win.safeArea.bottom
          modalBottomOffsetPx = Math.max(24, bottomInset + 12)
        }
        this.setData({ modalRightPaddingPx, modalTopPaddingPx, modalTopOffsetPx, modalBottomOffsetPx })
      }
    } catch (e) {
      this.setData({ modalRightPaddingPx: 0, modalTopPaddingPx: 0, modalTopOffsetPx: 24, modalBottomOffsetPx: 24 })
    }
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
        this.loadHealthAlerts(),
        this.loadMyParrots() // 新增：加载我的鹦鹉（最多三只）
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

  // 新增：加载首页-我的鹦鹉（最多三只）
  async loadMyParrots() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { page: 1, limit: 3, sort_by: 'created_desc' }
      })
      if (res.success) {
        const parrots = (res.data.parrots || []).map(p => ({
          ...p,
          species_name: p.species && p.species.name ? p.species.name : (p.species_name || ''),
          health_text: ({
            healthy: '健康',
            sick: '生病',
            recovering: '康复中',
            observation: '观察中',
            excellent: '优秀'
          })[p.health_status] || '健康',
          photo_url: p.photo_url || '/images/default-parrot.svg'
        }))
        this.setData({ myParrots: parrots.slice(0, 3) })
      }
    } catch (error) {
      console.error('加载我的鹦鹉失败:', error)
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

  // 新增：从首页卡片打开鹦鹉详情
  openParrotDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/parrots/detail/detail?id=${id}`
    })
  },

  // 新增：卡片图片加载错误时替换为占位图
  handleIndexParrotImageError(e) {
    const id = e.currentTarget.dataset.id
    const parrots = (this.data.myParrots || []).map(p => {
      if (p.id === id) {
        return { ...p, photo_url: '/images/default-parrot.svg' }
      }
      return p
    })
    this.setData({ myParrots: parrots })
  },

  // 导航到记录页面
  navigateToStatistics() {
    wx.switchTab({
      url: '/pages/statistics/statistics'
    })
  },

  // 跳转到喂食记录页面
  navigateToFeedingRecords() {
    console.log('navigateToFeedingRecords 被调用')
    console.log('当前登录状态:', this.data.isLogin)
    
    if (!this.data.isLogin) {
      console.log('用户未登录，显示错误提示')
      app.showError('请先登录')
      return
    }
    
    console.log('准备跳转到喂食记录页面')
    wx.navigateTo({
      url: '/pages/records/feeding/feeding',
      success: () => {
        console.log('跳转到喂食记录页面成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        app.showError('跳转失败，请重试')
      }
    })
  },

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
      url: '/pages/records/cleaning/cleaning'
    })
  },

  // 快速健康检查
  quickHealth() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    wx.navigateTo({
      url: '/pages/records/health/health'
    })
  },

  // 快速繁殖记录
  quickBreeding() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }

    wx.navigateTo({
      url: '/pages/breeding/breeding'
    })
  },

  // 添加鹦鹉
  addParrot() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    // 直接打开首页添加鹦鹉弹窗
    this.setData({ showAddParrotModal: true })
    // 加载品种列表用于提交时映射 species_id
    this.loadSpeciesList()
  },

  // 快速添加收支：直接弹窗
  quickExpense() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    // 预备鹦鹉选项
    const parrotOptions = (this.data.myParrots || []).map(p => p.name)
    // 默认日期：今天
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    // 初始化类别选项为支出类别
    const categoryOptions = this.data.expenseCategoryLabels || ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']

    this.setData({
      showAddExpenseModal: true,
      parrotOptions,
      categoryOptions,
      canSubmitExpense: false,
      expenseForm: {
        type: '支出',
        parrotIndex: -1,
        categoryIndex: 0,
        amount: '',
        description: '',
        date: dateStr
      }
    })
  },

  // 进入用品购买页
  goToExpenseManagement() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }

    wx.navigateTo({
      url: '/pages/expenses/expenses'
    })
  },

  // 通知中心：初始化与交互
  initNotifications() {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    
    // 从本地存储加载通知
    const notifications = notificationManager.getLocalNotifications()
    const unreadCount = notificationManager.getUnreadCount()
    
    this.setData({ notifications, unreadCount })
    
    // 设置通知更新回调
    app.globalData.notificationUpdateCallback = () => {
      const updatedNotifications = notificationManager.getLocalNotifications()
      const updatedUnreadCount = notificationManager.getUnreadCount()
      this.setData({ 
        notifications: updatedNotifications, 
        unreadCount: updatedUnreadCount 
      })
    }
  },

  openNotifications() {
    this.setData({ showNotifications: true })
  },

  closeNotifications() {
    this.setData({ showNotifications: false })
  },

  markAllNotificationsRead() {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    notificationManager.markAllNotificationsRead()
  },

  clearAllNotifications() {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    notificationManager.clearAllNotifications()
  },

  handleNotificationTap(e) {
    const { id } = e.detail || {}
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    notificationManager.markNotificationRead(id)
  },



  // 弹窗：添加鹦鹉（参考APP设计）相关方法
  // 加载鹦鹉品种列表（用于将选择的中文品种映射到后端 species_id）
  async loadSpeciesList() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res.success) {
        const species = res.data || []
        const names = species.map(s => s.name)
        this.setData({ speciesList: species, parrotTypes: names })
      }
    } catch (e) {
      // 静默失败，不影响弹窗使用
    }
  },

  // 关闭弹窗并重置
  closeAddParrotModal() {
    this.setData({
      showAddParrotModal: false,
      newParrot: { name: '', type: '', weight: '', gender: '', color: '', birthDate: '', notes: '', parrot_number: '', ring_number: '', acquisition_date: '', photo_url: '' },
      typeIndex: 0
    })
  },

  // 阻止事件冒泡（避免点击内容区关闭弹窗）
  stopPropagation() {},

  // 输入绑定
  onParrotNameInput(e) { this.setData({ 'newParrot.name': e.detail.value }) },
  onParrotWeightInput(e) { this.setData({ 'newParrot.weight': e.detail.value }) },
  onParrotColorInput(e) { this.setData({ 'newParrot.color': e.detail.value }) },
  onParrotNotesInput(e) { this.setData({ 'newParrot.notes': e.detail.value }) },
  onBirthDateChange(e) { this.setData({ 'newParrot.birthDate': e.detail.value }) },
  onParrotNumberInput(e) { this.setData({ 'newParrot.parrot_number': e.detail.value }) },
  onRingNumberInput(e) { this.setData({ 'newParrot.ring_number': e.detail.value }) },
  onAcquisitionDateChange(e) { this.setData({ 'newParrot.acquisition_date': e.detail.value }) },
  onTypePickerChange(e) {
    const idx = Number(e.detail.value)
    const type = this.data.parrotTypes[idx]
    this.setData({ typeIndex: idx, 'newParrot.type': type })
  },
  setParrotGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({ 'newParrot.gender': gender })
  },

  // 选择/上传/预览/删除照片（与 add-parrot 逻辑保持一致）
  chooseParrotPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadParrotPhoto(tempFilePath)
      }
    })
  },
  async uploadParrotPhoto(filePath) {
    try {
      app.showLoading('上传中...')
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.baseUrl + '/api/upload/image',
          filePath: filePath,
          name: 'file',
          header: { 'X-OpenID': app.globalData.openid },
          success: resolve,
          fail: reject
        })
      })
      const result = JSON.parse(uploadRes.data)
      if (result.success) {
        const fullUrl = app.globalData.baseUrl + '/uploads/' + result.data.url
        this.setData({ 'newParrot.photo_url': fullUrl })
        app.showSuccess('上传成功')
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('上传照片失败:', error)
      app.showError('上传照片失败')
    } finally {
      app.hideLoading()
    }
  },
  previewParrotPhoto() {
    if (!this.data.newParrot.photo_url) return
    wx.previewImage({ urls: [this.data.newParrot.photo_url] })
  },
  deleteParrotPhoto() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 'newParrot.photo_url': '' })
        }
      }
    })
  },

  // 提交添加鹦鹉
  async submitNewParrot() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    const np = this.data.newParrot
    if (!np.name || !np.type) {
      app.showError('请填写必填项：名字与品种')
      return
    }
    let gender = 'unknown'
    if (np.gender === '雄性') gender = 'male'
    else if (np.gender === '雌性') gender = 'female'
    let species_id = ''
    try {
      const match = (this.data.speciesList || []).find(s => s.name === np.type)
      if (match) species_id = match.id
    } catch (_) { species_id = '' }
    let notes = np.notes || ''
    const payload = {
      name: np.name,
      species_id,
      gender,
      birth_date: np.birthDate || '',
      color: np.color || '',
      weight: np.weight || '',
      notes,
      parrot_number: np.parrot_number || '',
      ring_number: np.ring_number || '',
      acquisition_date: np.acquisition_date || '',
      photo_url: np.photo_url || ''
    }
    try {
      const res = await app.request({ url: '/api/parrots', method: 'POST', data: payload })
      if (res.success) {
        app.showSuccess('添加成功')
        this.closeAddParrotModal()
        if (typeof this.loadMyParrots === 'function') {
          this.loadMyParrots()
        }
      } else {
        app.showError(res.message || '添加失败')
      }
    } catch (e) {
      app.showError('网络错误，添加失败')
    }
  },

  /* ===== 收支弹窗逻辑 ===== */
  // 切换记录类型
  setExpenseType(e) {
    const type = e.currentTarget.dataset.type
    let categoryOptions = []
    if (type === '收入') {
      categoryOptions = this.data.incomeCategoryLabels || ['销售幼鸟','配种服务','其他收入']
    } else {
      categoryOptions = this.data.expenseCategoryLabels || ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
    }
    this.setData({
      'expenseForm.type': type,
      categoryOptions,
      'expenseForm.categoryIndex': 0
    })
    this.updateCanSubmitExpense()
  },

  // 选择鹦鹉
  onExpenseParrotChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ 'expenseForm.parrotIndex': idx })
  },

  // 选择类别
  onExpenseCategoryChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ 'expenseForm.categoryIndex': idx })
    this.updateCanSubmitExpense()
  },

  // 金额输入
  onExpenseAmountInput(e) {
    this.setData({ 'expenseForm.amount': e.detail.value })
    this.updateCanSubmitExpense()
  },

  // 描述输入
  onExpenseDescInput(e) {
    this.setData({ 'expenseForm.description': e.detail.value })
  },

  // 日期选择
  onExpenseDateChange(e) {
    this.setData({ 'expenseForm.date': e.detail.value })
    this.updateCanSubmitExpense()
  },

  // 更新提交可用态
  updateCanSubmitExpense() {
    const f = this.data.expenseForm || {}
    const ok = !!(f.amount && Number(f.amount) > 0 && this.data.categoryOptions && this.data.categoryOptions.length > 0)
    this.setData({ canSubmitExpense: ok })
  },

  // 关闭弹窗
  closeAddExpenseModal() {
    this.setData({
      showAddExpenseModal: false,
      expenseForm: {
        type: '支出',
        parrotIndex: 0,
        categoryIndex: 0,
        amount: '',
        description: '',
        date: ''
      },
      categoryOptions: [],
      canSubmitExpense: false
    })
  },

  // 提交收支记录（支出走后端，收入暂不支持后端）
  async submitExpenseRecord() {
    const f = this.data.expenseForm
    if (!f || !f.amount || Number(f.amount) <= 0) {
      app.showError('请输入有效金额')
      return
    }
    const categoryLabel = (this.data.categoryOptions || [])[f.categoryIndex] || ''
    if (!categoryLabel) {
      app.showError('请选择类别')
      return
    }

    // 映射鹦鹉ID（可选）
    let parrot_id = null
    const parrots = this.data.myParrots || []
    if (parrots.length > 0 && f.parrotIndex >= 0 && f.parrotIndex < parrots.length) {
      parrot_id = parrots[f.parrotIndex].id
    }

    if (f.type === '收入') {
      // 暂无收入后端接口，遵循UI设计仅展示交互
      app.showError('收入记录暂未支持后端提交')
      return
    }

    // 支出类别映射到后端值
    const expenseMap = {
      '食物': 'food',
      '医疗': 'medical',
      '玩具': 'toys',
      '笼具': 'cage',
      '幼鸟': 'baby_bird',
      '种鸟': 'breeding_bird',
      '其他': 'other'
    }
    const categoryValue = expenseMap[categoryLabel]
    if (!categoryValue) {
      app.showError('不支持的支出类别')
      return
    }

    // 组装payload
    const payload = {
      category: categoryValue,
      amount: Number(f.amount),
      description: f.description || '',
      expense_date: f.date || ''
    }
    if (parrot_id) payload.parrot_id = parrot_id

    try {
      const res = await app.request({
        url: '/api/expenses',
        method: 'POST',
        data: payload
      })
      if (res && res.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.closeAddExpenseModal()
      } else {
        app.showError((res && res.message) || '添加失败')
      }
    } catch (err) {
      console.error('提交支出记录失败:', err)
      app.showError('网络错误，添加失败')
    }
  }
})
