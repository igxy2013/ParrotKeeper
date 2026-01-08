// pages/statistics/statistics.js
const app = getApp()
const cache = require('../../utils/cache')

  Page({
    data: {
    isLogin: false,
    userMode: null, // 当前用户模式
    currentMonth: new Date().getMonth() + 1,
    
    // 统计数据
    overview: {},
    feedingTrends: [],
    expenseAnalysis: [],
    careFrequency: {},
    speciesDistribution: [],
    // 新增数据源
    foodPreference: [],
    
    // 筛选条件
    feedingPeriod: 'week',
    expenseData: [],
    expensePeriod: 'month',
    selectedPeriod: '本月',
    selectedExpenseIndex: -1,
    
    // 体重趋势数据
    weightSeries: [],
    selectedParrotId: null,
    selectedParrotName: '',
    showParrotDropdown: false,
    weightDays: 30,
    // 体重趋势颜色：12种高对比色（统一全局）
    weightColors: ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC'],
    weightLegend: [],
    // 体重趋势自定义时间范围（滑块）
    weightRangeDates: [],
    weightStartIndex: 0,
    weightEndIndex: 0,
    weightStartDate: '',
    weightEndDate: '',
    weightLeft: 0,
    weightRight: 100,
    weightWidth: 100,
      // 点击点高亮与标签
      activeWeightPoint: null,
      // 体重趋势卡片的当前范围平均体重
      weightAvgChart: '',
      weightRefChart: '',
      weightRefValue: null,
    
    // 加载状态
    loading: false,
    // 动态 PNG 图标（失败自动回退为 SVG）
    iconPaths: {
      tipInfoBlue: '/images/remix/ri-information-fill-blue.png',
      overview: {
        heartWhite: '/images/remix/ri-heart-fill-white.png',
        shieldWhite: '/images/remix/ri-shield-check-fill-white.png',
        restaurantWhite: '/images/remix/ri-restaurant-fill-white.png',
        scalesWhite: '/images/remix/ri-scales-fill-white.png'
      },
      lineChartPurple: '/images/remix/ri-line-chart-fill-purple.png',
      arrowDownGray: '/images/remix/ri-arrow-down-s-fill-gray.png',
      walletPurple: '/images/remix/ri-wallet-fill-purple.png',
      arrowRightGray: '/images/remix/ri-arrow-right-s-fill-gray.png',
      restaurantOrange: '/images/remix/ri-restaurant-fill-orange.png',
      pieChartBlue: '/images/remix/ri-pie-chart-2-fill-blue.png'
    }
  },

  onLoad() {
    this.checkLoginAndLoad()
  },

  onShow() {
    this.checkLoginAndLoad()
    
    // 检查是否需要刷新数据（模式切换后）
    if (app.globalData.needRefresh) {
      console.log('统计页面检测到needRefresh标志，刷新数据');
      app.globalData.needRefresh = false; // 重置标志
      this.loadUserMode();
      this.loadAllStatistics();
    }
  },

  // 检查登录状态并加载数据
  checkLoginAndLoad() {
    const isLogin = app.checkLoginStatus()
    this.setData({ isLogin })
    
    if (isLogin) {
      // 加载当前用户模式
      this.loadUserMode()
      this.loadAllStatistics()
    } else {
      // 游客模式显示示例数据
      this.setData({ userMode: null })
      this.loadGuestData()
    }
  },

  onPullDownRefresh() {
    this._forceRefresh = true
    this.loadAllStatistics().finally(() => {
      this._forceRefresh = false
      wx.stopPullDownRefresh()
    })
  },

  // 加载所有统计数据
  async loadAllStatistics() {
    this.setData({ loading: true })
    try {
      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      if (mode === 'team') {
        try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){}}
        const mp = (app && app.globalData && app.globalData.effectivePermissions) || null
        const canViewStats = !!(mp && (mp['stats.view'] || mp['all']))
        if (!canViewStats && !(app && typeof app.isTeamAdmin === 'function' && app.isTeamAdmin())) {
          this.setData({
            overview: {},
            feedingTrends: [],
            expenseAnalysis: [],
            careFrequency: {},
            speciesDistribution: [],
            foodPreference: [],
            weightSeries: [],
            weightLegend: [],
            selectedParrotId: null,
            selectedParrotName: '',
            activeWeightPoint: null
          })
          wx.showToast({ title: '无统计查看权限，请联系管理员', icon: 'none' })
          return
        }
      }
      await Promise.all([
        this.loadOverview(),
        this.loadFeedingTrends(),
        this.loadExpenseAnalysis(),
        this.loadCareFrequency(),
        this.loadSpeciesDistribution(),
        this.loadWeightTrends(),
        this.loadFoodPreference()
      ])
    } catch (error) {
      console.error('加载统计数据失败:', error)
      app.showError('加载失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载概览数据
  async loadOverview() {
    try {
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get('stats_overview')
      if (cached) {
        this.setData({ overview: cached })
        return
      }
      const res = await app.request({ url: '/api/statistics/overview', method: 'GET' })
      if (res.success) {
        this.setData({ overview: res.data })
        cache.set('stats_overview', res.data, 180000)
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  },

  // 加载喂食趋势
  async loadFeedingTrends() {
    try {
      const days = this.data.feedingPeriod === 'week' ? 7 : 30
      const key = `stats_feedingTrends_${days}`
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get(key)
      if (cached && Array.isArray(cached)) {
        const trends = this.processFeedingTrends(cached)
        this.setData({ feedingTrends: trends })
        this.drawFeedingChart()
        return
      }
      const res = await app.request({ url: '/api/statistics/feeding-trends', method: 'GET', data: { days } })
      if (res.success) {
        const trends = this.processFeedingTrends(res.data)
        this.setData({ feedingTrends: trends })
        cache.set(key, res.data, 180000)
        this.drawFeedingChart()
      }
    } catch (error) {
      console.error('加载喂食趋势失败:', error)
    }
  },

  // 处理喂食趋势数据
  processFeedingTrends(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return []
    
    const maxCount = Math.max(...data.map(item => item.count || 0))
    
    return data.map(item => {
      const date = new Date(item.date)
      const dateShort = this.data.feedingPeriod === 'week' 
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : `${date.getDate()}日`
      
      return {
        ...item,
        date_short: dateShort,
        percentage: maxCount > 0 ? ((item.count || 0) / maxCount) * 100 : 0
      }
    })
  },

  // 加载支出分析
  async loadExpenseAnalysis() {
    try {
      const p = this.data.selectedPeriod || '本月'
      if (p === '全部') {
        const force = !!this._forceRefresh
        const cached = force ? null : cache.get('stats_expenseAnalysis')
        if (cached && cached.category_expenses) {
          const analysis = this.processExpenseAnalysis(cached)
          this.setData({ expenseAnalysis: analysis, selectedExpenseIndex: -1 })
          wx.nextTick(() => this.drawExpensePieChart())
          return
        }
        const res = await app.request({ url: '/api/statistics/expense-analysis', method: 'GET' })
        if (res.success) {
          const analysis = this.processExpenseAnalysis(res.data)
          this.setData({ expenseAnalysis: analysis, selectedExpenseIndex: -1 })
          cache.set('stats_expenseAnalysis', res.data, 180000)
          wx.nextTick(() => this.drawExpensePieChart())
        }
        return
      }

      const now = new Date()
      const pad2 = n => String(n).padStart(2, '0')
      let start, end
      if (p === '今天') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } else if (p === '本周') {
        const dow = now.getDay()
        const diff = now.getDate() - dow + (dow === 0 ? -6 : 1)
        start = new Date(now.getFullYear(), now.getMonth(), diff)
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      } else if (p === '本月') {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      } else if (p === '本年') {
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear() + 1, 0, 1)
      } else {
        start = null
        end = null
      }
      const fmt = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

      const per = 500
      let pageIdx = 1
      const collected = []
      while (pageIdx <= 20) {
        const params = {
          page: pageIdx,
          per_page: per,
          record_type: '支出',
          ...(start && end ? { start_date: fmt(start), end_date: fmt(end) } : {})
        }
        const res = await app.request({ url: '/api/expenses/transactions', method: 'GET', data: params })
        const data = res && res.success && res.data ? res.data : {}
        const items = Array.isArray(data.items) ? data.items : []
        if (!items.length) break
        collected.push(...items)
        if (items.length < per) break
        pageIdx += 1
      }

      const agg = {}
      for (let i = 0; i < collected.length; i++) {
        const r = collected[i] || {}
        const key = r.category_text || r.category || '其他'
        const amt = Number(r.amount || 0) || 0
        agg[key] = (agg[key] || 0) + amt
      }
      const total = Object.values(agg).reduce((s, v) => s + (Number(v) || 0), 0)
      const categoryColors = {
        '食物': '#10b981',
        '玩具': '#3b82f6',
        '医疗': '#f59e0b',
        '用品': '#ec4899',
        '笼具': '#8b5cf6',
        '幼鸟': '#06b6d4',
        '种鸟': '#ef4444',
        '配件': '#22c55e',
        '美容': '#f97316',
        '训练': '#9ca3af',
        '其他': '#6b7280'
      }
      const analysis = Object.keys(agg).map((k) => ({
        category: k,
        amount: agg[k],
        percentage: total > 0 ? Math.round((agg[k] / total) * 100) : 0,
        color: categoryColors[k] || '#667eea'
      })).sort((a, b) => b.amount - a.amount)
      this.setData({ expenseAnalysis: analysis, selectedExpenseIndex: -1 })
      wx.nextTick(() => this.drawExpensePieChart())
    } catch (error) {
      console.error('加载支出分析失败:', error)
    }
  },

  // 处理支出分析数据
  processExpenseAnalysis(data) {
    if (!data || !data.category_expenses || !Array.isArray(data.category_expenses) || data.category_expenses.length === 0) {
      return []
    }
    
    // 类别中英文映射
    const categoryMap = {
        'food': '食物',
        'medical': '医疗',
        'toys': '玩具',
        'cage': '笼具',
        'baby_bird': '幼鸟',
        'breeding_bird': '种鸟',
        'accessories': '配件',
        'grooming': '美容',
        'training': '训练',
        'other': '其他'
      }
    
    // 根据图片配置特定颜色
    const categoryColors = {
      '食物': '#10b981', // 绿色
      '玩具': '#3b82f6', // 蓝色
      '医疗': '#f59e0b', // 橙色
      '用品': '#ec4899', // 粉色
      '笼具': '#8b5cf6', // 紫色
      '幼鸟': '#06b6d4', // 青色
      '种鸟': '#ef4444', // 红色
      '配件': '#22c55e', // 浅绿色
      '美容': '#f97316', // 深橙色
      '训练': '#9ca3af', // 灰色
      '其他': '#6b7280'  // 深灰色
    }
    
    const categoryData = data.category_expenses
    const total = categoryData.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    
    return categoryData.map((item, idx) => {
      const categoryName = categoryMap[item.category] || item.category
      return {
        category: categoryName,
        amount: item.total_amount,
        percentage: total > 0 ? Math.round(((item.total_amount || 0) / total) * 100) : 0,
        color: categoryColors[categoryName] || '#667eea' // 默认颜色
      }
    })
  },

  // 处理支出饼图点击
  handleExpensePieTap(e) {
    console.log('点击事件触发:', e)
    
    // 优先使用 changedTouches 中的 clientX/Y，因为它们是相对于视口的
    // 如果没有，退回到 detail.x/y (这是相对于文档的，如果有滚动会有偏差)
    let clientX, clientY
    if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX
        clientY = e.changedTouches[0].clientY
    } else {
        // 只有 detail，可能是电脑端模拟器，或者某种特殊情况
        // 如果这里只有 pageX/Y，我们需要减去 scrollTop 才能得到 clientY
        // 但这里没法同步获取 scrollTop。
        // 不过通常 bindtap 在真机上也有 changedTouches
        clientX = e.detail.x
        clientY = e.detail.y
    }

    const query = wx.createSelectorQuery().in(this)
    query.select('#expensePieCanvas').boundingClientRect()
    query.exec(res => {
      const rect = res[0]
      if (!rect) {
        console.error('未找到 Canvas 节点信息')
        return
      }
      console.log('Canvas 区域:', rect)
      
      // rect.left/top 是相对于视口的
      // 如果我们用 e.detail.x (pageX)，则 canvasX = pageX - (rect.left + scrollLeft)
      // 如果我们用 clientX (viewX)，则 canvasX = clientX - rect.left
      
      // 为了兼容性，如果发现 clientY 明显比 rect.top 大很多（可能是包含了 scrollTop），
      // 或者我们确定 e.detail.x 是 pageX。
      // 最稳妥的是：如果 changedTouches 存在，用它。
      
      let canvasX, canvasY
      if (e.changedTouches && e.changedTouches.length > 0) {
          canvasX = clientX - rect.left
          canvasY = clientY - rect.top
      } else {
          // 如果只有 detail，且页面有滚动，这里会有问题。
          // 尝试获取 scrollOffset
          // 但这里为了简化，先假设 detail.x - rect.left 大致可用，或者用户没有滚动太远
          // 实际上，如果用 detail.x (pageX) 减去 rect.left (viewLeft)，
          // 结果 = (viewX + scrollX) - viewLeft = canvasX + scrollX。
          // 所以如果页面横向滚动了，X 会偏；纵向滚动了，Y 会偏。
          // 这是一个已知的小程序 Canvas 点击痛点。
          
          // 临时方案：直接使用 detail，但在长列表中可能有 bug
          canvasX = clientX - rect.left
          canvasY = clientY - rect.top
      }

      const width = rect.width
      const height = rect.height
      const cx = width / 2
      const cy = height / 2
      
      console.log('点击坐标(相对):', canvasX, canvasY, '中心点:', cx, cy)

      // 计算点击点相对于圆心的距离和角度
      const dx = canvasX - cx
      const dy = canvasY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const radius = Math.min(width, height) / 2 - 10
      const inner = radius * 0.65
      
      console.log('距离:', dist, '外半径:', radius, '内半径:', inner)

      // 如果点击在圆环外或圆环内空心区域
      if (dist > radius + 20) { // 放宽外部点击范围
          console.log('点击在圆环外')
          this.setData({ selectedExpenseIndex: -1 })
          this.drawExpensePieChart()
          return
      }

      if (dist < inner - 10) { // 稍微放宽内部点击范围
        console.log('点击在圆环内')
        // 点击中间空白区域，切换回总览
        this.setData({ selectedExpenseIndex: -1 })
        this.drawExpensePieChart()
        return
      }
      
      // 计算角度
      let angle = Math.atan2(dy, dx)
      // 转换为 [-PI/2, 3PI/2) 范围，起始点为 -PI/2 (12点钟)
      if (angle < -Math.PI / 2) {
        angle += Math.PI * 2
      }
      
      console.log('点击角度(弧度):', angle)

      // 查找命中的扇区
      const data = this.data.expenseAnalysis || []
      let start = -Math.PI / 2
      let foundIndex = -1
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        const sweep = (item.percentage / 100) * Math.PI * 2
        const end = start + sweep
        
        // 增加一点点容错，处理浮点数边界
        if (angle >= start - 0.01 && angle < end + 0.01) {
          foundIndex = i
          break
        }
        start = end
      }
      
      console.log('命中索引:', foundIndex)

      // 如果点击的是当前已选中的，则取消选中；否则选中新的
      const newIndex = (this.data.selectedExpenseIndex === foundIndex) ? -1 : foundIndex
      
      if (newIndex !== -1 && newIndex !== this.data.selectedExpenseIndex) {
          wx.vibrateShort({ type: 'light' }).catch(() => {})
      }

      this.setData({ selectedExpenseIndex: newIndex })
      this.drawExpensePieChart()
    })
  },

  // 绘制支出分析饼图（对齐APP：圆环+中心总额+标签）
  drawExpensePieChart() {
    const data = this.data.expenseAnalysis || []
    const selectedIndex = this.data.selectedExpenseIndex
    const query = wx.createSelectorQuery()
    query.select('#expensePieCanvas').node()
    query.select('#expensePieCanvas').boundingClientRect()
    query.exec(res => {
      const nodeRes = res && res[0]
      const rect = res && res[1]
      if (!nodeRes || !nodeRes.node || !rect) return
      const canvas = nodeRes.node
      const width = rect.width || 300
      const height = rect.height || 200
      const ctx = canvas.getContext('2d')
      const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || {}
      const dpr = winInfo.pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // 空数据占位
      if (!data.length) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无支出数据', width/2, height/2)
        return
      }

      const cx = width / 2
      const cy = height / 2
      const baseRadius = Math.min(width, height) / 2 - 10
      const innerRadius = baseRadius * 0.65 
      const totalAmount = data.reduce((s, i) => s + (i.amount || 0), 0)

      // 绘制圆环分片
      let start = -Math.PI / 2
      data.forEach((item, index) => {
        const angle = (item.percentage / 100) * Math.PI * 2
        // 修正：确保最小角度以便于点击，但这里主要是绘制
        const end = start + angle
        const isSelected = index === selectedIndex
        
        // 选中时半径稍微变大
        const outerRadius = isSelected ? baseRadius + 6 : baseRadius
        
        if (angle > 0) { // 这里之前是 angle > 0，如果 percentage 很小可能是 0
          ctx.beginPath()
          ctx.arc(cx, cy, outerRadius, start, end)
          ctx.arc(cx, cy, innerRadius, end, start, true)
          ctx.closePath()
          
          ctx.fillStyle = item.color || '#667eea'
          
          // 如果有选中项且当前项不是选中项，则降低透明度
          if (selectedIndex !== -1 && !isSelected) {
              ctx.globalAlpha = 0.3
          } else {
              ctx.globalAlpha = 1.0
          }
          
          ctx.fill()
          
          // 选中项加白色描边，使视觉更清晰
          if (isSelected) {
            ctx.lineWidth = 2
            ctx.strokeStyle = '#ffffff'
            ctx.stroke()
          }
        }
        start = end
      })
      
      // 恢复透明度
      ctx.globalAlpha = 1.0

      // 中心文字
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      if (selectedIndex !== -1) {
          const selectedItem = data[selectedIndex]
          // 选中类别名
          ctx.fillStyle = selectedItem.color || '#6b7280'
          ctx.font = 'bold 16px sans-serif'
          ctx.fillText(selectedItem.category, cx, cy - 18)
          // 选中金额
          ctx.fillStyle = '#1f2937'
          ctx.font = 'bold 22px sans-serif'
          ctx.fillText(`¥${(selectedItem.amount || 0).toFixed(2)}`, cx, cy + 10)
          // 选中比例
          ctx.fillStyle = '#9ca3af'
          ctx.font = '14px sans-serif'
          ctx.fillText(`${selectedItem.percentage}%`, cx, cy + 32)
      } else {
          // 标题样式
          ctx.fillStyle = '#6b7280'
          ctx.font = '12px sans-serif'
          ctx.fillText('总支出', cx, cy - 16)
          // 金额样式
          ctx.fillStyle = '#1f2937'
          ctx.font = 'bold 20px sans-serif'
          ctx.fillText(`¥${(totalAmount || 0).toFixed(2)}`, cx, cy + 8)
      }
    })
  },

  // 加载护理频率
  async loadCareFrequency() {
    try {
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get('stats_careFrequency')
      if (cached) {
        this.setData({ careFrequency: cached })
        return
      }
      const res = await app.request({ url: '/api/statistics/care-frequency', method: 'GET' })
      if (res.success) {
        this.setData({ careFrequency: res.data })
        cache.set('stats_careFrequency', res.data, 180000)
      }
    } catch (error) {
      console.error('加载护理频率失败:', error)
    }
  },

  // 加载品种分布
  async loadSpeciesDistribution() {
    try {
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get('stats_speciesDistribution')
      if (cached && Array.isArray(cached)) {
        this.setData({ speciesDistribution: cached })
        return
      }
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res.success) {
        const parrotsRes = await app.request({ url: '/api/parrots', method: 'GET', data: { limit: 1000 } })
        if (parrotsRes.success) {
          const parrots = parrotsRes.data.parrots || []
          const distribution = this.processSpeciesDistribution(res.data, parrots)
          this.setData({ speciesDistribution: distribution })
          cache.set('stats_speciesDistribution', distribution, 180000)
        }
      }
    } catch (error) {
      console.error('加载品种分布失败:', error)
    }
  },

  // 处理品种分布数据
  processSpeciesDistribution(species, parrots) {
    if (!Array.isArray(parrots)) {
      parrots = []
    }
    
    const speciesCount = {}
    
    // 统计每个品种的数量
    parrots.forEach(parrot => {
      const speciesName = parrot.species_name
      if (speciesName) {
        speciesCount[speciesName] = (speciesCount[speciesName] || 0) + 1
      }
    })
    
    const total = parrots.length
    
    // 定义颜色数组，使用更鲜艳的颜色以增强可见性
    const colors = ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']
    
    return Object.entries(speciesCount)
      .map(([species, count], index) => ({
        species,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count)
  },

  // 加载食物偏好
  async loadFoodPreference() {
    try {
      const today = new Date()
      const fmt = d => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${dd}`
      }
      let start
      let end
      const p = this.data.selectedPeriod || '本月'
      if (p === '今天') {
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      } else if (p === '本周') {
        const dow = today.getDay()
        start = new Date(today)
        start.setDate(today.getDate() - dow)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
      } else if (p === '本月') {
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      } else if (p === '本年') {
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31)
      } else {
        start = new Date(1970, 0, 1)
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      }
      // 使用 v2 后缀避免旧缓存数据结构不匹配导致的显示异常（旧缓存可能是未处理的原始数据列表）
      const key = `stats_foodPref_v2_${p}`
      const force = !!this._forceRefresh
      const cached = force ? null : cache.get(key)
      // 增加数据结构校验，确保缓存的是已处理的数据（包含 percentage 字段）
      if (cached && Array.isArray(cached) && (cached.length === 0 || cached[0].percentage !== undefined)) {
        this.setData({ foodPreference: cached })
        return
      }
      const res = await app.request({ url: '/api/records/feeding', method: 'GET', data: { start_date: fmt(start), end_date: fmt(end) } })
      if (res.success) {
        const pref = this.processFoodPreference(res.data)
        this.setData({ foodPreference: pref })
        cache.set(key, pref, 180000)
      }
    } catch (e) {
      console.error('加载食物偏好失败:', e)
    }
  },

  // 处理食物偏好数据
  processFoodPreference(data) {
    // 兼容分页结构：后端返回 { items, page, per_page, total }
    // 同时兼容旧结构 { records: [...] } 以及直接数组
    const records = Array.isArray(data)
      ? data
      : (data && Array.isArray(data.items))
        ? data.items
        : (data && Array.isArray(data.records))
          ? data.records
          : []
    const typeMap = {
      seed: { label: '种子', color: '#f59e0b' },
      pellet: { label: '颗粒', color: '#10b981' },
      fruit: { label: '水果', color: '#ef4444' },
      vegetable: { label: '蔬菜', color: '#22c55e' },
      supplement: { label: '营养补充', color: '#06b6d4' },
      milk_powder: { label: '奶粉', color: '#8b5cf6' }
    }
    const counter = Object.create(null)
    const list = Array.isArray(records) ? records : []
    for (let i = 0; i < list.length; i++) {
      const r = list[i]
      const t = (r && r.feed_type && r.feed_type.type) ? r.feed_type.type : 'other'
      counter[t] = (counter[t] || 0) + 1
    }
    let total = 0
    for (const k in counter) {
      if (Object.prototype.hasOwnProperty.call(counter, k)) {
        total += counter[k] || 0
      }
    }
    const result = []
    for (const k in counter) {
      if (Object.prototype.hasOwnProperty.call(counter, k)) {
        const mapItem = typeMap[k] || {}
        result.push({
          type: k,
          label: mapItem.label || '其他',
          count: counter[k],
          percentage: total > 0 ? Math.round(counter[k] * 100 / total) : 0,
          color: mapItem.color || '#9ca3af'
        })
      }
    }
    // 按数量降序排序以贴近参考APP展示
    result.sort((a, b) => (b.count || 0) - (a.count || 0))
    return result
  },

  // 统计页图标加载失败时回退为 SVG
  onStatIconError(e) {
    try {
      const keyPath = e.currentTarget.dataset.key
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

  // 绘制食物偏好饼图
  drawFoodPreferenceChart() {
    const data = this.data.foodPreference || []
    const query = wx.createSelectorQuery()
    query.select('#foodPrefCanvas').node()
    query.select('#foodPrefCanvas').boundingClientRect()
    query.exec(res => {
      const nodeRes = res && res[0]
      const rect = res && res[1]
      if (!nodeRes || !nodeRes.node || !rect) return
      const canvas = nodeRes.node
      const width = rect.width || 300
      const height = rect.height || 200
      const ctx = canvas.getContext('2d')
      const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || {}
      const dpr = winInfo.pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      if (!data.length) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无数据', width/2, height/2)
        return
      }
      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) / 2 - 16
      let start = -Math.PI / 2
      data.forEach(item => {
        const angle = (item.percentage / 100) * Math.PI * 2
        const end = start + angle
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, start, end)
        ctx.closePath()
        ctx.fillStyle = item.color
        ctx.fill()
        start = end
      })
    })
  },

  // 切换喂食趋势时间段
  changeFeedingPeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ feedingPeriod: period })
    this.loadFeedingTrends()
  },

  // 绘制喂食趋势折线面积图（canvas 2D）
  drawFeedingChart() {
    const trends = this.data.feedingTrends || []
    const query = wx.createSelectorQuery()
    query.select('#feedingCanvas').node()
    query.select('#feedingCanvas').boundingClientRect()
    query.exec(res => {
      const nodeRes = res && res[0]
      const rect = res && res[1]
      if (!nodeRes || !nodeRes.node || !rect) return
      const canvas = nodeRes.node
      const width = rect.width || 300
      const height = rect.height || 200
      const ctx = canvas.getContext('2d')
      const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || {}
      const dpr = winInfo.pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, width, height)
      if (!trends.length) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无喂食数据', width / 2, height / 2)
        return
      }

      const counts = trends.map(t => t.count || 0)
      const maxCount = Math.max(...counts)
      const minCount = 0

      const paddingLeft = 24
      const paddingRight = 12
      const paddingTop = 12
      const paddingBottom = 24
      const chartW = width - paddingLeft - paddingRight
      const chartH = height - paddingTop - paddingBottom

      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(width - paddingRight, height - paddingBottom)
      ctx.moveTo(paddingLeft, paddingTop)
      ctx.lineTo(paddingLeft, height - paddingBottom)
      ctx.stroke()

      const stepX = chartW / Math.max(trends.length - 1, 1)
      const scaleY = maxCount > minCount ? chartH / (maxCount - minCount) : 0

      const points = trends.map((t, idx) => {
        const x = paddingLeft + idx * stepX
        const y = paddingTop + (maxCount - (t.count || 0)) * scaleY
        return { x, y, v: t.count || 0 }
      })

      const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom)
      grad.addColorStop(0, 'rgba(102, 126, 234, 0.35)')
      grad.addColorStop(1, 'rgba(118, 75, 162, 0.05)')

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.lineTo(points[points.length - 1].x, height - paddingBottom)
      ctx.lineTo(points[0].x, height - paddingBottom)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      ctx.strokeStyle = '#667eea'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()

      ctx.fillStyle = '#667eea'
      points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = '#1f2937'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      points.forEach(p => {
        const label = String(p.v)
        ctx.fillText(label, p.x, p.y - 8)
      })
    })
  },

  // 跳转到支出管理页面
  navigateToExpenses() {
    wx.navigateTo({
      url: '/pages/expenses/expenses'
    })
  },

  // 打开体重趋势全屏横屏页面
  openWeightFullscreen() {
    const payload = {
      weightSeries: this.data.weightSeries,
      selectedParrotId: this.data.selectedParrotId,
      weightColors: this.data.weightColors,
      weightLegend: this.data.weightLegend,
      weightStartDate: this.data.weightStartDate,
      weightEndDate: this.data.weightEndDate
    }
    wx.navigateTo({
      url: '/pages/statistics/weight-fullscreen/weight-fullscreen',
      success: (res) => {
        if (res && res.eventChannel && res.eventChannel.emit) {
          res.eventChannel.emit('weightData', payload)
        }
      }
    })
  },

  // 游客模式加载示例数据
  loadGuestData() {
    this.setData({
      loading: true,
      overview: {
        total_parrots: 3,
        health_status: {
          healthy: 2,
          sick: 1,
          recovering: 0
        },
        monthly_expense: 268.50,
        today_records: {
          feeding: 5,
          cleaning: 2
        }
      },
      feedingTrends: [
        { date: '2024-01-15', count: 8 },
        { date: '2024-01-16', count: 6 },
        { date: '2024-01-17', count: 7 },
        { date: '2024-01-18', count: 9 },
        { date: '2024-01-19', count: 5 },
        { date: '2024-01-20', count: 8 },
        { date: '2024-01-21', count: 7 }
      ],
      expenseAnalysis: [
        { category: '食物', amount: 150.00, percentage: 56 },
        { category: '医疗', amount: 80.00, percentage: 30 },
        { category: '玩具', amount: 38.50, percentage: 14 }
      ],
      careFrequency: {
        feeding: { count: 45, avg_per_day: 2.1 },
        cleaning: { count: 12, avg_per_day: 0.6 },
        health: { count: 3, avg_per_day: 0.1 }
      },
      speciesDistribution: [
        { species: '虎皮鹦鹉', count: 2, percentage: 67 },
        { species: '玄凤鹦鹉', count: 1, percentage: 33 }
      ],
      loading: false
    })
  },

  // 加载当前团队信息
  loadUserMode() {
    // 从全局数据获取用户模式
    const userMode = app.globalData.userMode || 'personal';
    this.setData({
      userMode: userMode
    });
  },

  // 切换模式
  switchMode() {
    const currentMode = this.data.userMode;
    const newMode = currentMode === 'personal' ? 'team' : 'personal';
    
    wx.showModal({
      title: '切换模式',
      content: `确定要切换到${newMode === 'personal' ? '个人' : '团队'}模式吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.confirmModeSwitch(newMode);
        }
      }
    });
  },

  // 确认模式切换
  confirmModeSwitch(newMode) {
    const that = this;
    
    // 显示加载提示
    wx.showLoading({
      title: '切换中...',
      mask: true
    });
    
    // 调用后端API更新用户模式
    wx.request({
      url: `${app.globalData.baseUrl}/api/auth/profile`,
      method: 'PUT',
      header: {
        'X-OpenID': app.globalData.openid,
        'Content-Type': 'application/json'
      },
      data: {
        user_mode: newMode
      },
      success: function(res) {
        wx.hideLoading();
        
        if (res.data.success) {
          app.setUserMode && app.setUserMode(newMode);
          
          // 更新页面数据
          that.setData({
            userMode: newMode
          });
          
          // 显示切换成功提示
          wx.showToast({
            title: `已切换到${newMode === 'personal' ? '个人' : '团队'}模式`,
            icon: 'success'
          });
          
          // 刷新数据
          try { cache.clear('stats_overview') } catch (_) {}
          try { cache.clear('index_overview') } catch (_) {}
          that.loadAllStatistics();
          
          console.log('模式切换成功:', newMode);
        } else {
          wx.showToast({
            title: res.data.message || '切换失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        wx.hideLoading();
        console.error('切换模式失败:', error);
        wx.showToast({
          title: '网络错误，切换失败',
          icon: 'none'
        });
      }
    });
  },

  // 设置顶部时间段并刷新相关数据
  setSelectedPeriod(e) {
    const period = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.period) || '本月'
    let weightDays = 7
    if (period === '今天') weightDays = 1
    else if (period === '本周') weightDays = 7
    else if (period === '本月') weightDays = 30
    else if (period === '本年') weightDays = 365
    else if (period === '全部') weightDays = 36500 // 约100年，等效于“全部”
    this.setData({ selectedPeriod: period, weightDays })
    this.loadWeightTrends()
    this.loadFoodPreference()
    this.loadExpenseAnalysis()
  },

  // 加载体重趋势（每只鹦鹉的折线）
  async loadWeightTrends() {
    try {
      const days = this.data.weightDays
      const key = `stats_weightTrends_${days}`
      const force = !!this._forceRefresh
      const cachedSeries = force ? null : cache.get(key)
      let seriesArr
      if (cachedSeries && Array.isArray(cachedSeries)) {
        seriesArr = cachedSeries
      } else {
        const res = await app.request({ url: '/api/statistics/weight-trends', method: 'GET', data: { days } })
        if (!(res.success && res.data && Array.isArray(res.data.series))) return
        seriesArr = Array.isArray(res.data.series) ? res.data.series : []
        cache.set(key, seriesArr, 180000)
      }
      this.setData({ weightSeries: seriesArr })
      this.updateWeightLegend()
      const dateSet = new Set()
      for (let i = 0; i < seriesArr.length; i++) {
        const pts = Array.isArray(seriesArr[i].points) ? seriesArr[i].points : []
        for (let j = 0; j < pts.length; j++) {
          const d = pts[j] && pts[j].date
          if (d) dateSet.add(d)
        }
      }
      const rangeDates = Array.from(dateSet).sort()
      const startIdx = 0
      const endIdx = Math.max(0, rangeDates.length - 1)
      this.setData({
        weightRangeDates: rangeDates,
        weightStartIndex: startIdx,
        weightEndIndex: endIdx,
        weightStartDate: rangeDates[startIdx] || '',
        weightEndDate: rangeDates[endIdx] || ''
      })
      this.updateSliderView()
      const allPoints = []
      for (let i = 0; i < seriesArr.length; i++) {
        const pts = Array.isArray(seriesArr[i].points) ? seriesArr[i].points : []
        for (let j = 0; j < pts.length; j++) {
          const w = pts[j] && pts[j].weight
          if (typeof w === 'number' && !isNaN(w) && w > 0) {
            allPoints.push(w)
          }
        }
      }
      let avg = ''
      if (allPoints.length > 0) {
        let sum = 0
        for (let k = 0; k < allPoints.length; k++) sum += allPoints[k]
        avg = Math.round(sum / allPoints.length) + 'g'
      }
      this.setData({ avgWeight: avg || '--' })
      if (!this.data.selectedParrotId) {
        const cutoff = Date.now() - (days || 30) * 86400000
        let autoId = null
        let autoName = ''
        let maxCount = -1
        for (let i = 0; i < seriesArr.length; i++) {
          const pts = Array.isArray(seriesArr[i].points) ? seriesArr[i].points : []
          let count = 0
          for (let j = 0; j < pts.length; j++) {
            const p = pts[j]
            const d = p && p.date ? new Date(p.date) : null
            const ts = d && !isNaN(d) ? d.getTime() : NaN
            if (!isNaN(ts) && ts >= cutoff && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) count++
          }
          if (count > maxCount) {
            maxCount = count
            autoId = String(seriesArr[i].parrot_id)
            autoName = seriesArr[i].parrot_name || ''
          }
        }
        if (maxCount <= 0) {
          maxCount = -1
          for (let i = 0; i < seriesArr.length; i++) {
            const pts = Array.isArray(seriesArr[i].points) ? seriesArr[i].points : []
            let allCount = 0
            for (let j = 0; j < pts.length; j++) {
              const p = pts[j]
              if (p && p.date && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) allCount++
            }
            if (allCount > maxCount) {
              maxCount = allCount
              autoId = String(seriesArr[i].parrot_id)
              autoName = seriesArr[i].parrot_name || ''
            }
          }
        }
        if (autoId) {
          this.setData({ selectedParrotId: autoId, selectedParrotName: autoName })
        }
      }
      this.updateWeightLegend()
      if (this.data.selectedParrotId) {
        this._loadParrotRefWeight && this._loadParrotRefWeight(this.data.selectedParrotId)
      } else {
        this.setData({ weightRefValue: null, weightRefChart: '' })
      }
      this.drawWeightChart()
    } catch (err) {
      console.error('加载体重趋势失败:', err)
    }
  },

  // 切换鹦鹉下拉菜单显示状态
  toggleParrotDropdown() {
    this.setData({
      showParrotDropdown: !this.data.showParrotDropdown
    })
  },

  // 选择体重趋势的鹦鹉
  selectWeightParrot(e) {
    const parrotId = e.currentTarget.dataset.id
    let selectedParrotName = '全部鹦鹉'
    
    if (parrotId) {
      const selectedParrot = this.data.weightSeries.find(s => String(s.parrot_id) === String(parrotId))
      if (selectedParrot) {
        selectedParrotName = selectedParrot.parrot_name
      }
    }
    
    this.setData({
      selectedParrotId: parrotId || null,
      selectedParrotName: selectedParrotName,
      showParrotDropdown: false
    })
    this.updateWeightLegend()
    if (parrotId) {
      this._loadParrotRefWeight(parrotId)
    } else {
      this.setData({ weightRefValue: null, weightRefChart: '' })
      this.drawWeightChart()
    }
  },

  async _loadParrotRefWeight(parrotId) {
    try {
      const detailRes = await app.request({ url: `/api/parrots/${parrotId}`, method: 'GET' })
      let speciesId = ''
      let speciesName = ''
      if (detailRes && detailRes.success && detailRes.data) {
        const p = detailRes.data
        speciesId = p.species_id || (p.species && p.species.id) || ''
        speciesName = (p.species && p.species.name) || p.species_name || ''
      }
      const speciesRes = await app.request({ url: '/api/parrots/species', method: 'GET' })
      let refWeight = null
      if (speciesRes && speciesRes.success && Array.isArray(speciesRes.data)) {
        const list = speciesRes.data
        let matched = null
        if (speciesId) {
          matched = list.find(s => String(s.id) === String(speciesId)) || null
        }
        if (!matched && speciesName) {
          matched = list.find(s => String(s.name) === String(speciesName)) || null
        }
        if (matched) {
          const raw = (matched.reference_weight_g != null ? matched.reference_weight_g : matched.reference_weight)
          const num = typeof raw === 'string' ? parseFloat(raw) : raw
          if (typeof num === 'number' && isFinite(num) && !isNaN(num) && num > 0) {
            refWeight = num
          }
        }
      }
      if (typeof refWeight === 'number') {
        this.setData({ weightRefValue: refWeight, weightRefChart: refWeight.toFixed(1) + 'g' }, () => this.drawWeightChart())
      } else {
        this.setData({ weightRefValue: null, weightRefChart: '' }, () => this.drawWeightChart())
      }
    } catch (_) {
      this.setData({ weightRefValue: null, weightRefChart: '' }, () => this.drawWeightChart())
    }
  },

  // 点击图表外部区域时关闭标签与参考线高亮
  closeWeightHoverLabel() {
    this._activeGuideX = null
    this.setData({ activeWeightPoint: null })
    this.drawWeightChart()
  },

  updateWeightLegend() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const baseSeries = series.slice(0, 12)
    const palette = this.data.weightColors || ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
    const colorMap = {}
    for (let i = 0; i < baseSeries.length; i++) {
      const sid = String(baseSeries[i].parrot_id)
      colorMap[sid] = palette[i % palette.length]
    }
    this.weightColorMap = colorMap
    this.setData({ weightColorMap: colorMap })
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : baseSeries
    const legend = (displaySeries || []).map(s => ({
      parrot_id: s.parrot_id,
      parrot_name: s.parrot_name,
      color: colorMap[String(s.parrot_id)] || palette[0]
    }))
    this.setData({ weightLegend: legend })
  },

  // 更新滑块视图位置
  updateSliderView() {
    const dates = this.data.weightRangeDates || []
    const total = dates.length > 1 ? dates.length - 1 : 1
    const start = this.data.weightStartIndex
    const end = this.data.weightEndIndex
    
    const left = (start / total) * 100
    const right = (end / total) * 100
    const width = right - left
    
    this.setData({
      weightLeft: left,
      weightRight: right,
      weightWidth: width
    })
  },

  // 滑块触摸开始
  onSliderTouchStart(e) {
    const type = e.currentTarget.dataset.type
    this._sliderActiveType = type
    
    const query = wx.createSelectorQuery().in(this)
    query.select('.slider-area').boundingClientRect((rect) => {
      this._sliderRect = rect
    }).exec()
  },

  // 滑块触摸移动
  onSliderTouchMove(e) {
    if (!this._sliderActiveType || !this._sliderRect) return
    
    const clientX = e.touches[0].clientX
    const width = this._sliderRect.width
    const left = this._sliderRect.left
    
    let percent = (clientX - left) / width
    percent = Math.max(0, Math.min(1, percent))
    
    const dates = this.data.weightRangeDates || []
    const total = dates.length > 1 ? dates.length - 1 : 1
    
    const idx = Math.round(percent * total)
    
    if (this._sliderActiveType === 'start') {
      let newStart = idx
      const currentEnd = this.data.weightEndIndex
      if (newStart > currentEnd) newStart = currentEnd
      
      if (newStart !== this.data.weightStartIndex) {
         this.setData({
           weightStartIndex: newStart,
           weightStartDate: dates[newStart] || ''
         })
         this.updateSliderView()
         this.drawWeightChart()
      }
    } else {
      let newEnd = idx
      const currentStart = this.data.weightStartIndex
      if (newEnd < currentStart) newEnd = currentStart
      
      if (newEnd !== this.data.weightEndIndex) {
         this.setData({
           weightEndIndex: newEnd,
           weightEndDate: dates[newEnd] || ''
         })
         this.updateSliderView()
         this.drawWeightChart()
      }
    }
  },

  // 绘制体重折线图（canvas 2D）
  drawWeightChart() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series.slice(0, 12)
    const hasRange = !!(this.data.weightStartDate && this.data.weightEndDate)
    const rangeStart = this.data.weightStartDate
    const rangeEnd = this.data.weightEndDate
  
    const query = wx.createSelectorQuery()
    query.select('#weightCanvas').node()
    query.select('#weightCanvas').boundingClientRect()
    query.exec(res => {
      const nodeRes = res && res[0]
      const rect = res && res[1]
      if (!nodeRes || !nodeRes.node || !rect) return
      // 记录画布位置与尺寸用于点击定位
      this.weightCanvasRect = rect
      const canvas = nodeRes.node
      const width = rect.width || 300
      const height = rect.height || 200
      const ctx = canvas.getContext('2d')
      const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || {}
      const dpr = winInfo.pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
  
      // 清空
      ctx.clearRect(0, 0, width, height)
  
      if (!displaySeries.length) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无体重数据', width / 2, height / 2)
        // 无数据时平均体重置空
        this.setData({ weightAvgChart: '--' })
        return
      }
  
      // 收集所有日期与体重范围（根据滑块选择过滤）
      const allPoints = []
      displaySeries.forEach(s => {
        (s.points || []).forEach(p => {
          // 验证体重数据的有效性
          if (p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) {
            if (hasRange) {
              const d = p.date
              if (d && d >= rangeStart && d <= rangeEnd) {
                allPoints.push(p)
              }
            } else {
              allPoints.push(p)
            }
          }
        })
      })

      // 如果没有有效的体重数据点，显示提示信息
      if (allPoints.length === 0) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无有效体重数据', width / 2, height / 2)
        // 无有效数据时平均体重置空
        this.setData({ weightAvgChart: '--' })
        return
      }

      const dates = Array.from(new Set(allPoints.map(p => p.date))).sort()
      const weights = allPoints.map(p => p.weight)
      let minW = Math.min(...weights)
      let maxW = Math.max(...weights)
      
      // 验证最小值和最大值的有效性
      if (!isFinite(minW) || !isFinite(maxW) || isNaN(minW) || isNaN(maxW)) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '14px sans-serif'
        ctx.fillText('体重数据异常', width / 2, height / 2)
        this.setData({ weightAvgChart: '--' })
        return
      }

      if (maxW === minW) {
        // 防止纵轴范围为0
        minW = Math.max(0, minW - 1)
        maxW = maxW + 1
      }

      // 计算当前显示范围的平均体重并展示
      const sumW = weights.reduce((s, v) => s + (typeof v === 'number' && !isNaN(v) ? v : 0), 0)
      const avgWStr = weights.length > 0 ? ((sumW / weights.length).toFixed(1) + 'g') : '--'
      this.setData({ weightAvgChart: avgWStr })
  
      // 内边距（为坐标轴标签预留空间）
      const paddingLeft = 40
      const paddingRight = 12
      const paddingTop = 18
      const paddingBottom = 36
      const chartW = width - paddingLeft - paddingRight
      const chartH = height - paddingTop - paddingBottom
  
      // 坐标轴
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 1
      ctx.beginPath()
      // X 轴
      ctx.moveTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(width - paddingRight, height - paddingBottom)
      // Y 轴
      ctx.moveTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(paddingLeft, paddingTop)
      ctx.stroke()

      if (selectedId && typeof this.data.weightRefValue === 'number' && isFinite(this.data.weightRefValue) && (maxW - minW) > 0) {
        const norm = (this.data.weightRefValue - minW) / (maxW - minW)
        if (isFinite(norm) && !isNaN(norm)) {
          const yRef = paddingTop + (1 - norm) * chartH
          ctx.save()
          ctx.strokeStyle = '#7c3aed'
          ctx.lineWidth = 2
          if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 6])
          ctx.beginPath()
          ctx.moveTo(paddingLeft, yRef)
          ctx.lineTo(width - paddingRight, yRef)
          ctx.stroke()
          if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])
          ctx.restore()
        }
      }

      // 纵轴刻度与数值
      const yTicks = 4
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let i = 0; i <= yTicks; i++) {
        const t = i / yTicks
        const value = minW + t * (maxW - minW)
        const y = paddingTop + (1 - t) * chartH
        // 刻度线
        ctx.strokeStyle = '#eee'
        ctx.beginPath()
        ctx.moveTo(paddingLeft, y)
        ctx.lineTo(width - paddingRight, y)
        ctx.stroke()
        // 数值标签 - 添加数值验证
        ctx.fillStyle = '#666'
        const displayValue = isFinite(value) && !isNaN(value) ? value.toFixed(1) : '0.0'
        ctx.fillText(displayValue, paddingLeft - 6, y)
      }
  
      // 横轴刻度与日期标签（避免过密，均匀采样最多6个）
      const maxXTicks = Math.min(6, dates.length)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let i = 0; i < maxXTicks; i++) {
        let idx, x
        if (dates.length === 1) {
          // 单天数据时，将标签放在中央
          idx = 0
          x = paddingLeft + chartW / 2
        } else {
          idx = Math.round((i / (maxXTicks - 1)) * (dates.length - 1))
          x = paddingLeft + (idx / (dates.length - 1)) * chartW
        }
        
        const dateStr = dates[idx]
        const d = new Date(dateStr)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        const y = height - paddingBottom
        
        // 刻度线
        ctx.strokeStyle = '#eee'
        ctx.beginPath()
        ctx.moveTo(x, paddingTop)
        ctx.lineTo(x, y)
        ctx.stroke()
        // 标签
        ctx.fillStyle = '#666'
        ctx.fillText(label, x, y + 4)
      }
  
      const colorPalette = this.data.weightColors || ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
      const tapAreas = []
  
      // 绘制每条折线
      displaySeries.forEach((s, idx) => {
        // 过滤有效的数据点
        const validPoints = (s.points || []).filter(p => 
          p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0
        ).sort((a,b) => a.date.localeCompare(b.date))
        
        if (validPoints.length === 0) return // 跳过没有有效数据的系列
        
        const color = (this.weightColorMap && this.weightColorMap[String(s.parrot_id)]) || colorPalette[idx % colorPalette.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.lineCap = 'round' // 设置线条端点为圆形
        ctx.lineJoin = 'round' // 设置线条连接点为圆形
        
        // 只有一个点时不绘制线条，只绘制点
        if (validPoints.length > 1) {
          // 计算所有点的坐标
          const points = []
          validPoints.forEach(p => {
            const xIndex = dates.indexOf(p.date)
            if (xIndex === -1) return // 跳过无效日期
            
            let x
            if (dates.length === 1) {
              x = paddingLeft + chartW / 2
            } else {
              x = paddingLeft + (xIndex / (dates.length - 1)) * chartW
            }
            
            const norm = (p.weight - minW) / (maxW - minW)
            
            // 验证计算结果
            if (!isFinite(norm) || isNaN(norm)) return
            
            const y = paddingTop + (1 - norm) * chartH
            points.push({ x, y })
          })
          
          if (points.length > 1) {
            // 先绘制填充区域
            ctx.save() // 保存当前状态
            
            // 创建填充路径
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            
            // 使用单调三次样条（Fritsch-Carlson）构建更平滑的曲线
            const n = points.length
            const xs = points.map(p => p.x)
            const ys = points.map(p => p.y)
            const dxArr = new Array(n - 1)
            const mArr = new Array(n - 1)
            for (let i = 0; i < n - 1; i++) {
              const dx = xs[i + 1] - xs[i]
              dxArr[i] = dx
              mArr[i] = dx !== 0 ? ((ys[i + 1] - ys[i]) / dx) : 0
            }
            const tArr = new Array(n)
            tArr[0] = mArr[0]
            tArr[n - 1] = mArr[n - 2]
            for (let i = 1; i <= n - 2; i++) {
              const m0 = mArr[i - 1]
              const m1 = mArr[i]
              if (m0 * m1 <= 0) {
                tArr[i] = 0
              } else {
                const dx0 = dxArr[i - 1]
                const dx1 = dxArr[i]
                tArr[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1))
              }
            }
            for (let i = 0; i < n - 1; i++) {
              const x0 = xs[i], y0 = ys[i]
              const x1 = xs[i + 1], y1 = ys[i + 1]
              const dx = dxArr[i]
              const cp1x = x0 + dx / 3
              const cp1y = y0 + tArr[i] * dx / 3
              const cp2x = x1 - dx / 3
              const cp2y = y1 - tArr[i + 1] * dx / 3
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
            }
            
            // 连接到底部形成封闭区域
            const lastPoint = points[points.length - 1]
            const firstPoint = points[0]
            const bottomY = height - paddingBottom
            
            ctx.lineTo(lastPoint.x, bottomY)
            ctx.lineTo(firstPoint.x, bottomY)
            ctx.closePath()
            
            // 创建渐变填充
            const gradient = ctx.createLinearGradient(0, paddingTop, 0, bottomY)
            const baseColor = color
            // 提取RGB值并创建半透明版本
            const rgbMatch = baseColor.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1], 16)
              const g = parseInt(rgbMatch[2], 16)
              const b = parseInt(rgbMatch[3], 16)
              gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`) // 顶部25%透明度
              gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`) // 中部10%透明度
              gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`) // 底部2%透明度
            } else {
              // 备用方案，使用预设的半透明颜色
              gradient.addColorStop(0, color + '40') // 25% 透明度
              gradient.addColorStop(0.7, color + '1A') // 10% 透明度
              gradient.addColorStop(1, color + '05') // 2% 透明度
            }
            
            ctx.fillStyle = gradient
            ctx.fill()
            
            ctx.restore() // 恢复状态
            
            // 然后绘制曲线
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            
            // 使用同样的单调样条为折线绘制平滑曲线
            const n2 = points.length
            const xs2 = points.map(p => p.x)
            const ys2 = points.map(p => p.y)
            const dx2 = new Array(n2 - 1)
            const m2 = new Array(n2 - 1)
            for (let i = 0; i < n2 - 1; i++) {
              const dx = xs2[i + 1] - xs2[i]
              dx2[i] = dx
              m2[i] = dx !== 0 ? ((ys2[i + 1] - ys2[i]) / dx) : 0
            }
            const t2 = new Array(n2)
            t2[0] = m2[0]
            t2[n2 - 1] = m2[n2 - 2]
            for (let i = 1; i <= n2 - 2; i++) {
              const m0 = m2[i - 1]
              const m1 = m2[i]
              if (m0 * m1 <= 0) {
                t2[i] = 0
              } else {
                const dx0 = dx2[i - 1]
                const dx1 = dx2[i]
                t2[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1))
              }
            }
            for (let i = 0; i < n2 - 1; i++) {
              const x0 = xs2[i], y0 = ys2[i]
              const x1 = xs2[i + 1], y1 = ys2[i + 1]
              const dx = dx2[i]
              const cp1x = x0 + dx / 3
              const cp1y = y0 + t2[i] * dx / 3
              const cp2x = x1 - dx / 3
              const cp2y = y1 - t2[i + 1] * dx / 3
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
            }
            ctx.stroke()
          }
        }
  
        // 不绘制交点，仅计算交互用的点位
        validPoints.forEach(p => {
          const xIndex = dates.indexOf(p.date)
          if (xIndex === -1) return
          let x
          if (dates.length === 1) {
            x = paddingLeft + chartW / 2
          } else {
            x = paddingLeft + (xIndex / (dates.length - 1)) * chartW
          }
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          tapAreas.push({ x, y, radius: 10, weight: p.weight, date: p.date, parrot_name: s.parrot_name, color })
        })
      })

      // 记录可点击区域供事件使用
      this.weightTapAreas = tapAreas

      if (typeof this._activeGuideX === 'number') {
        let gx = this._activeGuideX
        if (gx < paddingLeft) gx = paddingLeft
        if (gx > paddingLeft + chartW) gx = paddingLeft + chartW
        let guideIdx = 0
        let guideXPos
        if (dates.length === 1) {
          guideIdx = 0
          guideXPos = paddingLeft + chartW / 2
        } else {
          const ratio = (gx - paddingLeft) / chartW
          guideIdx = Math.round(ratio * (dates.length - 1))
          guideXPos = paddingLeft + (guideIdx / (dates.length - 1)) * chartW
        }
        ctx.save()
        ctx.strokeStyle = '#9CA3AF'
        ctx.lineWidth = 1
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(guideXPos, paddingTop)
        ctx.lineTo(guideXPos, height - paddingBottom)
        ctx.stroke()
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])
        ctx.restore()

        const dateSel = dates[guideIdx]
        const items = []
        displaySeries.forEach((s, idx) => {
          const p = (s.points || []).find(pt => pt && pt.date === dateSel && typeof pt.weight === 'number' && !isNaN(pt.weight) && pt.weight > 0)
          if (!p) return
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          const color = colorPalette[idx % colorPalette.length]
          // 交点空心圆
          ctx.save()
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(guideXPos, y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.restore()
          items.push({ text: (s.parrot_name || '') + ' ' + p.weight.toFixed(1) + 'g', color })
        })

        if (items.length > 0) {
          // 统一大标签：包含日期与多行项目
          const headerText = dateSel || ''
          ctx.font = '12px sans-serif'
          const headerW = ctx.measureText(headerText).width
          ctx.font = '11px sans-serif'
          let maxItemW = 0
          items.forEach(it => { maxItemW = Math.max(maxItemW, ctx.measureText(it.text).width) })
          const dotW = 10 // 图例点与间距占位
          const paddingX = 8
          const paddingY = 6
          const lineGap = 4
          const headerH = 16
          const itemH = 14
          const contentW = Math.max(headerW, dotW + maxItemW)
          const boxW = contentW + paddingX * 2
          const boxH = headerH + lineGap + items.length * itemH + paddingY * 2
          const margin = 8
          let boxX
          if (guideXPos < width / 2) {
            boxX = guideXPos + margin
            if (boxX + boxW > width - 8) boxX = width - 8 - boxW
          } else {
            boxX = guideXPos - margin - boxW
            if (boxX < 8) boxX = 8
          }
          // 垂直位置：放在顶部区域，避免遮挡过多曲线
          let boxY = paddingTop + 8
          if (boxY + boxH > height - paddingBottom - 8) boxY = height - paddingBottom - 8 - boxH

          // 背景：白色半透明
          ctx.save()
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
          const r = 6
          ctx.beginPath()
          ctx.moveTo(boxX + r, boxY)
          ctx.lineTo(boxX + boxW - r, boxY)
          ctx.arc(boxX + boxW - r, boxY + r, r, -Math.PI / 2, 0)
          ctx.lineTo(boxX + boxW, boxY + boxH - r)
          ctx.arc(boxX + boxW - r, boxY + boxH - r, r, 0, Math.PI / 2)
          ctx.lineTo(boxX + r, boxY + boxH)
          ctx.arc(boxX + r, boxY + boxH - r, r, Math.PI / 2, Math.PI)
          ctx.lineTo(boxX, boxY + r)
          ctx.arc(boxX + r, boxY + r, r, Math.PI, Math.PI * 3 / 2)
          ctx.fill()
          ctx.restore()

          // 绘制日期（头部）
          ctx.save()
          ctx.fillStyle = '#111827'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.font = '12px sans-serif'
          ctx.fillText(headerText, boxX + paddingX, boxY + paddingY)
          ctx.restore()

          // 绘制每行项目与图例点
          let curY = boxY + paddingY + headerH + lineGap
          items.forEach(it => {
            ctx.save()
            // 图例点
            ctx.fillStyle = it.color
            ctx.beginPath()
            ctx.arc(boxX + paddingX + 3, curY + itemH / 2, 3, 0, Math.PI * 2)
            ctx.fill()
            // 文本
            ctx.fillStyle = '#111827'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = '11px sans-serif'
            ctx.fillText(it.text, boxX + paddingX + dotW, curY + itemH / 2)
            ctx.restore()
            curY += itemH
          })
        }
      } else {
        const active = this.data.activeWeightPoint
        if (active && typeof active.x === 'number' && typeof active.y === 'number') {
          const weightText = (typeof active.weight === 'number' && !isNaN(active.weight)) ? (active.weight.toFixed(1) + 'g') : '--'
          const nameText = active.parrot_name || ''
          const label = nameText ? (nameText + ' ' + weightText) : weightText
          ctx.font = '12px sans-serif'
          const textW = ctx.measureText(label).width
          const paddingX = 6
          const boxW = textW + paddingX * 2
          const boxH = 20
          let boxX = active.x - boxW / 2
          let boxY = active.y - 10 - boxH
          if (boxX < 8) boxX = 8
          if (boxX + boxW > width - 8) boxX = width - 8 - boxW
          if (boxY < paddingTop + 4) boxY = active.y + 10
          ctx.save()
          ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'
          const r2 = 6
          ctx.beginPath()
          ctx.moveTo(boxX + r2, boxY)
          ctx.lineTo(boxX + boxW - r2, boxY)
          ctx.arc(boxX + boxW - r2, boxY + r2, r2, -Math.PI / 2, 0)
          ctx.lineTo(boxX + boxW, boxY + boxH - r2)
          ctx.arc(boxX + boxW - r2, boxY + boxH - r2, r2, 0, Math.PI / 2)
          ctx.lineTo(boxX + r2, boxY + boxH)
          ctx.arc(boxX + r2, boxY + boxH - r2, r2, Math.PI / 2, Math.PI)
          ctx.lineTo(boxX, boxY + r2)
          ctx.arc(boxX + r2, boxY + r2, r2, Math.PI, Math.PI * 3 / 2)
          ctx.fill()
          ctx.restore()
          ctx.save()
          ctx.fillStyle = '#fff'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2)
          ctx.restore()
        }
      }
    })
  },

  // 体重曲线点击事件：命中点则显示体重值标签
  onWeightCanvasTap(e) {
    const areas = this.weightTapAreas || []
    if (!areas.length) return

    // 每次点击时获取最新的画布位置，避免页面滚动导致的坐标偏移
    const query = wx.createSelectorQuery()
    query.select('#weightCanvas').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect) return
      this.weightCanvasRect = rect

      // 统一坐标解析：优先使用局部坐标（touches[0].x/y），否则回退到页面/视口坐标减去 rect 偏移
      const getCoordCandidates = (evt) => {
        const cands = []
        // 局部坐标（在 canvas 上通常可用）
        if (evt && evt.touches && evt.touches[0]) {
          const t = evt.touches[0]
          if (typeof t.x === 'number' && typeof t.y === 'number') cands.push({ x: t.x, y: t.y })
          if (typeof t.pageX === 'number' && typeof t.pageY === 'number') cands.push({ x: t.pageX - rect.left, y: t.pageY - rect.top })
          if (typeof t.clientX === 'number' && typeof t.clientY === 'number') cands.push({ x: t.clientX - rect.left, y: t.clientY - rect.top })
        }
        if (evt && evt.changedTouches && evt.changedTouches[0]) {
          const t = evt.changedTouches[0]
          if (typeof t.x === 'number' && typeof t.y === 'number') cands.push({ x: t.x, y: t.y })
          if (typeof t.pageX === 'number' && typeof t.pageY === 'number') cands.push({ x: t.pageX - rect.left, y: t.pageY - rect.top })
          if (typeof t.clientX === 'number' && typeof t.clientY === 'number') cands.push({ x: t.clientX - rect.left, y: t.clientY - rect.top })
        }
        if (evt && evt.detail) {
          if (typeof evt.detail.x === 'number' && typeof evt.detail.y === 'number') cands.push({ x: evt.detail.x, y: evt.detail.y })
          if (typeof evt.detail.clientX === 'number' && typeof evt.detail.clientY === 'number') cands.push({ x: evt.detail.clientX - rect.left, y: evt.detail.clientY - rect.top })
        }
        return cands
      }
      const candidates = getCoordCandidates(e)
      if (!candidates.length) return

      let hit = null
      // 逐个候选坐标尝试命中，提升鲁棒性
      for (let k = 0; k < candidates.length && !hit; k++) {
        const relX = candidates[k].x
        const relY = candidates[k].y
        for (let i = 0; i < areas.length; i++) {
          const a = areas[i]
          const dx = relX - a.x
          const dy = relY - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= (a.radius || 16)) { hit = a; break }
        }
      }

      if (hit) {
        this._activeGuideX = null
        this.setData({ activeWeightPoint: hit }, () => {
          this.drawWeightChart()
        })
      } else {
        this._activeGuideX = null
        this.setData({ activeWeightPoint: null }, () => {
          this.drawWeightChart()
        })
      }
    })
  },

  onWeightTouchStart(e) {
    this._updateGuideFromEvent(e)
  },
  onWeightTouchMove(e) {
    this._updateGuideFromEvent(e)
  },
  onWeightTouchEnd(e) {
  },
  _updateGuideFromEvent(e) {
    const query = wx.createSelectorQuery()
    query.select('#weightCanvas').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect) return
      this.weightCanvasRect = rect
      let relX = null
      if (e && e.touches && e.touches[0]) {
        const t = e.touches[0]
        if (typeof t.x === 'number') relX = t.x
        else if (typeof t.pageX === 'number') relX = t.pageX - rect.left
        else if (typeof t.clientX === 'number') relX = t.clientX - rect.left
      } else if (e && e.changedTouches && e.changedTouches[0]) {
        const t = e.changedTouches[0]
        if (typeof t.x === 'number') relX = t.x
        else if (typeof t.pageX === 'number') relX = t.pageX - rect.left
        else if (typeof t.clientX === 'number') relX = t.clientX - rect.left
      } else if (e && e.detail && typeof e.detail.x === 'number') {
        relX = e.detail.x
      } else if (e && e.detail && typeof e.detail.clientX === 'number') {
        relX = e.detail.clientX - rect.left
      }
      if (typeof relX !== 'number') return
      this._activeGuideX = relX
      this.setData({ activeWeightPoint: null }, () => this.drawWeightChart())
    })
  },
  _panShiftByPixels(dx) {
    const dates = this.data.weightRangeDates || []
    if (!dates.length) return
    const rect = this.weightCanvasRect || { width: 300 }
    // 与绘图一致的左右内边距
    const chartW = (rect.width || 300) - 48 - 18
    const stepPx = chartW / Math.max(1, (dates.length - 1))
    if (stepPx <= 0) return
    const rawShift = Math.round(dx / stepPx)
    if (rawShift === 0) return
    // 手指向左移动（dx<0）视为向后移动日期窗口（索引增大）
    const shift = -rawShift
    const windowSize = Math.max(0, this.data.weightEndIndex - this.data.weightStartIndex)
    let startIdx = this.data.weightStartIndex + shift
    startIdx = Math.max(0, Math.min(startIdx, Math.max(0, dates.length - 1 - windowSize)))
    let endIdx = startIdx + windowSize
    endIdx = Math.max(startIdx, Math.min(endIdx, Math.max(0, dates.length - 1)))
    this.setData({
      weightStartIndex: startIdx,
      weightEndIndex: endIdx,
      weightStartDate: dates[startIdx] || '',
      weightEndDate: dates[endIdx] || ''
    })
    this.drawWeightChart()
  },

  onLoad() {
    this.checkLoginAndLoad()
    
    // 添加全局点击事件监听，用于关闭下拉菜单
    this.globalTapHandler = () => {
      if (this.data.showParrotDropdown) {
        this.setData({
          showParrotDropdown: false
        })
      }
    }
  },

  onUnload() {
    // 清理事件监听
    if (this.globalTapHandler) {
      this.globalTapHandler = null
    }
  },

  // 阻止下拉菜单内部点击事件冒泡
  preventBubble() {
    // 空函数，用于阻止事件冒泡
  }
  ,onShareAppMessage() {
    const title = '数据统计 - 体重趋势与消费分析'
    return {
      title,
      path: '/pages/statistics/statistics'
    }
  },
  onShareTimeline() {
    return {
      title: '数据统计 - 体重趋势与消费分析'
    }
  }
})

// 已迁移：drawFeedingChart 方法已移入 Page 对象内部
