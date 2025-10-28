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
    selectedPeriod: '本周', // 默认选择本周
    
    // 体重趋势数据
    weightSeries: [],
    selectedParrotId: null,
    selectedParrotName: '',
    showParrotDropdown: false,
    weightDays: 7, // 本周对应7天
    weightColors: ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22'],
    weightLegend: [],
    // 体重趋势自定义时间范围（滑块）
    weightRangeDates: [],
    weightStartIndex: 0,
    weightEndIndex: 0,
    weightStartDate: '',
    weightEndDate: '',
    
    // 加载状态
    loading: false
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
        this.setData({ expenseAnalysis: analysis })
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

  // 绘制支出分析饼图（对齐APP：圆环+中心总额+标签）
  drawExpensePieChart() {
    const data = this.data.expenseAnalysis || []
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
      const radius = Math.min(width, height) / 2 - 10 // 进一步减少边距，增大图表尺寸
      const inner = radius * 0.4 // 进一步调整圆环内径，使环形更粗
      const totalAmount = data.reduce((s, i) => s + (i.amount || 0), 0)

      // 绘制圆环分片
      let start = -Math.PI / 2
      data.forEach(item => {
        const angle = (item.percentage / 100) * Math.PI * 2
        const end = start + angle
        if (angle > 0) {
          ctx.beginPath()
          // 外圈
          ctx.arc(cx, cy, radius, start, end)
          // 内圈反向，形成圆环扇形
          ctx.arc(cx, cy, inner, end, start, true)
          ctx.closePath()
          ctx.fillStyle = item.color || '#667eea'
          ctx.fill()
        }
        start = end
      })

      // 扇区标签（大于5%显示，带指引线）- 已移除
      // start = -Math.PI / 2
      // ctx.font = '12px sans-serif'
      // ctx.textAlign = 'left'
      // ctx.textBaseline = 'middle'
      // ctx.fillStyle = '#333'
      // data.forEach(item => {
      //   const angle = (item.percentage / 100) * Math.PI * 2
      //   const end = start + angle
      //   if (item.percentage >= 5 && angle > 0) {
      //     const mid = (start + end) / 2
      //     const ex = cx + Math.cos(mid) * (radius + 8)
      //     const ey = cy + Math.sin(mid) * (radius + 8)
      //     const lx = cx + Math.cos(mid) * (radius + 30)
      //     const ly = cy + Math.sin(mid) * (radius + 30)
      //     // 指引线
      //     ctx.strokeStyle = item.color || '#667eea'
      //     ctx.lineWidth = 1
      //     ctx.beginPath()
      //     ctx.moveTo(ex, ey)
      //     ctx.lineTo(lx, ly)
      //     ctx.stroke()
      //     // 文本位置与对齐
      //     const alignRight = Math.cos(mid) > 0
      //     ctx.textAlign = alignRight ? 'left' : 'right'
      //     const label = `${item.category} ${item.percentage}%`
      //     // 确保文本不超出画布边界
      //     const textX = alignRight ? 
      //       Math.min(lx + 8, width - 10) : 
      //       Math.max(lx - 8, 10)
      //     ctx.fillText(label, textX, ly)
      //   }
      //   start = end
      // })

      // 中心总额与标题
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // 标题样式
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px sans-serif'
      ctx.fillText('总支出', cx, cy - 16)
      // 金额样式
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText(`¥${(totalAmount || 0).toFixed(2)}`, cx, cy + 8)
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
      const end = new Date()
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const start_date = start.toISOString().slice(0, 10)
      const end_date = end.toISOString().slice(0, 10)
      const res = await app.request({
        url: '/api/records/feeding',
        method: 'GET',
        data: { start_date, end_date }
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
    const period = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.period) || '本周'
    let weightDays = 7
    if (period === '今天') weightDays = 1
    else if (period === '本周') weightDays = 7
    else if (period === '本月') weightDays = 30
    else if (period === '本年') weightDays = 365
    this.setData({ selectedPeriod: period, weightDays })
    // 刷新体重趋势（概览平均体重依赖该数据）
    this.loadWeightTrends()
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
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series
    const palette = this.data.weightColors || ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22']
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
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series
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
        return
      }

      if (maxW === minW) {
        // 防止纵轴范围为0
        minW = Math.max(0, minW - 1)
        maxW = maxW + 1
      }
  
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
  
      const colorPalette = this.data.weightColors || ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22']
  
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
        })
      })
    })
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
})

// 已迁移：drawFeedingChart 方法已移入 Page 对象内部
