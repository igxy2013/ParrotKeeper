// pages/index/index.js
const app = getApp()

Page({
  data: {
    greeting: '早上好',
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
    weather: null,
    menuRightPadding: 0,
    // 新增：我的鹦鹉（首页展示最多三只）
    myParrots: [],
    // 新增：通知中心
    showNotifications: false,
    notifications: [],
    unreadCount: 0,
    // 公告弹窗
    showAnnouncementModal: false,
    latestAnnouncement: null,
    // 新增：首页卡片自定义
    homeWidgets: ['parrots','feeding_today','monthly_income','monthly_expense'],
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
      // 新增：可添加的体重趋势大卡
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
    // 加载首页卡片配置
    this.loadHomeWidgets()
    // 加载用户自定义排序
    this.loadHomeWidgetsOrder()
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
      const res = await app.request({
        url: '/api/statistics/overview',
        method: 'GET'
      })
      
      if (res.success) {
        const overview = res.data
        const overviewStatusText = this.getHealthStatusText(overview)
        this.setData({
          overview: {
            total_parrots: overview.total_parrots || 0,
            today_records: {
              feeding: (overview.today_records && overview.today_records.feeding) || 0
            },
            monthly_income: overview.monthly_income || 0,
            monthly_expense: overview.monthly_expense || 0,
            ...overview
          },
          overview_status_text: overviewStatusText
        })
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
      // 保持默认值，不更新overview
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
      const defaults = ['parrots','feeding_today','monthly_income','monthly_expense']
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
      if (hs) {
        const parts = []
        if (hs.healthy > 0) parts.push(`${hs.healthy}只鹦鹉状态良好`)
        if (hs.sick > 0) parts.push(`${hs.sick}只鹦鹉生病`)
        if (hs.recovering > 0) parts.push(`${hs.recovering}只鹦鹉恢复中`)
        if (hs.observation > 0) parts.push(`${hs.observation}只鹦鹉观察中`)
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

  // 新增：加载首页-我的鹦鹉（横向展示全部）
  async loadMyParrots() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        // 使用后端分页参数 per_page，获取尽可能多的鹦鹉
        data: { page: 1, per_page: 100, sort_by: 'created_at', sort_order: 'desc' }
      })
      if (res.success) {
        const parrots = (res.data.parrots || []).map(p => {
          const speciesName = p.species && p.species.name ? p.species.name : (p.species_name || '')
          const photoUrl = app.resolveUploadUrl(p.photo_url)
          const avatarUrl = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : app.getDefaultAvatarForParrot({
            gender: p.gender,
            species_name: speciesName,
            name: p.name
          })
          return {
            ...p,
            species_name: speciesName,
            // 统一使用后端最近健康状态文本
            health_text: p.current_health_status_text || '健康',
            photo_url: photoUrl,
            avatar_url: avatarUrl
          }
        })
        // 展示全部供横向滑动
        this.setData({ myParrots: parrots })
      }
    } catch (error) {
      console.error('加载我的鹦鹉失败:', error)
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
            const dt = this.parseServerTime(rawTime)
            allRecords.push({
              id: `health_${record.id}`,
              title: `进行了${recordTypeText}`,
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
            // 真实时间字段优先：配对日期；兜底为记录创建时间
            const rawTime = record.mating_date || record.created_at
            const dt = this.parseServerTime(rawTime)
            allRecords.push({
              id: `breeding_${record.id}`,
              title: '进行了配对',
              type: 'breeding',
              parrot_name: `${maleName} × ${femaleName}`,
              timeValue: dt ? dt.toISOString() : rawTime,
              timeText: dt ? app.formatRelativeTime(dt) : app.formatRelativeTime(rawTime)
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
    // iOS 安全日期解析：尽量按本地时间解析常见格式，避免错误的时区偏移
    function parseIOSDateSafe(input) {
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
          // 用毫秒时间戳进行排序，避免跨端解析差异
          timeValue: dt ? String(dt.getTime()) : (time || ''),
          // 改为绝对时间展示，避免“x小时前”误判
          timeText: dt ? app.formatDateTime(dt, 'YYYY-MM-DD HH:mm') : (time ? app.formatDateTime(time, 'YYYY-MM-DD HH:mm') : ''),
          parrot_names: [],
          feed_type_names: []
        }
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
        timeText: item.timeText
      }
    })
    // 按时间倒序
    result.sort(function(a, b){
      const ta = parseInt(b.timeValue, 10)
      const tb = parseInt(a.timeValue, 10)
      const ma = isNaN(ta) ? 0 : ta
      const mb = isNaN(tb) ? 0 : tb
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
                    const responseUserInfo = res.data.data.user || {};
                    
                    // 使用后端完整的用户信息，保留角色等字段；仅在缺失时回退默认头像
                    const userInfo = { ...responseUserInfo };
                    if (!userInfo.avatar_url) {
                      userInfo.avatar_url = '/images/default-avatar.png';
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

  // 新增：卡片图片加载错误时替换为占位图
  handleIndexParrotImageError(e) {
    const id = e.currentTarget.dataset.id
    const parrots = (this.data.myParrots || []).map(p => {
      if (p.id === id) {
        const fallback = app.getDefaultAvatarForParrot(p)
        return { ...p, photo_url: '', avatar_url: fallback }
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

      // 弹窗显示最新一条；若用户已关闭过该条公告，则不再弹出
      const latest = list[0]
      let dismissed = []
      try { dismissed = wx.getStorageSync('dismissed_announcements') || [] } catch (_) {}
      const shouldShowModal = !dismissed.includes(latest.id)
      this.setData({ latestAnnouncement: latest, showAnnouncementModal: shouldShowModal })

      // 通知注入，避免重复：记录已注入的公告ID
      let seen = []
      try { seen = wx.getStorageSync('seen_announcements') || [] } catch (_) {}
      const nm = app.globalData.notificationManager
      const newIds = []
      list.forEach(a => {
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
