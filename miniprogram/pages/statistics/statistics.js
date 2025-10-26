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
    
    // 筛选条件
    feedingPeriod: 'week',
    expenseData: [],
    expensePeriod: 'month',
    
    // 体重趋势数据
    weightSeries: [],
    selectedParrotId: null,
    selectedParrotName: '',
    showParrotDropdown: false,
    weightDays: 30,
    weightColors: ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22'],
    weightLegend: [],
    
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
        this.loadFeedingTrends(),
        this.loadExpenseAnalysis(),
        this.loadCareFrequency(),
        this.loadSpeciesDistribution(),
        this.loadWeightTrends()
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
          expenseAnalysis: analysis
        })
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
    
    const categoryData = data.category_expenses
    const total = categoryData.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    
    return categoryData.map(item => ({
      category: categoryMap[item.category] || item.category,
      amount: item.total_amount,
      percentage: total > 0 ? Math.round(((item.total_amount || 0) / total) * 100) : 0
    }))
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
    
    return Object.entries(speciesCount)
      .map(([species, count]) => ({
        species,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
  },

  // 切换喂食趋势时间段
  changeFeedingPeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ feedingPeriod: period })
    this.loadFeedingTrends()
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

  // 加载体重趋势（每只鹦鹉的折线）
  async loadWeightTrends() {
    try {
      const res = await app.request({
        url: '/api/statistics/weight-trends',
        method: 'GET',
        data: { days: this.data.weightDays }
      })
      if (res.success && res.data && Array.isArray(res.data.series)) {
        this.setData({ weightSeries: res.data.series })
        this.updateWeightLegend()
        // 绘制折线图
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

  // 绘制体重折线图（canvas 2D）
  drawWeightChart() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series
  
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
  
      // 收集所有日期与体重范围
      const allPoints = []
      displaySeries.forEach(s => {
        (s.points || []).forEach(p => {
          // 验证体重数据的有效性
          if (p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) {
            allPoints.push(p)
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
        ctx.lineWidth = 2
        
        // 只有一个点时不绘制线条，只绘制点
        if (validPoints.length > 1) {
          ctx.beginPath()
          validPoints.forEach((p, i) => {
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
            
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.stroke()
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
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
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