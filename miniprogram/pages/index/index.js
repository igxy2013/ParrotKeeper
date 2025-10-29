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
    expenseCategoryLabels: ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他'],
    // 弹窗避让参数（默认数值，避免组件收到非数字）
    modalTopOffsetPx: 24,
    modalBottomOffsetPx: 24,

    // PNG 图标路径（统一图标方案）
    iconPaths: {
      headerNotification: '/images/remix/ri-notification-3-line-white.png',
      // 统计卡片
      statsHeart: '/images/remix/ri-heart-fill-green.png',
      statsFeeding: '/images/remix/ri-restaurant-fill-orange.png',
      statsIncome: '/images/remix/ri-money-dollar-circle-fill-purple.png',
      statsExpense: '/images/remix/ri-shopping-bag-fill-blue.png',
      // 标题内图标
      myParrotsTitleHeart: '/images/remix/ri-heart-fill-green.png',
      // 默认占位图
      defaultParrot: '/images/default-parrot.png',
      // 快捷操作
      actions: {
        quickFeeding: '/images/remix/ri-restaurant-fill-orange.png',
        quickHealth: '/images/remix/ri-heart-fill-purple.png',
        quickCleaning: '/images/remix/ri-calendar-fill-blue.png',
        quickBreeding: '/images/remix/ri-book-fill-green.png',
        addParrot: '/images/remix/ri-add-fill-emerald.png',
        quickExpense: '/images/remix/ri-money-dollar-circle-fill-blue.png',
        expenseMgmt: '/images/remix/ri-book-fill-orange.png',
        statistics: '/images/remix/ri-bar-chart-fill-purple.png'
      },
      // 通知与表单图标
      alertInfo: '/images/remix/ri-information-fill-amber.png',
      closeWhite: '/images/icons/close-white.png',
      labelHeart: '/images/icons/heart.png',
      labelLeaf: '/images/icons/leaf.png',
      labelHash: '/images/icons/hash.png',
      labelCoin: '/images/icons/coin.png',
      labelScale: '/images/icons/scale.png',
      labelUser: '/images/icons/user.png',
      labelPalette: '/images/icons/palette.png',
      labelCalendar: '/images/icons/calendar.png',
      labelHome: '/images/icons/home.png',
      labelCamera: '/images/icons/camera.png',
      labelNote: '/images/icons/note.png',
      trashWhite: '/images/icons/trash-white.png'
    }
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
    // 到点后补偿生成当天的本地定时提醒（避免仅在onLoad时触发）
    try {
      const app = getApp();
      const nm = app.globalData.notificationManager;
      nm.generateDailyRemindersForToday();
      const notifications = nm.getLocalNotifications();
      const unreadCount = nm.getUnreadCount();
      this.setData({ notifications, unreadCount });

      // 在页面可见期间，每60秒轮询一次到点生成提醒
      if (this._reminderTimer) {
        clearInterval(this._reminderTimer);
      }
      this._reminderTimer = setInterval(() => {
        try {
          nm.generateDailyRemindersForToday();
          const updated = nm.getLocalNotifications();
          const updatedUnread = nm.getUnreadCount();
          this.setData({ notifications: updated, unreadCount: updatedUnread });
        } catch (_) {}
      }, 60000);
    } catch (_) {}
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

  onHide() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
    }
  },

  onUnload() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
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
        const overview = res.data
        const overviewStatusText = this.getHealthStatusText(overview)
        this.setData({
          overview,
          overview_status_text: overviewStatusText
        })
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  },

  // 生成首页健康状态文案，保证单/多行均对齐
  getHealthStatusText(overview = {}) {
    try {
      const hs = overview.health_status || null
      if (hs) {
        const parts = []
        if (hs.healthy > 0) parts.push(`${hs.healthy}只鹦鹉状态良好`)
        if (hs.sick > 0) parts.push(`${hs.sick}只鹦鹉生病`)
        if (hs.recovering > 0) parts.push(`${hs.recovering}只鹦鹉恢复中`)
        if (parts.length > 0) return parts.join('，')
      }
      // 回退：仅显示总数良好
      const total = (overview && overview.total_parrots) || 0
      return `${total}只鹦鹉状态良好`
    } catch (e) {
      const total = (overview && overview.total_parrots) || 0
      return `${total}只鹦鹉状态良好`
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
          photo_url: p.photo_url || this.data.iconPaths.defaultParrot
        }))
        this.setData({ myParrots: parrots.slice(0, 3) })
      }
    } catch (error) {
      console.error('加载我的鹦鹉失败:', error)
    }
  },

  // 解析服务端时间字符串，处理缺失时区的情况
  parseServerTime(value) {
    if (!value) return null
    try {
      if (value instanceof Date) return value
      if (typeof value === 'number') {
        const dNum = new Date(value)
        return isNaN(dNum.getTime()) ? null : dNum
      }
      if (typeof value === 'string') {
        const s = value.trim()
        // 仅日期：YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return new Date(`${s}T00:00:00`)
        }
        // 含有 T 的 ISO 日期时间
        if (s.includes('T')) {
          // 已包含 Z 或时区偏移，直接解析
          if (/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
            const d = new Date(s)
            return isNaN(d.getTime()) ? null : d
          }
          // 无时区信息，按 UTC 处理以纠正服务器以 UTC 存储的时间
          const dUtc = new Date(s + 'Z')
          if (!isNaN(dUtc.getTime())) return dUtc
          // 兜底：按本地解析
          const dLocal = new Date(s)
          return isNaN(dLocal.getTime()) ? null : dLocal
        }
        // 空格分隔的日期时间
        const isoLocal = s.replace(' ', 'T')
        // 优先按 UTC 解析
        let d = new Date(isoLocal + 'Z')
        if (!isNaN(d.getTime())) return d
        // 兜底：本地解析
        d = new Date(isoLocal)
        if (!isNaN(d.getTime())) return d
        // iOS 兜底
        d = new Date(s.replace(/-/g, '/'))
        return isNaN(d.getTime()) ? null : d
      }
      return null
    } catch (e) {
      return null
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
            const parrotName = record.parrot_name || (record.parrot && record.parrot.name) || ''
            const recordType = record.record_type || '健康检查'
            const rawTime = record.record_date
            const dt = this.parseServerTime(rawTime)
            allRecords.push({
              id: `health_${record.id}`,
              title: `进行了${recordType}`,
              type: 'health',
              parrot_name: parrotName,
              timeValue: dt ? dt.toISOString() : rawTime,
              timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(rawTime)
            })
          })
        }
        
        // 清洁记录聚合
        const cleaningAgg = this.aggregateRecentCleaning(res.data.cleaning || [])
        cleaningAgg.forEach(item => allRecords.push(item))
        
        // 处理繁殖记录（保持非聚合）
        if (res.data.breeding && Array.isArray(res.data.breeding)) {
          res.data.breeding.forEach(record => {
            const maleName = record.male_parrot_name || (record.male_parrot && record.male_parrot.name) || ''
            const femaleName = record.female_parrot_name || (record.female_parrot && record.female_parrot.name) || ''
            const rawTime = record.mating_date || record.created_at
            allRecords.push({
              id: `breeding_${record.id}`,
              title: '进行了配对',
              type: 'breeding',
              parrot_name: `${maleName} × ${femaleName}`,
              timeValue: rawTime,
              timeText: app.formatRelativeTime(rawTime)
            })
          })
        }
        
        // 按时间排序，最新的在前（使用解析后的时间）
        allRecords.sort((a, b) => {
          const da = this.parseServerTime(a.timeValue || a.time)
          const db = this.parseServerTime(b.timeValue || b.time)
          const ma = da ? da.getTime() : 0
          const mb = db ? db.getTime() : 0
          return mb - ma
        })
        
        // 只取前5条
        const recentRecords = allRecords.slice(0, 5).map(item => {
          const iconMapPng = {
            feeding: '/images/remix/ri-restaurant-fill-white.png',
            health: '/images/remix/ri-heart-fill-white.png',
            cleaning: '/images/remix/ri-calendar-fill-white.png',
            breeding: '/images/remix/ri-calendar-fill-white.png'
          }
          const iconPath = iconMapPng[item.type] || '/images/remix/ri-calendar-fill-white.png'
          return { ...item, iconPath }
        })
        
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
      const dt = this.parseServerTime(time)
      const key = `${time}_${record.notes || ''}_${record.amount || ''}`
      if (!grouped[key]) {
        grouped[key] = {
          id: `feeding_group_${record.id || key}`,
          type: 'feeding',
          timeValue: dt ? dt.toISOString() : time,
          timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(time),
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
      title: `喂食了${item.feed_type_names.join('、')}`,
      type: 'feeding',
      parrot_name: item.parrot_names.join('、'),
      timeValue: item.timeValue,
      timeText: item.timeText
    }))
    // 按时间倒序
    result.sort((a, b) => {
      const da = this.parseServerTime(b.timeValue || b.time)
      const db = this.parseServerTime(a.timeValue || a.time)
      const ma = da ? da.getTime() : 0
      const mb = db ? db.getTime() : 0
      return ma - mb
    })
    return result
  },

  // 聚合首页清洁记录
  aggregateRecentCleaning(records) {
    const grouped = {}
    records.forEach(record => {
      const time = record.cleaning_time
      const dt = this.parseServerTime(time)
      // 与清洁列表页保持一致：按时间 + 备注 + 描述分组
      // 这样可将同一时间的多清洁类型合并为一组
      const key = `${time}_${record.notes || ''}_${record.description || ''}`
      if (!grouped[key]) {
        grouped[key] = {
          id: `cleaning_group_${record.id || key}`,
          type: 'cleaning',
          timeValue: dt ? dt.toISOString() : time,
          timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(time),
          parrot_names: [],
          cleaning_type_names: [],
          cleaning_type_ids: []
        }
      }
      const parrotName = record.parrot_name || (record.parrot && record.parrot.name) || ''
      if (parrotName && !grouped[key].parrot_names.includes(parrotName)) {
        grouped[key].parrot_names.push(parrotName)
      }
      // 收集合并清洁类型名称与ID
      const name = record.cleaning_type_text || record.cleaning_type || '清洁'
      if (name && !grouped[key].cleaning_type_names.includes(name)) {
        grouped[key].cleaning_type_names.push(name)
      }
      if (record.cleaning_type && !grouped[key].cleaning_type_ids.includes(record.cleaning_type)) {
        grouped[key].cleaning_type_ids.push(record.cleaning_type)
      }
    })
    const result = Object.values(grouped).map(item => {
      const typeNames = item.cleaning_type_names
      const display = typeNames.length <= 1
        ? (typeNames[0] || '清洁')
        : '综合清洁'
      return {
        id: item.id,
        title: `进行了${display}`,
        type: 'cleaning',
        parrot_name: item.parrot_names.join('、'),
        timeValue: item.timeValue,
        timeText: item.timeText
      }
    })
    // 按时间倒序
    result.sort((a, b) => {
      const da = this.parseServerTime(b.timeValue || b.time)
      const db = this.parseServerTime(a.timeValue || a.time)
      const ma = da ? da.getTime() : 0
      const mb = db ? db.getTime() : 0
      return ma - mb
    })
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
                url: `${getApp().globalData.baseUrl}/api/auth/login`,
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
    wx.navigateTo({
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
        return { ...p, photo_url: '/images/default-parrot.png' }
      }
      return p
    })
    this.setData({ myParrots: parrots })
  },

  // 通用：图标加载失败自动回退到 SVG
  handleIconError(e) {
    try {
      const keyPath = e.currentTarget.dataset.key
      if (!keyPath) return
      const current = this.data.iconPaths || {}
      const next = JSON.parse(JSON.stringify(current))
      const setByPath = (obj, path, value) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i]
          if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
          cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
      }
      const getByPath = (obj, path) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length; i++) {
          cur = cur[parts[i]]
          if (cur === undefined || cur === null) return null
        }
        return cur
      }
      const replaceExt = (p, toExt) => {
        if (!p || typeof p !== 'string') return p
        return p.replace(/\.(png|svg)$/i, `.${toExt}`)
      }
      const curVal = getByPath(next, keyPath)
      if (typeof curVal === 'string') {
        setByPath(next, keyPath, replaceExt(curVal, 'svg'))
        this.setData({ iconPaths: next })
      }
    } catch (_) {}
  },

  // 最近活动图标加载失败时降级为 SVG
  handleActivityIconError(e) {
    try {
      const idx = e.currentTarget.dataset.index
      const list = (this.data.recentRecords || []).slice()
      const item = list[idx]
      if (item && item.iconPath) {
        item.iconPath = item.iconPath.replace(/\.(png|svg)$/i, '.svg')
        list[idx] = item
        this.setData({ recentRecords: list })
      }
    } catch (_) {}
  },

  // 导航到记录页面
  navigateToStatistics() {
    // 与底部导航一致使用 reLaunch，避免非TabBar页面 switchTab 无效
    wx.reLaunch({
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
      url: '/pages/health-check/health-check'
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

  // 快速添加收支记录
  quickExpense() {
    this.setData({
      showAddExpenseModal: true
    });
  },

  // 关闭添加收支记录弹窗
  closeAddExpenseModal() {
    this.setData({
      showAddExpenseModal: false
    });
  },

  // 收支记录添加成功回调
  onExpenseSuccess() {
    this.setData({
      showAddExpenseModal: false
    });
    // 刷新页面数据
    this.loadData();
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
    
    // 生成当天的定时提醒（到点后生成一次，避免重复）
    try { notificationManager.generateDailyRemindersForToday() } catch (_) {}

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

  // 组件版提交（parrot-modal触发的submit事件）
  async submitNewParrotFromComponent(e) {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    const payload = (e && e.detail && e.detail.data) || null
    if (!payload || !payload.name) {
      app.showError('请填写必填项：名字与品种')
      return
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
    } catch (error) {
      app.showError('网络错误，添加失败')
    }
  },

  /* ===== 收支弹窗逻辑 ===== */
})

