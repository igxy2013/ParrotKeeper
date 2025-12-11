// pages/statistics/statistics.js
const app = getApp()

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
      // 点击点高亮与标签
      activeWeightPoint: null,
      // 体重趋势卡片的当前范围平均体重
      weightAvgChart: '',
    
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
    this.loadAllStatistics().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载所有统计数据
  async loadAllStatistics() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadOverview(),
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

  // 加载喂食趋势
  async loadFeedingTrends() {
    try {
      // 根据period转换为days参数
      const days = this.data.feedingPeriod === 'week' ? 7 : 30
      
      const res = await app.request({
        url: '/api/statistics/feeding-trends',
        method: 'GET',
        data: {
          days: days
        }
      })
      
      if (res.success) {
        const trends = this.processFeedingTrends(res.data)
        this.setData({
          feedingTrends: trends
        })
        // 数据就绪后绘制喂食折线面积图
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
      console.log('开始加载支出分析数据')
      const res = await app.request({
        url: '/api/statistics/expense-analysis',
        method: 'GET'
      })
      
      console.log('支出分析API响应:', res)
      
      if (res.success) {
        const analysis = this.processExpenseAnalysis(res.data)
        console.log('处理后的支出分析数据:', analysis)
        this.setData({ 
          expenseAnalysis: analysis,
          selectedExpenseIndex: -1
        })
        wx.nextTick(() => this.drawExpensePieChart())
      } else {
        console.error('支出分析API返回失败:', res)
      }
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
      const res = await app.request({
        url: '/api/statistics/care-frequency',
        method: 'GET'
      })
      
      if (res.success) {
        this.setData({
          careFrequency: res.data
        })
      }
    } catch (error) {
      console.error('加载护理频率失败:', error)
    }
  },

  // 加载品种分布
  async loadSpeciesDistribution() {
    try {
      const res = await app.request({
        url: '/api/parrots/species',
        method: 'GET'
      })
      
      if (res.success) {
        // 获取每个品种的鹦鹉数量
        const parrotsRes = await app.request({
          url: '/api/parrots',
          method: 'GET',
          data: { limit: 1000 }
        })
        
        if (parrotsRes.success) {
          const parrots = parrotsRes.data.parrots || []
          const distribution = this.processSpeciesDistribution(res.data, parrots)
          this.setData({
            speciesDistribution: distribution
          })
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
      const res = await app.request({
        url: '/api/records/feeding',
        method: 'GET',
        data: { start_date: fmt(start), end_date: fmt(end) }
      })
      if (res.success) {
        const pref = this.processFoodPreference(res.data)
        this.setData({ foodPreference: pref })
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
          // 后端更新成功，更新前端状态
          app.globalData.userMode = newMode;
          wx.setStorageSync('userMode', newMode);
          
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
  },

  // 加载体重趋势（每只鹦鹉的折线）
  async loadWeightTrends() {
    try {
      const res = await app.request({
        url: '/api/statistics/weight-trends',
        method: 'GET',
        data: { days: this.data.weightDays }
      })
      if (res.success && res.data && Array.isArray(res.data.series)) {
        const seriesArr = Array.isArray(res.data.series) ? res.data.series : []
        this.setData({ weightSeries: seriesArr })
        this.updateWeightLegend()
        // 计算可选日期范围（用于滑块）
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
        // 计算平均体重用于概览卡（避免链式调用导致的编译异常）
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
        this.drawWeightChart()
      }
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
    this.drawWeightChart()
  },

  updateWeightLegend() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series.slice(0, 12)
    const palette = this.data.weightColors || ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
    const legend = (displaySeries || []).map((s, idx) => ({
      parrot_id: s.parrot_id,
      parrot_name: s.parrot_name,
      color: palette[idx % palette.length]
    }))
    this.setData({ weightLegend: legend })
  },

  // 起始时间滑块变化
  onWeightRangeStartChange(e) {
    const idx = (e && e.detail && typeof e.detail.value !== 'undefined') ? Number(e.detail.value) : 0
    const dates = this.data.weightRangeDates || []
    let startIdx = Math.max(0, Math.min(idx, Math.max(0, dates.length - 1)))
    let endIdx = this.data.weightEndIndex
    if (startIdx > endIdx) endIdx = startIdx
    this.setData({
      weightStartIndex: startIdx,
      weightEndIndex: endIdx,
      weightStartDate: dates[startIdx] || '',
      weightEndDate: dates[endIdx] || ''
    })
    this.drawWeightChart()
  },

  // 结束时间滑块变化
  onWeightRangeEndChange(e) {
    const idx = (e && e.detail && typeof e.detail.value !== 'undefined') ? Number(e.detail.value) : 0
    const dates = this.data.weightRangeDates || []
    let endIdx = Math.max(0, Math.min(idx, Math.max(0, dates.length - 1)))
    let startIdx = this.data.weightStartIndex
    if (endIdx < startIdx) startIdx = endIdx
    this.setData({
      weightStartIndex: startIdx,
      weightEndIndex: endIdx,
      weightStartDate: dates[startIdx] || '',
      weightEndDate: dates[endIdx] || ''
    })
    this.drawWeightChart()
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
      const paddingLeft = 48
      const paddingRight = 18
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

      if (selectedId) {
        const sel = series.find(s => String(s.parrot_id) === String(selectedId)) || null
        const speciesName = sel && sel.species_name
        if (speciesName) {
          const sameSpecies = series.filter(s => s.species_name === speciesName)
          const vals = []
          for (let i = 0; i < sameSpecies.length; i++) {
            const pts = Array.isArray(sameSpecies[i].points) ? sameSpecies[i].points : []
            for (let j = 0; j < pts.length; j++) {
              const p = pts[j]
              if (p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) {
                if (hasRange) {
                  const d = p.date
                  if (d && d >= rangeStart && d <= rangeEnd) vals.push(p.weight)
                } else {
                  vals.push(p.weight)
                }
              }
            }
          }
          if (vals.length > 0 && isFinite(minW) && isFinite(maxW) && (maxW - minW) > 0) {
            let sum = 0
            for (let k = 0; k < vals.length; k++) sum += vals[k]
            const ref = sum / vals.length
            const norm = (ref - minW) / (maxW - minW)
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
              ctx.restore()
              const label = `体重参考线: ${ref.toFixed(1)}g`
              ctx.save()
              ctx.font = '12px sans-serif'
              ctx.fillStyle = '#7c3aed'
              ctx.textAlign = 'right'
              ctx.textBaseline = 'bottom'
              ctx.fillText(label, width - paddingRight - 4, yRef - 4)
              ctx.restore()
            }
          }
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
        
        const color = colorPalette[idx % colorPalette.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 3 // 增加线条宽度，让曲线更明显
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
            
            // 绘制曲线路径（与线条相同）
            for (let i = 1; i < points.length; i++) {
              const prevPoint = points[i - 1]
              const currentPoint = points[i]
              
              if (i === 1) {
                // 第一段曲线，使用二次贝塞尔曲线
                const controlX = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
                const controlY = prevPoint.y
                ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y)
              } else {
                // 后续曲线，使用三次贝塞尔曲线创建更平滑的效果
                const prevPrevPoint = points[i - 2]
                const nextPoint = i < points.length - 1 ? points[i + 1] : currentPoint
                
                // 计算控制点，创建平滑的曲线
                const tension = 0.3 // 曲线张力，控制弯曲程度
                
                // 前一个控制点
                const cp1x = prevPoint.x + (currentPoint.x - prevPrevPoint.x) * tension
                const cp1y = prevPoint.y + (currentPoint.y - prevPrevPoint.y) * tension
                
                // 当前控制点
                const cp2x = currentPoint.x - (nextPoint.x - prevPoint.x) * tension
                const cp2y = currentPoint.y - (nextPoint.y - prevPoint.y) * tension
                
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y)
              }
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
            
            // 使用贝塞尔曲线绘制平滑曲线
            for (let i = 1; i < points.length; i++) {
              const prevPoint = points[i - 1]
              const currentPoint = points[i]
              
              if (i === 1) {
                // 第一段曲线，使用二次贝塞尔曲线
                const controlX = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
                const controlY = prevPoint.y
                ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y)
              } else {
                // 后续曲线，使用三次贝塞尔曲线创建更平滑的效果
                const prevPrevPoint = points[i - 2]
                const nextPoint = i < points.length - 1 ? points[i + 1] : currentPoint
                
                // 计算控制点，创建平滑的曲线
                const tension = 0.3 // 曲线张力，控制弯曲程度
                
                // 前一个控制点
                const cp1x = prevPoint.x + (currentPoint.x - prevPrevPoint.x) * tension
                const cp1y = prevPoint.y + (currentPoint.y - prevPrevPoint.y) * tension
                
                // 当前控制点
                const cp2x = currentPoint.x - (nextPoint.x - prevPoint.x) * tension
                const cp2y = currentPoint.y - (nextPoint.y - prevPoint.y) * tension
                
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y)
              }
            }
            ctx.stroke()
          }
        }
  
        // 绘制点
        ctx.fillStyle = color
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

          // 绘制带阴影的数据点
          ctx.shadowColor = color
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2

          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2) // 增大数据点半径
          ctx.fill()

          // 清除阴影设置，避免影响后续绘制
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // 收集点击检测区域
          tapAreas.push({ x, y, radius: 10, weight: p.weight, date: p.date, parrot_name: s.parrot_name, color })
        })
      })

      // 记录可点击区域供事件使用
      this.weightTapAreas = tapAreas

      // 若存在高亮点，绘制高亮及标签
      const active = this.data.activeWeightPoint
      if (active && typeof active.x === 'number' && typeof active.y === 'number') {
        // 高亮圆点外圈
        ctx.save()
        ctx.lineWidth = 2
        ctx.strokeStyle = active.color || '#333'
        ctx.beginPath()
        ctx.arc(active.x, active.y, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // 绘制标签背景与文字（显示体重值）
        const label = (typeof active.weight === 'number' && !isNaN(active.weight)) ? (active.weight.toFixed(1) + 'g') : '--'
        ctx.font = '12px sans-serif'
        const textW = ctx.measureText(label).width
        const paddingX = 6
        const paddingY = 4
        const boxW = textW + paddingX * 2
        const boxH = 20
        // 标签位置，尽量在点上方，避免超出边界
        let boxX = active.x - boxW / 2
        let boxY = active.y - 10 - boxH
        if (boxX < 8) boxX = 8
        if (boxX + boxW > width - 8) boxX = width - 8 - boxW
        if (boxY < paddingTop + 4) boxY = active.y + 10

        // 背景
        ctx.save()
        ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'
        ctx.beginPath()
        ctx.rect(boxX, boxY, boxW, boxH)
        ctx.fill()
        ctx.restore()

        // 文本
        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2)
        ctx.restore()
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
        this.setData({ activeWeightPoint: hit }, () => {
          this.drawWeightChart()
        })
      } else {
        this.setData({ activeWeightPoint: null }, () => {
          this.drawWeightChart()
        })
      }
    })
  },

  // 单指左右滑动：按手势平移当前选择的时间窗口
  onWeightTouchStart(e) {
    const t = (e && e.touches && e.touches[0]) || (e && e.changedTouches && e.changedTouches[0]) || null
    const x = t ? (typeof t.x === 'number' ? t.x : (typeof t.pageX === 'number' ? t.pageX : (typeof t.clientX === 'number' ? t.clientX : 0))) : 0
    this._panStartX = x
    this._panLastX = x
    this._panMoved = false
  },
  onWeightTouchMove(e) {
    const t = (e && e.touches && e.touches[0]) || null
    if (!t) return
    const x = (typeof t.x === 'number') ? t.x : (typeof t.pageX === 'number' ? t.pageX : (typeof t.clientX === 'number' ? t.clientX : 0))
    const dx = x - (this._panLastX || x)
    if (Math.abs(dx) <= 0) return
    this._panMoved = true
    this._panLastX = x
    this._panShiftByPixels(dx)
  },
  onWeightTouchEnd(e) {
    // 若未产生显著位移，按点击处理以显示点标签
    const moved = !!this._panMoved
    this._panStartX = null
    this._panLastX = null
    this._panMoved = false
    if (!moved) {
      this.onWeightCanvasTap(e)
    }
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
