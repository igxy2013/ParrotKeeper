// pages/index/index.js
const app = getApp()
const { parseServerTime } = require('../../utils/time')
const chickCare = require('../../utils/chick-care.js')
const cache = require('../../utils/cache')

Page({
  data: {
    greeting: '早上好',
    // 首页欢迎语：默认“今天也要好好照顾小家伙们哦”，当仅有1只鹦鹉时改为“今天是你和XX相处的第YY天！”
    welcomeMessage: '今天也要好好照顾小家伙们哦',
    isSingleParrot: false,
    singleParrotName: '',
    singleParrotDays: 1,
    userInfo: {},
    isLogin: false,
    overview: {
      total_parrots: 0,
      today_records: {
        feeding: 0
      },
      monthly_income: 0,
      monthly_expense: 0
    },
    recentRecords: [],
    healthAlerts: [],
    healthAlertsTotal: 0,
    weather: null,
    menuRightPadding: 0,
    // 新增：我的鹦鹉（首页展示最多三只）
    myParrots: [],
    // 新增：通知中心
    showNotifications: false,
    notifications: [],
    unreadCount: 0,
    incubatingEggCount: 0,
    // 公告弹窗
    showAnnouncementModal: false,
    latestAnnouncement: null,
    // 新增：首页卡片自定义
    homeWidgets: ['parrots','feeding_today','monthly_income','monthly_expense','weight_trend'],
    // 隐藏的卡片列表与映射
    hiddenWidgets: [],
    hiddenWidgetsMap: {},
    availableWidgetsToAdd: [],
    // 拖拽排序相关状态
    draggingWidgetId: null,
    dragTargetVisibleIndex: -1,
    dragRects: [],
    dragGhost: null,
    // 编辑模式状态
    isEditMode: false,
    availableWidgets: [
      { id: 'parrots', name: '我的鹦鹉', icon: '/images/remix/ri-heart-fill-green.png' },
      { id: 'feeding_today', name: '今日喂食', icon: '/images/remix/ri-restaurant-fill-orange.png' },
      { id: 'monthly_income', name: '月收入', icon: '/images/remix/ri-money-dollar-circle-fill-purple.png' },
      { id: 'monthly_expense', name: '月支出', icon: '/images/remix/ri-shopping-bag-fill-blue.png' },
      { id: 'weight_trend', name: '体重趋势', icon: '/images/chart.png' }
    ],

    // 新增：首页体重趋势数据
    homeWeightSeries: [],

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
    incomeCategoryLabels: ['繁殖销售','鸟类销售','服务收入','比赛奖金','其他收入'],
    expenseCategoryLabels: ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他'],
    // 弹窗避让参数（默认数值，避免组件收到非数字）
    modalTopOffsetPx: 24,
    modalBottomOffsetPx: 24,
    // 通用：数量限制弹窗
    showLimitModal: false,
    limitCount: 5,

    // 通用：无权限提示弹窗
    showPermissionModal: false,
    permissionMessage: '',

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
      defaultParrot: '/images/parrot-avatar-green.svg',
      logo: '/images/logo.png',
      // 快捷操作
      actions: {
        quickFeeding: '/images/remix/ri-restaurant-fill-orange.png',
        quickHealth: '/images/remix/ri-heart-fill-purple.png',
        quickCleaning: '/images/remix/ri-calendar-fill-blue.png',
        quickBreeding: '/images/remix/ri-book-fill-green.png',
        addParrot: '/images/remix/ri-add-fill-emerald.png',
        quickExpense: '/images/remix/ri-money-dollar-circle-fill-blue.png',
        expenseMgmt: '/images/remix/ri-book-fill-orange.png',
        pairingCalculator: '/images/remix/group-3-fill.png'
      },
      // 性别 PNG 图标
      genderMale: '/images/remix/men-line.png',
      genderFemale: '/images/remix/women-line.png',
      genderUnknown: '/images/remix/question-mark.png',
      // 通知与表单图标
      alertInfo: '/images/remix/ri-information-fill-amber.png',
      alertInfoLow: '/images/remix/ri-information-fill-green.png',
      alertInfoMedium: '/images/remix/ri-information-fill-amber.png',
      alertInfoHigh: '/images/remix/ri-information-fill-red.png',
    }
  },

  // 引导状态
  onGuideShownOnce: false,

  onLoad(options) {
    this.setGreeting()
    this.checkLoginStatus()
    this.computeMenuRightPadding()
    this.computeModalCapsulePadding()
    // 初始化通知
    this.initNotifications()
    // 加载首页卡片配置
    this.loadHomeWidgets()
    // 加载用户自定义排序
    this.loadHomeWidgetsOrder()

    // 处理从底部导航“加号”跳转过来的自动弹窗参数
    const shouldOpenAddParrot = options && (options.openAddParrot === '1' || options.openAddParrot === 'true')
    if (shouldOpenAddParrot) {
      this._openAddParrotOnShow = true
    }
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
      const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
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
    const isLogin = this.data.isLogin
    if (!isLogin) {
      try { this.loadHealthAlerts() } catch (_) {}
    }
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
    // 拉取公告并注入通知与弹窗
    this.fetchPublishedAnnouncementsAndInject()
    // 无论是否登录都可以浏览首页，但只有登录用户才加载个人数据
    if (isLogin) {
      this.syncServerReminderSettings().then(()=>{}).catch(()=>{})
      // 检查是否需要刷新数据（模式切换后）
      if (app.globalData.needRefresh) {
        console.log('检测到needRefresh标志，刷新首页数据');
        app.globalData.needRefresh = false; // 重置标志
      }
      this.loadData()
      try { this.prefetchHomePagesOnce() } catch (_) {}
    }

    this.checkAndShowGestureGuide()

    // 如有需要，在页面显示时自动弹出“添加鹦鹉”弹窗
    if (this._openAddParrotOnShow) {
      this._openAddParrotOnShow = false
      if (this.data.isLogin) {
        try { if (app && typeof app.ensureEffectivePermissions === 'function') app.ensureEffectivePermissions() } catch(_){ }
        this.addParrot()
      } else {
        app.showError('请先登录后添加鹦鹉')
      }
    }
  },

  prefetchHomePagesOnce() {
    try {
      const done = wx.getStorageSync('home_prefetch_done')
      if (done) return
      wx.setStorageSync('home_prefetch_done', 1)
    } catch (_) {}
    setTimeout(() => { this._prefetchMyParrotsDefault() }, 0)
    setTimeout(() => { this._prefetchStatisticsDefault() }, 10)
    setTimeout(() => { this._prefetchProfileDefault() }, 20)
  },

  async _prefetchMyParrotsDefault() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { page: 1, per_page: 10, sort_by: 'created_at', sort_order: 'desc' }
      })
      if (res && res.success) {
        const parrots = Array.isArray(res.data && res.data.parrots) ? res.data.parrots : []
        const total = (res.data && (res.data.total || res.data.count)) || parrots.length
        cache.set('parrots_list_default_raw', { parrots, total, hasMore: parrots.length === 10 }, 180000)
      }
    } catch (_) {}
  },

  async _prefetchStatisticsDefault() {
    try {
      const tasks = []
      tasks.push(app.request({ url: '/api/statistics/overview', method: 'GET' }))
      tasks.push(app.request({ url: '/api/statistics/feeding-trends', method: 'GET', data: { days: 7 } }))
      tasks.push(app.request({ url: '/api/statistics/expense-analysis', method: 'GET' }))
      tasks.push(app.request({ url: '/api/statistics/care-frequency', method: 'GET' }))
      tasks.push(app.request({ url: '/api/statistics/weight-trends', method: 'GET', data: { days: 30 } }))
      const [overviewRes, feedRes, expenseRes, careRes, weightRes] = await Promise.all(tasks)
      try { if (overviewRes && overviewRes.success) cache.set('stats_overview', overviewRes.data, 180000) } catch (_) {}
      try { if (feedRes && feedRes.success) cache.set('stats_feedingTrends_7', feedRes.data, 180000) } catch (_) {}
      try { if (expenseRes && expenseRes.success) cache.set('stats_expenseAnalysis', expenseRes.data, 180000) } catch (_) {}
      try { if (careRes && careRes.success) cache.set('stats_careFrequency', careRes.data, 180000) } catch (_) {}
      try {
        if (weightRes && weightRes.success && weightRes.data && Array.isArray(weightRes.data.series)) {
          cache.set('stats_weightTrends_30', weightRes.data.series, 180000)
        }
      } catch (_) {}
    } catch (_) {}
  },

  async _prefetchProfileDefault() {
    try {
      const res = await app.request({ url: '/api/auth/profile', method: 'GET' })
      if (res && res.success && res.data) {
        const merged = { ...(app.globalData && app.globalData.userInfo) || {}, ...res.data }
        app.globalData.userInfo = merged
        try { wx.setStorageSync('userInfo', merged) } catch (_) {}
      }
    } catch (_) {}
  },

  // 同步后端提醒设置到本地（确保“健康提醒不再提醒”等偏好在清缓存后仍生效）
  async syncServerReminderSettings() {
    const app = getApp()
    if (!app.globalData || !app.globalData.openid) return
    try {
      const res = await app.request({ url: '/api/reminders/settings', method: 'GET' })
      if (res && res.success && res.data) {
        const data = res.data
        const nm = app.globalData.notificationManager
        const current = nm.getNotificationSettings()
        const next = { ...current }
        if (typeof data.enabled !== 'undefined') next.enabled = !!data.enabled
        if (typeof data.feedingReminder !== 'undefined') next.feedingReminder = !!data.feedingReminder
        if (typeof data.healthReminder !== 'undefined') next.healthReminder = !!data.healthReminder
        if (typeof data.cleaningReminder !== 'undefined') next.cleaningReminder = !!data.cleaningReminder
        if (typeof data.medicationReminder !== 'undefined') next.medicationReminder = !!data.medicationReminder
        if (typeof data.breedingReminder !== 'undefined') next.breedingReminder = !!data.breedingReminder
        if (data.feedingReminderTime) next.feedingReminderTime = data.feedingReminderTime
        if (data.cleaningReminderTime) next.cleaningReminderTime = data.cleaningReminderTime
        if (data.medicationReminderTime) next.medicationReminderTime = data.medicationReminderTime
        if (data.healthAlertPreferences && typeof data.healthAlertPreferences === 'object') {
          next.healthAlertPreferences = data.healthAlertPreferences
        }
        if (Array.isArray(data.pinnedHealthAlertTypes)) {
          try { wx.setStorageSync('pinnedHealthAlertTypes_global', data.pinnedHealthAlertTypes) } catch (_) {}
        }
        nm.saveNotificationSettings(next)
        try { this.loadHealthAlerts() } catch (_) {}
      }
    } catch (err) {
      console.warn('同步后端提醒设置失败:', err)
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
    this._forceRefresh = true
    this.loadData().finally(() => {
      this._forceRefresh = false
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
    
    // 注释掉自动跳转逻辑，允许用户在未登录状态下查看首页
    // if (!isLogin) {
    //   console.log('用户未登录，跳转到登录页面')
    //   wx.navigateTo({
    //     url: '/pages/login/login'
    //   })
    // }
  },

  // 加载数据
  async loadData() {
    try {
      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      const isAdmin = !!(app && typeof app.hasOperationPermission === 'function' && app.hasOperationPermission())
      if (mode === 'team' && !isAdmin) {
        try {
          const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
          const teamId = cur && cur.success && cur.data && cur.data.id
          const userId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
          let noGroup = false
          if (teamId && userId) {
            const membersRes = await app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
            if (membersRes && membersRes.success && Array.isArray(membersRes.data)) {
              const me = membersRes.data.find(m => String(m.user_id || m.id) === String(userId))
              const groupId = me && (typeof me.group_id !== 'undefined' ? me.group_id : null)
              noGroup = !groupId
            }
          }
          if (noGroup) {
            this.setData({
              overview: { total_parrots: 0, today_records: { feeding: 0 }, monthly_income: 0, monthly_expense: 0 },
              overview_status_text: '0只鹦鹉状态良好',
              myParrots: [],
              recentRecords: [],
              homeWeightSeries: []
            })
            return
          }
        } catch(_) {}
      }
      await Promise.all([
        this.loadOverview(),
        this.loadRecentRecords(),
        this.loadHealthAlerts(),
        this.loadMyParrots(), // 首页-我的鹦鹉
        this.loadHomeWeightTrends() // 首页-体重趋势数据
      ])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  },

  // 加载概览数据
  async loadOverview() {
    try {
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get('index_overview')
      if (cached) {
        const overviewStatusText = this.getHealthStatusText(cached)
        this.setData({
          overview: {
            total_parrots: cached.total_parrots || 0,
            today_records: { feeding: (cached.today_records && cached.today_records.feeding) || 0 },
            monthly_income: cached.monthly_income || 0,
            monthly_expense: cached.monthly_expense || 0,
            ...cached
          },
          overview_status_text: overviewStatusText
        })
        return
      }
      const res = await app.request({ url: '/api/statistics/overview', method: 'GET' })
      if (res.success) {
        const overview = res.data
        const overviewStatusText = this.getHealthStatusText(overview)
        this.setData({
          overview: {
            total_parrots: overview.total_parrots || 0,
            today_records: { feeding: (overview.today_records && overview.today_records.feeding) || 0 },
            monthly_income: overview.monthly_income || 0,
            monthly_expense: overview.monthly_expense || 0,
            ...overview
          },
          overview_status_text: overviewStatusText
        })
        cache.set('index_overview', overview, 180000)
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  },

  // 新增：加载/保存首页卡片配置
  async loadHomeWidgets() {
    try {
      const stored = wx.getStorageSync('hiddenWidgets')
      let hiddenWidgets = []
      if (Array.isArray(stored)) {
        hiddenWidgets = stored
      } else if (stored && typeof stored === 'object') {
        // 兼容旧版本以对象/映射形式存储的隐藏项
        hiddenWidgets = Object.keys(stored).filter(k => !!stored[k])
      } else {
        hiddenWidgets = []
      }
      // 防护：如果全部卡片都被隐藏，则自动重置为空
      const totalWidgets = (this.data.homeWidgets || []).length
      if (hiddenWidgets.length >= totalWidgets && totalWidgets > 0) {
        console.warn('检测到所有首页卡片均隐藏，自动恢复为默认显示')
        hiddenWidgets = []
        this.saveHiddenWidgets(hiddenWidgets)
      }
      this.setData({ hiddenWidgets })
      this.updateHiddenWidgetsMap()
      this.setData({ availableWidgetsToAdd: this.getAvailableWidgetsToAdd() })
    } catch (error) {
      console.error('加载隐藏卡片配置失败:', error)
    }
  },

  // 加载自定义排序（若存储中有有效顺序则应用）
  loadHomeWidgetsOrder() {
    try {
      const stored = wx.getStorageSync('homeWidgetsOrder')
      const defaults = ['parrots','feeding_today','monthly_income','monthly_expense','weight_trend']
      const validIds = (this.data.availableWidgets || []).map(w => w.id)
      if (Array.isArray(stored)) {
        // 过滤为所有可用组件ID中的有效项
        const valid = stored.filter(id => validIds.includes(id))
        const missing = defaults.filter(id => !valid.includes(id))
        const ordered = [...valid, ...missing]
        this.setData({ homeWidgets: ordered })
      }
    } catch (e) {
      // 忽略错误，使用默认顺序
    }
  },

  saveHomeWidgetsOrder(order) {
    try { wx.setStorageSync('homeWidgetsOrder', order) } catch (_) {}
  },

  // 编辑模式下阻止页面滚动（用于 catchtouchmove）
  blockTouchMove() {
    // 空函数即可，catchtouchmove 会阻止滚动与事件继续冒泡到页面
  },
  
  // 保存隐藏卡片配置
  async saveHiddenWidgets(hiddenWidgets) {
    try {
      wx.setStorageSync('hiddenWidgets', hiddenWidgets)
    } catch (error) {
      console.error('保存隐藏卡片配置失败:', error)
    }
  },

  // 根据数组生成映射，供 WXML 高效判断
  updateHiddenWidgetsMap() {
    const src = this.data.hiddenWidgets
    const list = Array.isArray(src)
      ? src
      : (src && typeof src === 'object')
        ? Object.keys(src).filter(k => !!src[k])
        : []
    const map = {}
    list.forEach(id => { map[id] = true })
    this.setData({ hiddenWidgetsMap: map })
  },
  
  // 保留原有方法以兼容
  async saveHomeWidgets(widgets) {
    // 这个方法现在不再使用，但保留以防其他地方调用
    console.log('saveHomeWidgets 方法已废弃，请使用 saveHiddenWidgets')
  },

  // 进入编辑模式
  openWidgetPicker() {
    this.setData({ isEditMode: true })
    wx.vibrateShort() // 触觉反馈
  },

  // 退出编辑模式
  exitEditMode() {
    this.setData({ isEditMode: false, draggingWidgetId: null, dragTargetVisibleIndex: -1 })
  },

  // 移除卡片（添加到隐藏列表）
  removeWidget(e) {
    const widgetId = e.currentTarget.dataset.widget
    console.log('removeWidget tap:', widgetId)
    if (!this.data.hiddenWidgets.includes(widgetId)) {
      const newHiddenWidgets = [...this.data.hiddenWidgets, widgetId]
      this.setData({ hiddenWidgets: newHiddenWidgets })
      this.saveHiddenWidgets(newHiddenWidgets)
      this.updateHiddenWidgetsMap()
      this.setData({ availableWidgetsToAdd: this.getAvailableWidgetsToAdd() })
      try { wx.vibrateShort() } catch (_) {}
      wx.showToast({ title: '已隐藏', icon: 'success', duration: 800 })
    }
  },

  // 添加卡片（从隐藏列表中移除）
  addWidget(e) {
    const widgetId = e.currentTarget.dataset.widget
    // 情况1：已在隐藏列表 -> 从隐藏中移除，恢复显示
    if (this.data.hiddenWidgets.includes(widgetId)) {
      const newHiddenWidgets = this.data.hiddenWidgets.filter(id => id !== widgetId)
      this.setData({ hiddenWidgets: newHiddenWidgets })
      this.saveHiddenWidgets(newHiddenWidgets)
      this.updateHiddenWidgetsMap()
      this.setData({ availableWidgetsToAdd: this.getAvailableWidgetsToAdd() })
    } else {
      // 情况2：不在隐藏列表，可能是新卡片 -> 加入首页顺序并持久化
      if (!(this.data.homeWidgets || []).includes(widgetId)) {
        const newOrder = [...(this.data.homeWidgets || []), widgetId]
        this.setData({ homeWidgets: newOrder })
        this.saveHomeWidgetsOrder(newOrder)
      }
      // 刷新可添加列表
      this.setData({ availableWidgetsToAdd: this.getAvailableWidgetsToAdd() })
    }
  },

  // 恢复默认显示（清空所有隐藏项）
  resetHiddenWidgets() {
    try {
      const empty = []
      this.setData({ hiddenWidgets: empty })
      this.saveHiddenWidgets(empty)
      this.updateHiddenWidgetsMap()
      this.setData({ availableWidgetsToAdd: this.getAvailableWidgetsToAdd() })
      wx.showToast({ title: '已恢复默认', icon: 'success' })
    } catch (e) {
      console.error('恢复默认失败', e)
      wx.showToast({ title: '恢复失败', icon: 'none' })
    }
  },

  // 获取可添加的卡片列表（被隐藏的卡片）
  getAvailableWidgetsToAdd() {
    const map = this.data.hiddenWidgetsMap || {}
    const current = this.data.homeWidgets || []
    // 可添加：当前被隐藏的，或尚未加入首页顺序的新卡
    return (this.data.availableWidgets || []).filter(widget => !!map[widget.id] || !current.includes(widget.id))
  },

  // 计算当前可见卡片（用于拖拽排序）
  getVisibleWidgets() {
    const map = this.data.hiddenWidgetsMap || {}
    return (this.data.homeWidgets || []).filter(id => !map[id])
  },

  // 采集可见卡片的位置信息
  computeWidgetRects(cb) {
    try {
      const q = wx.createSelectorQuery().in(this)
      q.selectAll('.widget-wrapper').boundingClientRect(rects => {
        if (Array.isArray(rects)) {
          this.setData({ dragRects: rects })
          if (typeof cb === 'function') cb(rects)
        }
      }).exec()
    } catch (e) {}
  },

  // 拖拽开始
  onDragStart(e) {
    if (!this.data.isEditMode) return
    const id = e.currentTarget.dataset.id
    const touch = (e.touches && e.touches[0]) || {}
    this.setData({ draggingWidgetId: id })
    this.computeWidgetRects((rects) => {
      const vis = this.getVisibleWidgets()
      const idx = vis.indexOf(id)
      if (idx >= 0 && rects[idx]) {
        const r = rects[idx]
        const dx = (touch.clientX || 0) - r.left
        const dy = (touch.clientY || 0) - r.top
        this.setData({ dragGhost: { id, x: r.left, y: r.top, w: r.width, h: r.height, dx, dy } })
      }
    })
  },

  // 拖拽移动，计算目标插入位置（按可见列表顺序）
  onDragMove(e) {
    if (!this.data.isEditMode || !this.data.draggingWidgetId) return
    const touches = e.touches || []
    if (!touches.length) return
    const y = touches[0].clientY
    const x = touches[0].clientX
    const rects = this.data.dragRects || []
    if (!rects.length) return
    // 找到距离最近的卡片中心点索引
    let nearestIdx = 0
    let nearestDist = Infinity
    rects.forEach((r, idx) => {
      const cy = r.top + r.height / 2
      const d = Math.abs(y - cy)
      if (d < nearestDist) { nearestDist = d; nearestIdx = idx }
    })
    this.setData({ dragTargetVisibleIndex: nearestIdx })
    // 更新拖拽浮层位置
    const g = this.data.dragGhost
    if (g) {
      const nx = x - (g.dx || 0)
      const ny = y - (g.dy || 0)
      this.setData({ dragGhost: { ...g, x: nx, y: ny } })
    }
  },

  // 拖拽结束，重排顺序并持久化
  onDragEnd() {
    if (!this.data.isEditMode || !this.data.draggingWidgetId) return
    const id = this.data.draggingWidgetId
    const vis = this.getVisibleWidgets()
    const fromIdx = vis.indexOf(id)
    const toIdx = this.data.dragTargetVisibleIndex
    this.setData({ draggingWidgetId: null, dragTargetVisibleIndex: -1, dragRects: [], dragGhost: null })
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    // 生成新的可见顺序
    const newVisible = vis.filter(v => v !== id)
    newVisible.splice(toIdx, 0, id)
    // 保留隐藏项在末尾，保持其相对顺序
    const hidden = (this.data.homeWidgets || []).filter(w => this.data.hiddenWidgetsMap && this.data.hiddenWidgetsMap[w])
    const newOrder = [...newVisible, ...hidden]
    this.setData({ homeWidgets: newOrder })
    this.saveHomeWidgetsOrder(newOrder)
    wx.vibrateShort && wx.vibrateShort()
  },

  // 生成首页健康状态文案，保证单/多行均对齐
  getHealthStatusText(overview = {}) {
    try {
      const hs = overview.health_status || null
      const eggCount = (this.data && this.data.incubatingEggCount) || 0
      if (hs) {
        const parts = []
        if (hs.healthy > 0) parts.push(`${hs.healthy}只鹦鹉状态良好`)
        if (hs.sick > 0) parts.push(`${hs.sick}只鹦鹉生病`)
        if (hs.recovering > 0) parts.push(`${hs.recovering}只鹦鹉恢复中`)
        if (hs.observation > 0) parts.push(`${hs.observation}只鹦鹉观察中`)
        if (eggCount > 0) parts.push(`${eggCount}颗蛋正在孵化中`)
        if (parts.length > 0) return parts.join('，')
      }
      // 回退：仅显示总数良好
      const total = (overview && overview.total_parrots) || 0
      const base = `${total}只鹦鹉状态良好`
      if (eggCount > 0) return `${base}，${eggCount}颗蛋正在孵化中`
      return base
    } catch (e) {
      const total = (overview && overview.total_parrots) || 0
      const base = `${total}只鹦鹉状态良好`
      const eggCount = (this.data && this.data.incubatingEggCount) || 0
      if (eggCount > 0) return `${base}，${eggCount}颗蛋正在孵化中`
      return base
    }
  },

  // 新增：加载首页-我的鹦鹉（横向展示全部）
  async loadMyParrots() {
    try {
      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      if (mode === 'team') {
        try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_) {}
        const canView = app && typeof app.hasPermission === 'function' ? app.hasPermission('parrot.view') : true
        if (!canView) {
          this.setData({ myParrots: [] })
          // 在无查看权限时不展示单鹦鹉欢迎语
          this.setData({ welcomeMessage: '今天也要好好照顾小家伙们哦', isSingleParrot: false, singleParrotName: '', singleParrotDays: 1 })
          return
        }
      }
      const force = !!this._forceRefresh
      const cachedList = force ? null : cache.get('index_myParrots')
      if (Array.isArray(cachedList) && cachedList.length > 0) {
        const ordered = cachedList
        this.setData({ myParrots: ordered })
        let newWelcome = '今天也要好好照顾小家伙们哦'
        let isSingleParrot = false
        let singleParrotName = ''
        let singleParrotDays = 1
        if (ordered.length === 1) {
          const p = ordered[0]
          const name = (p && p.name) ? p.name : '你的鹦鹉'
          const startDateStr = p.acquisition_date || p.created_at || ''
          const startDate = parseServerTime(startDateStr)
          if (startDate) {
            const today = new Date()
            today.setHours(0,0,0,0)
            const begin = new Date(startDate)
            begin.setHours(0,0,0,0)
            let days = Math.floor((today.getTime() - begin.getTime()) / 86400000) + 1
            if (days < 1) days = 1
            newWelcome = `今天是你和${name}相处的第${days}天！`
            isSingleParrot = true
            singleParrotName = name
            singleParrotDays = days
          } else {
            newWelcome = `今天是你和${name}相处的第1天！`
            isSingleParrot = true
            singleParrotName = name
            singleParrotDays = 1
          }
        }
        this.setData({ welcomeMessage: newWelcome, isSingleParrot, singleParrotName, singleParrotDays })
        return
      }
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { page: 1, per_page: 100, sort_by: 'created_at', sort_order: 'desc' }
      })
      if (res.success) {
        const parrotsRaw = (res.data.parrots || []).map(p => {
          const speciesName = p.species && p.species.name ? p.species.name : (p.species_name || '')
          const photoUrl = app.resolveUploadUrl(p.photo_url)
          const avatarUrl = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : app.getDefaultAvatarForParrot({
            gender: p.gender,
            species_name: speciesName,
            name: p.name
          })
          const photoThumb = photoUrl ? app.getThumbnailUrl(photoUrl, 160) : ''
          const avatarThumb = avatarUrl ? app.getThumbnailUrl(avatarUrl, 128) : ''
          return {
            ...p,
            species_name: speciesName,
            health_text: p.current_health_status_text || '健康',
            age_display: this.computeAgeDisplay(p.birth_date),
            original_photo_url: p.photo_url,
            original_avatar_url: p.avatar_url,
            photo_url: photoUrl,
            avatar_url: avatarUrl,
            photo_thumb: photoThumb,
            avatar_thumb: avatarThumb
          }
        })
        let orderIds = []
        try {
          const or = await app.request({ url: '/api/settings/parrot-order', method: 'GET' })
          if (or && or.success && Array.isArray(or.data && or.data.order)) {
            orderIds = or.data.order
          } else {
            const cached = wx.getStorageSync('parrotOrder')
            if (Array.isArray(cached)) orderIds = cached
          }
        } catch (_) {
          const cached = wx.getStorageSync('parrotOrder')
          if (Array.isArray(cached)) orderIds = cached
        }
        const map = {}
        parrotsRaw.forEach(p => { map[p.id] = p })
        const ordered = []
        orderIds.forEach(id => { if (map[id]) ordered.push(map[id]) })
        parrotsRaw.forEach(p => { if (!orderIds.includes(p.id)) ordered.push(p) })
        this.setData({ myParrots: ordered })
        cache.set('index_myParrots', ordered, 180000)

        // 仅当用户只有1只鹦鹉时，设置欢迎语为“今天是你和XX相处的第YY天！”
        let newWelcome = '今天也要好好照顾小家伙们哦'
        let isSingleParrot = false
        let singleParrotName = ''
        let singleParrotDays = 1
        if (ordered.length === 1) {
          const p = ordered[0]
          const name = (p && p.name) ? p.name : '你的鹦鹉'
          // 优先使用 acquisition_date，其次使用 created_at 作为兜底
          const startDateStr = p.acquisition_date || p.created_at || ''
          const startDate = parseServerTime(startDateStr)
          if (startDate) {
            // 以当天0点与开始日期0点计算相处天数，首日记为第1天
            const today = new Date()
            today.setHours(0,0,0,0)
            const begin = new Date(startDate)
            begin.setHours(0,0,0,0)
            let days = Math.floor((today.getTime() - begin.getTime()) / 86400000) + 1
            if (days < 1) days = 1
            newWelcome = `今天是你和${name}相处的第${days}天！`
            isSingleParrot = true
            singleParrotName = name
            singleParrotDays = days
          } else {
            newWelcome = `今天是你和${name}相处的第1天！`
            isSingleParrot = true
            singleParrotName = name
            singleParrotDays = 1
          }
        }
        this.setData({
          welcomeMessage: newWelcome,
          isSingleParrot,
          singleParrotName,
          singleParrotDays
        })
      }
    } catch (error) {
      console.error('加载我的鹦鹉失败:', error)
    }
  },

  computeAgeDisplay(birthDate) {
    try {
      if (!birthDate) return ''
      let birth = birthDate instanceof Date ? birthDate : new Date(birthDate)
      if (isNaN(birth.getTime())) {
        const s = String(birthDate)
        const d = new Date(s.replace(/-/g, '/').replace('T', ' '))
        if (isNaN(d.getTime())) return ''
        birth = d
      }
      const now = new Date()
      const birthMid = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate())
      const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diffDays = Math.floor((nowMid.getTime() - birthMid.getTime()) / 86400000)
      if (diffDays < 30) {
        return `${diffDays}天`
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months}个月`
      }
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`
    } catch (_) {
      return ''
    }
  },

  // 新增：加载首页体重趋势数据（简化为最近30天）
  async loadHomeWeightTrends() {
    try {
      const res = await app.request({
        url: '/api/statistics/weight-trends',
        method: 'GET',
        data: { days: 30 }
      })
      if (res.success && Array.isArray(res.data && res.data.series)) {
        this.setData({ homeWeightSeries: res.data.series })
      }
    } catch (err) {
      console.error('加载首页体重趋势失败:', err)
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
        
        // 处理健康记录（保持非聚合，类型转中文）
        if (res.data.health && Array.isArray(res.data.health)) {
          const healthTypeMap = {
            checkup: '健康检查',
            illness: '疾病记录',
            treatment: '治疗护理',
            vaccination: '疫苗接种',
            weight: '体重称量'
          }
          res.data.health.forEach(record => {
            const parrotName = record.parrot_name || (record.parrot && record.parrot.name) || ''
            const typeKey = (record.record_type || '').toLowerCase()
            const recordTypeText = healthTypeMap[typeKey] || '健康检查'
            // 兼容后端返回：优先 record_date，兜底 created_at
            const rawTime = record.record_date || record.created_at
            const dt = parseServerTime(rawTime)
            allRecords.push({
              id: `health_${record.id}`,
              title: `进行了${recordTypeText}`,
              type: 'health',
              parrot_name: parrotName,
              timeValue: dt ? dt.toISOString() : rawTime,
              timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(rawTime),
              record_id: record.id
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
            // 真实时间字段优先：配对日期；兜底为记录创建时间
            const rawTime = record.mating_date || record.created_at
            const dt = parseServerTime(rawTime)
          allRecords.push({
            id: `breeding_${record.id}`,
            title: '进行了配对',
            type: 'breeding',
            parrot_name: `${maleName} × ${femaleName}`,
            timeValue: dt ? dt.toISOString() : rawTime,
            timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(rawTime),
            record_id: record.id
          })
        })
      }
        
        // 按时间排序，最新的在前（使用解析后的时间）
        allRecords.sort((a, b) => {
          const da = parseServerTime(a.timeValue || a.time)
          const db = parseServerTime(b.timeValue || b.time)
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
    // iOS 安全日期解析：尽量按本地时间解析常见格式，避免错误的时区偏移
    function parseIOSDateSafe(input) {
      let incubationAlerts = []
      try {
        if (!input) return null
        if (input instanceof Date) return input
        if (typeof input === 'number') {
          const d = new Date(input)
          return isNaN(d.getTime()) ? null : d
        }
        if (typeof input === 'string') {
          const s = input.trim()
          // 1) yyyy-MM-dd HH:mm[:ss]
          var m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
          if (m) {
            const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0)
            return isNaN(d.getTime()) ? null : d
          }
          // 2) yyyy/MM/dd[ HH:mm[:ss]]
          m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
          if (m) {
            const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0)
            return isNaN(d.getTime()) ? null : d
          }
          // 3) ISO 或含时区，替换空格为 T 后尝试
          const iso = s.includes(' ') ? s.replace(' ', 'T') : s
          const d = new Date(iso)
          return isNaN(d.getTime()) ? null : d
        }
        return null
      } catch (_) {
        return null
      }
    }

    records.forEach(function(record){
      const time = record && record.feeding_time
      const dt = parseIOSDateSafe(time) || null
      const key = String(time || '') + '_' + String(record && record.notes || '') + '_' + String(record && record.amount || '')
      if (!grouped[key]) {
        grouped[key] = {
          id: 'feeding_group_' + (record && record.id ? record.id : key),
          type: 'feeding',
          // 统一使用 ISO 字符串，配合 parseServerTime 跨类型一致排序
          timeValue: dt ? dt.toISOString() : (time || ''),
          // 与其他类型保持一致，使用相对时间展示
          timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(time),
          parrot_names: [],
          feed_type_names: [],
          record_ids: []
        }
      }
      const rid = (record && (record.id || record.record_id || record.feeding_id))
      if (rid && grouped[key].record_ids.indexOf(rid) === -1) {
        grouped[key].record_ids.push(rid)
      }
      const parrotName = (record && (record.parrot_name || (record.parrot && record.parrot.name))) || ''
      const feedTypeName = (record && (record.feed_type_name || (record.feed_type && record.feed_type.name))) || ''
      if (parrotName && grouped[key].parrot_names.indexOf(parrotName) === -1) {
        grouped[key].parrot_names.push(parrotName)
      }
      if (feedTypeName && grouped[key].feed_type_names.indexOf(feedTypeName) === -1) {
        grouped[key].feed_type_names.push(feedTypeName)
      }
    })
    const groupedValues = Object.values(grouped)
    const result = groupedValues.map(function(item){
      return {
        id: item.id,
        title: '喂食了' + item.feed_type_names.join('、'),
        type: 'feeding',
        parrot_name: item.parrot_names.join('、'),
        timeValue: item.timeValue,
        timeText: item.timeText,
        record_ids: item.record_ids
      }
    })
    // 按时间倒序（跨端一致：使用 parseServerTime 再取时间戳）
    result.sort(function(a, b){
      const da = parseServerTime(a.timeValue || a.time)
      const db = parseServerTime(b.timeValue || b.time)
      const ma = da ? da.getTime() : 0
      const mb = db ? db.getTime() : 0
      return mb - ma
    })
    return result
  },

  // 聚合首页清洁记录
  aggregateRecentCleaning(records) {
    const grouped = {}
    records.forEach(record => {
      const time = record.cleaning_time
      const dt = parseServerTime(time)
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
          cleaning_type_ids: [],
          record_ids: []
        }
      }
      const rid = (record && (record.id || record.record_id || record.cleaning_id))
      if (rid && !grouped[key].record_ids.includes(rid)) {
        grouped[key].record_ids.push(rid)
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
        timeText: item.timeText,
        record_ids: item.record_ids
      }
    })
    // 按时间倒序
    result.sort((a, b) => {
      const da = parseServerTime(b.timeValue || b.time)
      const db = parseServerTime(a.timeValue || a.time)
      const ma = da ? da.getTime() : 0
      const mb = db ? db.getTime() : 0
      return ma - mb
    })
    return result
  },

  openRecentRecord(e) {
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
      const type = ds.type || ''
      let id = ds.id || ''
      let recordIds = (ds.recordIds || '').trim()
      if (!recordIds && (type === 'feeding' || type === 'cleaning')) {
        const s = String(id || ds.id || '')
        const prefix = type === 'feeding' ? 'feeding_group_' : 'cleaning_group_'
        if (s.startsWith(prefix)) {
          const rest = s.substring(prefix.length)
          if (/^\d+$/.test(rest)) {
            id = rest
          } else {
            id = ''
          }
        }
      }
      const params = []
      if (type) params.push(`type=${encodeURIComponent(type)}`)
      if (recordIds) {
        params.push(`record_ids=${encodeURIComponent(recordIds)}`)
      } else if (id) {
        params.push(`id=${encodeURIComponent(id)}`)
      }
      const url = `/pages/records/detail/detail${params.length ? ('?' + params.join('&')) : ''}`
      wx.navigateTo({ url })
    } catch (_) {}
  },

  // 加载健康提醒
  async loadHealthAlerts() {
    try {
      const nm0 = app.globalData && app.globalData.notificationManager
      const s0 = nm0 && nm0.getNotificationSettings ? nm0.getNotificationSettings() : null
      if (s0 && (s0.enabled === false || s0.healthReminder === false)) {
        this.setData({ healthAlerts: [], healthAlertsTotal: 0 })
        return
      }
      const prefs0 = (s0 && s0.healthAlertPreferences) || {}
      const keys0 = ['chick_care','incubation_advice','feeding_gap','feeding_frequency_low','weight_decline','care_general_topic']
      const isOn = (v) => (v === true || v === 1 || v === 'true' || v === '1')
      const allOff = keys0.every(k => prefs0.hasOwnProperty(k) && !isOn(prefs0[k]))
      if (allOff) {
        this.setData({ healthAlerts: [], healthAlertsTotal: 0 })
        return
      }
      const res = await app.request({
        url: '/api/statistics/health-anomalies',
        method: 'GET',
        data: { days: 30 }
      })

      if (!res || !res.success) {
        this.setData({ healthAlerts: [] })
        return
      }

      const alerts = []
      const severityOrder = { high: 2, medium: 1, low: 0 }
      const results = res.data && res.data.results ? res.data.results : []
      results.forEach(r => {
        const pid = r.parrot_id
        const name = r.parrot_name
        const anomalies = r.anomalies || []
        anomalies.forEach(a => {
          const sev = a.severity || 'medium'
          const sevText = sev === 'high' ? '【高】' : (sev === 'medium' ? '【中】' : '【低】')
          const title = `${name}：${sevText}${a.message || '健康异常提醒'}`
          // 简要细节
          let detailText = ''
          const d = a.details || {}
          if (a.type === 'weight_decline') {
            if (d.drop_pct !== undefined) {
              detailText = `下降 ${d.drop_pct}%；近期均值 ${d.recent_avg_g || d.latest_weight_g || '--'}g`
            } else if (d.slope_g_per_day !== undefined) {
              detailText = `斜率 ${d.slope_g_per_day} g/天；基准 ${d.baseline_g} g`
            }
          } else if (a.type === 'feeding_gap') {
            if (d.gap_hours !== undefined) {
              detailText = `间隔 ${d.gap_hours} 小时${d.median_hours ? `（常态 ${d.median_hours} 小时）` : ''}`
            }
          } else if (a.type === 'feeding_frequency_low') {
            if (d.recent_median_per_day !== undefined) {
              detailText = `最近日中位 ${d.recent_median_per_day} 次/天（常态 ${d.baseline_median_per_day} 次/天）`
            }
          }
          const description = `${a.suggestion || ''}${detailText ? '。' + detailText : ''}`
          alerts.push({
            id: `${pid}-${a.type}-${sev}`,
            parrot_id: pid,
            title,
            description,
            severity: sev,
            type: a.type
          })
        })
      })

      const nmPrefs = (() => {
        try {
          const nm = app.globalData.notificationManager
          const s = nm && nm.getNotificationSettings ? nm.getNotificationSettings() : null
          return (s && s.healthAlertPreferences) || {}
        } catch (_) { return {} }
      })()
      const allowType = (t) => {
        const v = nmPrefs && nmPrefs[t]
        if (typeof v === 'undefined') return false
        return (v === true || v === 1 || v === 'true' || v === '1')
      }
      const alertsF = alerts.filter(a => allowType(a.type))
      alertsF.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))

      let parrots = Array.isArray(this.data.myParrots) ? this.data.myParrots : []
      if (!parrots || parrots.length === 0) {
        try {
          const pr = await app.request({ url: '/api/parrots', method: 'GET', data: { page: 1, per_page: 100 } })
          if (pr && pr.success) {
            parrots = (pr.data.parrots || []).map(p => ({ id: p.id, name: p.name, birth_date: p.birth_date }))
          }
        } catch (_) {}
      }
      const careAlerts = []
      parrots.forEach(p => {
        const bd = p.birth_date
        if (!bd) return
        let birth = new Date(bd)
        if (isNaN(birth.getTime())) {
          const s = String(bd)
          birth = new Date(s.replace(/-/g, '/').replace('T', ' '))
        }
        if (isNaN(birth.getTime())) return
        const now = new Date()
        const diff = now.getTime() - birth.getTime()
        const days = Math.floor(diff / 86400000)
        const d = days < 1 ? 1 : days
        if (d >= 1 && d <= 45) {
          const alert = chickCare.buildChickCareAlert(p, d)
          if (alert) careAlerts.push(alert)
        }
      })

      const careF = careAlerts.filter(a => allowType(a.type))
      let topAlerts = []
      let generalAdvice = null

      let incubationAlerts = []
      try {
        const eggsResp = await app.request({ url: '/api/incubation/eggs', method: 'GET', data: { page: 1, per_page: 100 } })
        const eggs = (eggsResp && eggsResp.data && eggsResp.data.items) || (eggsResp && eggsResp.data && eggsResp.data.eggs) || []
        const incubating = eggs.filter(e => {
          const s = (e && (e.status || e.state)) || ''
          return String(s) === 'incubating'
        })
        this.setData({ incubatingEggCount: incubating.length })
        this.setData({ overview_status_text: this.getHealthStatusText(this.data.overview) })
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        const adviceCalls = incubating.slice(0, 20).map(e => {
          const id = e.id || e.egg_id || e.eggId
          return app.request({ url: `/api/incubation/eggs/${id}/advice`, method: 'GET', data: { date: todayStr } })
            .then(r => ({ ok: true, egg: e, resp: r }))
            .catch(err => ({ ok: false, egg: e, err }))
        })
        const adviceResults = await Promise.all(adviceCalls)
        incubationAlerts = []
        adviceResults.forEach(ar => {
          if (!ar || !ar.ok || !ar.resp || !ar.resp.success) return
          const e = ar.egg || {}
          const ranges = (ar.resp.data && ar.resp.data.ranges) || {}
          const tr = ranges.temperature_c || {}
          const hr = ranges.humidity_pct || {}
          const turningRequired = (ar.resp.data && ar.resp.data.turning_required) ? true : false
          const candlingRequired = (ar.resp.data && ar.resp.data.candling_required) ? true : false
          const tipsArr = (ar.resp.data && Array.isArray(ar.resp.data.tips)) ? ar.resp.data.tips.filter(x => !!x) : []
          const speciesName = (e.species && e.species.name) ? e.species.name : (e.species_name || '')
          const parrotName = e.parrot_name || e.male_parrot_name || e.female_parrot_name || speciesName || '孵化蛋'
          const startStr = e.incubator_start_date || e.incubator_start_date_text || ''
          let dayIndexDisplay = ''
          try {
            if (startStr) {
              const onlyDate = String(startStr).slice(0,10)
              const startMid = new Date(`${onlyDate}T00:00:00`)
              if (!isNaN(startMid.getTime())) {
                const todayMid = new Date(`${todayStr}T00:00:00`)
                const di = Math.floor((todayMid.getTime() - startMid.getTime())/86400000) + 1
                if (di > 0 && isFinite(di)) dayIndexDisplay = String(di)
              }
            }
          } catch (_) {}
          const tempText = (tr.low!=null && tr.high!=null) ? `${tr.low}-${tr.high}℃` : '—'
          const humText = (hr.low!=null && hr.high!=null) ? `${hr.low}-${hr.high}%` : '—'
          const turningText = turningRequired ? '需翻蛋' : '不翻蛋'
          const candlingText = candlingRequired ? '需照蛋' : '不照蛋'
          const tipsText = tipsArr.length ? tipsArr.join('；') : ''
          incubationAlerts.push({
            id: `incubation-${e.id || e.egg_id}-${todayStr}`,
            parrot_id: e.parrot_id || '',
            egg_id: e.id || e.egg_id || e.eggId || '',
            title: dayIndexDisplay ? `${parrotName}：第${dayIndexDisplay}天孵化建议` : `${parrotName}：孵化建议`,
            description: `温度${tempText}；湿度${humText}；${turningText}；${candlingText}${tipsText ? '；' + tipsText : ''}`,
            severity: 'medium',
            type: 'incubation_advice'
          })
        })
      } catch (_) {
      }

      try {
        const today = new Date()
        const dayIndex = Math.floor(today.getTime() / 86400000)
        const topics = [
          { key: 'diet', name: '饮食与营养', desc: '均衡配比、清洁水源、避免高脂高盐' },
          { key: 'environment', name: '环境与丰富化', desc: '稳定温湿度、适度光照，提供玩具与觅食丰富化' },
          { key: 'interaction', name: '互动与训练', desc: '短时高频正向训练，尊重边界，避免过度应激' },
          { key: 'health', name: '健康与观察', desc: '每日观察粪便、食欲与体重趋势，异常及时记录' }
        ]
        const t = topics[dayIndex % topics.length]
        generalAdvice = {
          id: `care-general-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}-${t.key}`,
          parrot_id: '',
          title: `护理指南：${t.name}`,
          description: t.desc,
          severity: 'low',
          type: 'care_general_topic',
          category: t.key
        }
        const todayKey = this.getTodayKey()
        const dismissed = this.getDismissedSet(todayKey)
        if (allowType('care_general_topic') && !dismissed.has(generalAdvice.id)) {
          topAlerts = [generalAdvice].concat(topAlerts).slice(0, 3)
        }
      } catch (_) {}

      const todayKey = this.getTodayKey()
      const all = (generalAdvice ? [generalAdvice] : [])
        .concat(careAlerts)
        .concat(incubationAlerts)
        .concat(alerts)
      const list = all.filter(a => allowType(a.type))
      const pinned = this.getPinnedSet(todayKey)
      list.sort((a, b) => {
        const waBase = a.type === 'chick_care' ? 3 : (severityOrder[a.severity] || 0)
        const wbBase = b.type === 'chick_care' ? 3 : (severityOrder[b.severity] || 0)
        const wa = waBase + (pinned.has(a.type) ? 100 : 0)
        const wb = wbBase + (pinned.has(b.type) ? 100 : 0)
        return wb - wa
      })
      const dismissed2 = this.getDismissedSet(todayKey)
      const filtered = list.filter(a => a && a.id && !dismissed2.has(a.id))
      topAlerts = filtered.slice(0, 3)
      this.setData({
        healthAlerts: topAlerts,
        healthAlertsTotal: filtered.length
      })

      const filledTop = topAlerts

      try {
        const nm = app.globalData.notificationManager
        const settings = nm.getNotificationSettings()
        if (settings && settings.enabled && settings.healthReminder) {
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          const sup = wx.getStorageSync('suppressed_notifications_today') || {}
          const suppressed = sup && sup.date === todayKey && !!sup.health_alert
          const existing = nm.getLocalNotifications() || []
          const existingTodayTitles = new Set()
          const existingTodayIds = new Set()
          existing.forEach(n => {
            if (!n || n.type !== 'health_alert') return
            const created = typeof n.createdAt === 'string' ? n.createdAt : ''
            if (!created || !created.startsWith(todayKey)) return
            if (n.title) existingTodayTitles.add(n.title)
            if (n.alertId != null) existingTodayIds.add(String(n.alertId))
          })
          const seenTitles = new Set(existingTodayTitles)
          const seenIds = new Set(existingTodayIds)
          const mergedAll = (careF.length ? careF : []).concat(filledTop.filter(a => a.type !== 'chick_care')).concat(alertsF)
          mergedAll.slice(0, 10).forEach(a => {
            if (!a || suppressed) return
            const alertId = a.id != null ? String(a.id) : ''
            const t = a.title || '健康提醒'
            const d = a.description || ''
            if (alertId && seenIds.has(alertId)) return
            if (!alertId && seenTitles.has(t)) return
            nm.addLocalNotification('health_alert', t, d, '', '', { route: '/pages/health-alerts/health-alerts', alertId })
            if (alertId) seenIds.add(alertId); else seenTitles.add(t)
          })
        }
      } catch (_) {}
    } catch (error) {
      console.error('加载健康提醒失败:', error)
      this.setData({ healthAlerts: [] })
    }
  },

  getTodayKey() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  },

  getDismissedSet(todayKey) {
    try {
      const list = wx.getStorageSync(`dismissedHealthAlerts_${todayKey}`) || []
      return new Set(Array.isArray(list) ? list : [])
    } catch (_) { return new Set() }
  },

  // 置顶集合
  getPinnedSet() {
    try {
      const list = wx.getStorageSync('pinnedHealthAlertTypes_global') || []
      return new Set(Array.isArray(list) ? list : [])
    } catch (_) { return new Set() }
  },
  addPinnedId(type) {
    if (!type) return
    try {
      const list = wx.getStorageSync('pinnedHealthAlertTypes_global') || []
      const next = Array.isArray(list) ? list.slice() : []
      if (!next.includes(type)) next.push(type)
      wx.setStorageSync('pinnedHealthAlertTypes_global', next)
      try {
        const app = getApp()
        if (app && app.globalData && app.globalData.openid) {
          app.request({
            url: '/api/reminders/settings',
            method: 'PUT',
            data: { pinnedHealthAlertTypes: next }
          }).then(()=>{}).catch(()=>{})
        }
      } catch (_) {}
    } catch (_) {}
  },
  removePinnedId(type) {
    if (!type) return
    try {
      const list = wx.getStorageSync('pinnedHealthAlertTypes_global') || []
      const next = (Array.isArray(list) ? list : []).filter(x => x !== type)
      wx.setStorageSync('pinnedHealthAlertTypes_global', next)
      try {
        const app = getApp()
        if (app && app.globalData && app.globalData.openid) {
          app.request({
            url: '/api/reminders/settings',
            method: 'PUT',
            data: { pinnedHealthAlertTypes: next }
          }).then(()=>{}).catch(()=>{})
        }
      } catch (_) {}
    } catch (_) {}
  },

  addDismissedId(id) {
    if (!id) return
    const key = this.getTodayKey()
    try {
      const list = wx.getStorageSync(`dismissedHealthAlerts_${key}`) || []
      const next = Array.isArray(list) ? list.slice() : []
      if (!next.includes(id)) next.push(id)
      wx.setStorageSync(`dismissedHealthAlerts_${key}`, next)
    } catch (_) {}
  },

  onHealthAlertLongPress(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
    const id = ds.id || ''
    const type = ds.type || ''
    if (!id) return
    const todayKey = this.getTodayKey()
    const pinned = this.getPinnedSet(todayKey)
    const isPinned = pinned.has(type)
    const itemList = [isPinned ? '取消置顶' : '置顶', '不再提醒', '删除']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const idx = res.tapIndex
        if (idx === 0) {
          if (isPinned) this.removePinnedId(type); else this.addPinnedId(type)
          this.loadHealthAlerts()
        } else if (idx === 1) {
          try {
            const nm = app.globalData.notificationManager
            const settings = nm.getNotificationSettings()
            const prefs = { ...(settings.healthAlertPreferences || {}) }
            if (type) prefs[type] = false
            const nextSettings = { ...settings, healthAlertPreferences: prefs }
            nm.saveNotificationSettings(nextSettings)
            try {
              app.request({
                url: '/api/reminders/settings',
                method: 'PUT',
                data: {
                  enabled: !!nextSettings.enabled,
                  feedingReminder: !!nextSettings.feedingReminder,
                  healthReminder: !!nextSettings.healthReminder,
                  cleaningReminder: !!nextSettings.cleaningReminder,
                  medicationReminder: !!nextSettings.medicationReminder,
                  breedingReminder: !!nextSettings.breedingReminder,
                  feedingReminderTime: nextSettings.feedingReminderTime || null,
                  cleaningReminderTime: nextSettings.cleaningReminderTime || null,
                  medicationReminderTime: nextSettings.medicationReminderTime || null,
                  healthAlertPreferences: prefs
                }
              }).then(()=>{}).catch(()=>{})
            } catch (_) {}
          } catch (_) {}
          this.loadHealthAlerts()
        } else if (idx === 2) {
          this.deleteHealthAlert({ currentTarget: { dataset: { id } } })
        }
      }
    })
  },

  deleteHealthAlert(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    if (!id) return
    this.addDismissedId(id)
    const todayKey = this.getTodayKey()
    const dismissed = this.getDismissedSet(todayKey)
    const remaining = (this.data.healthAlerts || []).filter(a => a.id !== id)
    const total = Math.max(0, (this.data.healthAlertsTotal || 0) - 1)
    this.setData({ healthAlerts: remaining, healthAlertsTotal: Math.max(0, total) })
  },

  handleHealthAlertTap(e) {
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
      const type = ds.type || ''
      const eggId = ds.eggId || ''
      if (type === 'care_general_topic') {
        wx.navigateTo({ url: '/pages/care-guide/care-guide?tab=general' })
        return
      }
      if (type === 'chick_care') {
        wx.navigateTo({ url: '/pages/care-guide/care-guide?tab=chick_0_45' })
        return
      }
      if (type === 'incubation_advice') {
        const url = eggId ? `/pages/incubation/detail/detail?id=${encodeURIComponent(eggId)}` : '/pages/incubation/index'
        wx.navigateTo({ url })
        return
      }
      if (type === 'feeding_gap' || type === 'feeding_frequency_low') {
        wx.navigateTo({ url: '/pages/records/feeding/feeding' })
        return
      }
      wx.navigateTo({ url: '/pages/records/health/health' })
    } catch (_) {}
  },

  // 查看全部健康提醒
  navigateToHealthAlerts() {
    wx.navigateTo({
      url: '/pages/health-alerts/health-alerts'
    })
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
                    avatarUrl: '/images/remix/user-line.png'
                  }
                },
                header: {
                  'content-type': 'application/json'
                },
                success: (res) => {
                  console.log('快速登录接口响应', res);
                  if (res.data.success) {
                    const responseUserInfo = res.data.data.user || {};
                    
                    // 使用后端完整的用户信息，保留角色等字段；仅在缺失时回退默认头像
                    const userInfo = { ...responseUserInfo };
                    if (!userInfo.avatar_url) {
                      userInfo.avatar_url = '/images/remix/user-line.png';
                    }
                    
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
                    
                    // 显示登录消息（可能包含签到积分信息）
                    const loginMessage = res.data.message || '登录成功';
                    wx.showToast({
                      title: loginMessage,
                      icon: 'success',
                      duration: loginMessage.includes('签到') ? 2500 : 1500
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

  handleIndexParrotImageError(e) {
    const id = e.currentTarget.dataset.id
    const parrots = (this.data.myParrots || []).map(p => {
      if (p.id === id) {
        if (p.photo_thumb && p.photo_url && p.photo_thumb !== p.photo_url) {
          return { ...p, photo_thumb: '' }
        }
        if (p.avatar_thumb && p.avatar_url && p.avatar_thumb !== p.avatar_url) {
          return { ...p, avatar_thumb: '' }
        }
        const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
        const fallback = app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
        const fallbackThumb = app.getThumbnailUrl(fallback, 128)
        return { ...p, photo_url: '', photo_thumb: '', avatar_url: fallback, avatar_thumb: fallbackThumb }
      }
      return p
    })
    this.setData({ myParrots: parrots })
  },

  checkAndShowGestureGuide() {
    try {
      const shown = wx.getStorageSync('home_customize_guide_shown_v2')
      if (shown) return
      if (!this.data.isLogin) return
      
      this.setData({ showGestureGuide: true })
      
      // 8秒后自动消失
      setTimeout(() => {
        if (this.data.showGestureGuide) {
          this.closeGestureGuide()
        }
      }, 8000)
    } catch (_) {
      this.setData({ showGestureGuide: true })
    }
  },

  closeGestureGuide() {
    this.setData({ showGestureGuide: false })
    try { wx.setStorageSync('home_customize_guide_shown_v2', 1) } catch (_) {}
  },

  onGestureGuideTap() {
    this.closeGestureGuide()
    // 模拟长按第一个卡片的效果，进入编辑模式
    // 但由于无法直接触发长按事件，我们直接进入编辑模式并震动
    this.setData({ isEditMode: true })
    wx.vibrateShort()
  },

  stopPropagation() {},

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
  navigateToPairingCalculator() {
    wx.navigateTo({
      url: '/pages/tools/pairing-calculator/pairing-calculator'
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
      url: '/pages/records/breeding/breeding'
    })
  },

  // 添加鹦鹉
  async addParrot() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }

    // 刷新最新资料，避免取消会员后仍沿用旧tier
    try {
      const prof = await app.request({ url: '/api/auth/profile', method: 'GET' })
      if (prof && prof.success && prof.data) {
        const old = wx.getStorageSync('userInfo') || {}
        const merged = Object.assign({}, old, prof.data)
        try { wx.setStorageSync('userInfo', merged) } catch(_) {}
        if (app && app.globalData) { app.globalData.userInfo = merged }
      }
    } catch(_) {}

    let tier = app.getEffectiveTier()
    const teamLevel = app.getTeamLevel()
    const mode = app.globalData.userMode || wx.getStorageSync('userMode') || 'personal'
    let currentTeam = (app && app.globalData && app.globalData.currentTeam) || wx.getStorageSync('currentTeam') || {}
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const hasCreatePerm = app && typeof app.hasPermission === 'function' ? app.hasPermission('parrot.create') : true
      if (!hasCreatePerm) {
        this.setData({ showPermissionModal: true, permissionMessage: '您没有新增鹦鹉的权限，请联系管理员分配权限' })
        return
      }
    }
    // 确保团队信息加载，避免误判为免费
    if (mode === 'team' && (!currentTeam || !currentTeam.id)) {
      try {
        const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
        if (cur && cur.success && cur.data) {
          currentTeam = cur.data
          try { wx.setStorageSync('currentTeam', cur.data) } catch(_) {}
          if (app && app.globalData) { app.globalData.currentTeam = cur.data }
        }
      } catch(_) {}
    }
    // 结合到期信息与团队ID进行谨慎降级（仅在明确过期时降级）
    try {
      const now = Date.now()
      const u = (app && app.globalData && app.globalData.userInfo) || wx.getStorageSync('userInfo') || {}
      if (tier === 'pro') {
        const expStr = u && u.subscription_expire_at
        if (expStr) {
          const t = new Date(String(expStr).replace(' ', 'T')).getTime()
          if (isFinite(t) && t <= now) tier = 'free'
        }
      } else if (tier === 'team') {
        let tsTeam = NaN
        if (currentTeam && currentTeam.id) {
          const expStrTeam = currentTeam.subscription_expire_at || currentTeam.expire_at || ''
          if (expStrTeam) tsTeam = new Date(String(expStrTeam).replace(' ', 'T')).getTime()
        }
        if (!isFinite(tsTeam)) {
          const expStrUser = u && u.subscription_expire_at
          if (expStrUser) {
            const tUser = new Date(String(expStrUser).replace(' ', 'T')).getTime()
            if (!(isFinite(tUser) && tUser > now)) tier = 'free'
          }
        } else {
          if (tsTeam <= now) tier = 'free'
        }
      }
    } catch(_) {}
    let limit = 0
    if (tier === 'free') {
      const hasTeamContext = !!(currentTeam && currentTeam.id)
      limit = (mode === 'team' && hasTeamContext) ? 20 : 10
    }
    else if (tier === 'pro') limit = 100
    else if (tier === 'team' && teamLevel === 'basic') limit = 1000
    const knownTotal = Number((this.data.overview && this.data.overview.total_parrots) || 0)

    const promptOrOpenForm = (total) => {
      if (limit && total >= limit) {
        this.setData({ showLimitModal: true, limitCount: limit })
        return
      }
      this.setData({ showAddParrotModal: true })
      this.loadSpeciesList()
    }

    if (!limit || knownTotal >= limit) {
      promptOrOpenForm(knownTotal)
      return
    }

    app.request({ url: '/api/statistics/overview', method: 'GET' })
      .then(res => {
        let total = 0
        if (res && res.data && res.data.total_parrots !== undefined) {
          total = Number(res.data.total_parrots)
        } else {
          total = knownTotal
        }
        promptOrOpenForm(total)
      })
      .catch(() => {
        promptOrOpenForm(knownTotal)
      })
  },

  // 快速添加收支记录
  async quickExpense() {
    if (!this.data.isLogin) { app.showError && app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canCreateFinance = app && typeof app.hasPermission === 'function' ? app.hasPermission('finance.create') : true
      if (!canCreateFinance) { this.setData({ showPermissionModal: true, permissionMessage: '您没有新增收支的权限，请联系管理员分配权限' }); return }
    }
    this.setData({ showAddExpenseModal: true })
  },

  // 快速清洁
  async quickCleaning() {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canView = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.view') : true
      if (!canView) { this.setData({ showPermissionModal: true, permissionMessage: '您没有查看记录的权限，请联系管理员分配权限' }); return }
    }
    wx.navigateTo({ url: '/pages/records/cleaning/cleaning' })
  },

  // 快速健康检查
  async quickHealth() {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canView = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.view') : true
      if (!canView) { this.setData({ showPermissionModal: true, permissionMessage: '您没有查看记录的权限，请联系管理员分配权限' }); return }
    }
    wx.navigateTo({ url: '/pages/records/health/health' })
  },

  // 快速繁殖记录
  async quickBreeding() {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canView = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.view') : true
      if (!canView) { this.setData({ showPermissionModal: true, permissionMessage: '您没有查看记录的权限，请联系管理员分配权限' }); return }
    }
    wx.navigateTo({ url: '/pages/records/breeding/breeding' })
  },

  // 查看喂食记录列表
  async navigateToFeedingRecords() {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canView = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.view') : true
      if (!canView) { this.setData({ showPermissionModal: true, permissionMessage: '您没有查看记录的权限，请联系管理员分配权限' }); return }
    }
    wx.navigateTo({ url: '/pages/records/feeding/feeding' })
  },

  // 收支管理
  async goToExpenseManagement() {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canViewFinance = app && typeof app.hasPermission === 'function' ? app.hasPermission('finance.view') : true
      if (!canViewFinance) { this.setData({ showPermissionModal: true, permissionMessage: '您没有查看收支的权限，请联系管理员分配权限' }); return }
    }
    wx.navigateTo({ url: '/pages/expenses/expenses' })
  },

  // 关闭权限提示弹窗
  closePermissionModal() {
    this.setData({ showPermissionModal: false, permissionMessage: '' })
  },

  // 通用数量限制弹窗：关闭
  closeLimitModal() {
    this.setData({ showLimitModal: false })
  },

  // 通用数量限制弹窗：前往会员中心
  goToMemberCenter() {
    this.closeLimitModal()
    wx.navigateTo({ url: '/pages/member-center/member-center' })
  },

  async onLimitTrial() {
    const isLogin = !!(app && app.globalData && app.globalData.isLogin)
    if (!isLogin) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
    wx.showLoading({ title: '开通试用中...' })
    try {
      const res = await app.request({ url: '/api/auth/trial', method: 'POST' })
      wx.hideLoading()
      if (res && res.success) {
        const info = wx.getStorageSync('userInfo') || {}
        const next = { ...info }
        next.subscription_tier = (res && res.data && res.data.tier) ? String(res.data.tier) : 'pro'
        if (res.data && res.data.expire_at) next.subscription_expire_at = res.data.expire_at
        app.globalData.userInfo = next
        wx.setStorageSync('userInfo', next)
        try {
          const prof = await app.request({ url: '/api/auth/profile', method: 'GET' })
          if (prof && prof.success && prof.data) {
            const merged = Object.assign({}, next, prof.data)
            try { wx.setStorageSync('userInfo', merged) } catch(_) {}
            if (app && app.globalData) { app.globalData.userInfo = merged }
          }
        } catch(_) {}
        try {
          const tier = String(next.subscription_tier || '').toLowerCase()
          const mode = app.globalData.userMode || wx.getStorageSync('userMode') || 'personal'
          if (tier === 'team' && mode === 'team') {
            const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
            if (cur && cur.success && cur.data) {
              try { wx.setStorageSync('currentTeam', cur.data) } catch(_) {}
              if (app && app.globalData) { app.globalData.currentTeam = cur.data }
            }
          }
        } catch(_) {}
        if (app && app.globalData) { app.globalData.needRefresh = true }
        wx.showToast({ title: '试用已开通', icon: 'success' })
        this.closeLimitModal()
        wx.navigateTo({ url: '/pages/member-center/member-center' })
      } else {
        wx.showToast({ title: (res && res.message) || '开通失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      try {
        const msg = (e && e.message) ? String(e.message) : ''
        wx.showToast({ title: msg || '开通失败', icon: 'none' })
      } catch(_) {
        wx.showToast({ title: '开通失败', icon: 'none' })
      }
    }
  },

  // 通用数量限制弹窗：兑换
  async onLimitRedeem(e) {
    const code = (e && e.detail && e.detail.code) ? String(e.detail.code).trim() : ''
    if (!code) {
      wx.showToast({ title: '请输入兑换码', icon: 'none' })
      return
    }
    wx.showLoading({ title: '兑换中...' })
    try {
      const res = await app.request({ url: '/api/redemption/redeem', method: 'POST', data: { code } })
      wx.hideLoading()
      if (res && res.success) {
        wx.showToast({ title: '兑换成功', icon: 'success' })
        this.closeLimitModal()
        if (res.data) {
          const newUserInfo = { ...app.globalData.userInfo }
          newUserInfo.subscription_tier = res.data.tier
          newUserInfo.subscription_expire_at = res.data.expire_at
          app.globalData.userInfo = newUserInfo
          wx.setStorageSync('userInfo', newUserInfo)
        }
        app.globalData.needRefresh = true
        setTimeout(() => { this.addParrot() }, 1500)
      } else {
        wx.showToast({ title: res.message || '兑换失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      console.error('兑换失败:', err)
    }
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

  // 进入用品购买页（与收支管理同路由，保持统一入口）
  // 已统一至上方 goToExpenseManagement，避免重复定义

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
    const { id, item } = e.detail || {}
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    notificationManager.markNotificationRead(id)
    // 系统公告通知：跳转到公告中心并打开对应公告
    if (item && item.type === 'system' && item.announcementId) {
      try {
        wx.navigateTo({ url: `/pages/announcements/center/center?id=${item.announcementId}` })
        this.setData({ showNotifications: false })
      } catch (_) {}
    }
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
          formData: { category: 'parrots' },
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
        try { cache.clear('index_myParrots'); cache.clear('index_overview') } catch (_) {}
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
    const detail = (e && e.detail) || {}
    const mode = detail.mode || 'add'
    const payload = detail.data || null
    try {
      let res
      if (mode === 'claim') {
        const code = payload && payload.code
        if (!code || String(code).length !== 8) { app.showError('请输入 8 位过户码'); return }
        res = await app.request({ url: '/api/parrots/transfer/claim', method: 'POST', data: { code } })
        if (res.success) { app.showSuccess('认领成功') }
      } else {
        if (!payload || !payload.name) { app.showError('请填写必填项：名字与品种'); return }
        res = await app.request({ url: '/api/parrots', method: 'POST', data: payload })
        if (res.success) { app.showSuccess('添加成功') }
      }
      if (res && res.success) {
        this.closeAddParrotModal()
        try { cache.clear('index_myParrots'); cache.clear('index_overview') } catch (_) {}
        if (typeof this.loadMyParrots === 'function') { this.loadMyParrots() }
      } else if (res) {
        app.showError(res.message || (mode === 'claim' ? '认领失败' : '添加失败'))
      }
    } catch (error) {
      app.showError('网络错误，请稍后重试')
    }
  },

  /* ===== 收支弹窗逻辑 ===== */
  onShareAppMessage() {
    const title = '鹦鹉管家AI - 智能养鸟助手'
    return {
      title,
      path: '/pages/index/index'
    }
  },
  onShareTimeline() {
    return {
      title: '鹦鹉管家AI - 智能养鸟助手'
    }
  },

  // 拉取已发布公告并注入通知中心/弹窗
  async fetchPublishedAnnouncementsAndInject() {
    try {
      const res = await app.request({ url: '/api/announcements', method: 'GET', data: { limit: 5 } })
      if (!res || !res.success) return
      const list = (res.data && res.data.announcements) || []
      if (!Array.isArray(list) || list.length === 0) {
        this.setData({ showAnnouncementModal: false, latestAnnouncement: null })
        return
      }

      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      const isToday = (a) => {
        const created = a.created_at || a.published_at || a.scheduled_at || ''
        const d = String(created).includes('T') ? String(created).slice(0,10) : String(created).split(' ')[0]
        return d === todayStr
      }
      const forModal = list.filter(a => {
        const statusOk = !a.status || a.status === 'published'
        return statusOk && isToday(a)
      })

      if (forModal.length === 0) {
        this.setData({ latestAnnouncement: null, showAnnouncementModal: false })
      } else {
        const latest = forModal[0]
        let dismissed = []
        try { dismissed = wx.getStorageSync('dismissed_announcements') || [] } catch (_) {}
        const shouldShowModal = !dismissed.includes(latest.id)
        this.setData({ latestAnnouncement: latest, showAnnouncementModal: shouldShowModal })
      }

      const onlyToday = list.filter(isToday)
      let seen = []
      try { seen = wx.getStorageSync('seen_announcements') || [] } catch (_) {}
      const nm = app.globalData.notificationManager
      const newIds = []
      onlyToday.forEach(a => {
        if (!seen.includes(a.id)) {
          nm.addLocalNotification(
            'system',
            `系统公告：${a.title}`,
            (a.content || '').slice(0, 80),
            '',
            '',
            { announcementId: a.id }
          )
          newIds.push(a.id)
        }
      })
      if (newIds.length > 0) {
        try { wx.setStorageSync('seen_announcements', [...seen, ...newIds]) } catch (_) {}
      }
    } catch (e) {
      // 静默失败，不影响首页
      console.warn('获取公告失败', e)
    }
  },

  // 关闭公告弹窗
  closeAnnouncementModal() {
    this.setData({ showAnnouncementModal: false })
    // 记录已关闭的公告ID，避免再次进入首页重复弹出同一条
    const latest = this.data.latestAnnouncement
    if (latest && latest.id) {
      let dismissed = []
      try { dismissed = wx.getStorageSync('dismissed_announcements') || [] } catch (_) {}
      if (!dismissed.includes(latest.id)) {
        try { wx.setStorageSync('dismissed_announcements', [...dismissed, latest.id]) } catch (_) {}
      }
    }
  }
})
