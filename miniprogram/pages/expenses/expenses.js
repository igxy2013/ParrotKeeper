const app = getApp()

Page({
  data: {
    loading: false,
    showAddRecord: false,
    showEditRecord: false, // 新增：编辑记录弹窗显示状态
    
    // 时间过滤器
    selectedPeriod: '本月', // 默认选择本月

    parrots: ['全部'],

    // 类别映射
    categoryMap: {
      'food': '食物',
      'medical': '医疗', 
      'toys': '玩具',
      'cage': '笼具',
      'baby_bird': '幼鸟',
      'breeding_bird': '种鸟',
      'other': '其他'
    },

    // 类别集合
    expenseCategories: ['全部', '食物', '医疗', '玩具', '笼具', '幼鸟', '种鸟', '其他'],
    incomeCategories: ['全部', '繁殖销售', '鸟类销售', '服务收入', '比赛奖金', '其他收入'],

    // 列表筛选：记录类型与支出类别
    recordTypeOptions: ['全部', '收入', '支出'],
    selectedRecordTypeIndex: 0,
    categoryOptions: ['全部'],
    selectedCategoryIndex: 0,

    // 展示用类别网格
    recordCategories: [
      { name: '食物', iconText: '🍚', type: '支出' },
      { name: '医疗', iconText: '❤️', type: '支出' },
      { name: '玩具', iconText: '🧸', type: '支出' },
      { name: '笼具', iconText: '🏠', type: '支出' },
      { name: '幼鸟', iconText: '🐣', type: '支出' },
      { name: '种鸟', iconText: '🦜', type: '支出' },
      { name: '其他', iconText: '➕', type: '支出' },
      { name: '繁殖销售', iconText: '🐣', type: '收入' },
      { name: '鸟类销售', iconText: '🦜', type: '收入' },
      { name: '服务收入', iconText: '🎓', type: '收入' },
      { name: '比赛奖金', iconText: '🏆', type: '收入' },
      { name: '其他收入', iconText: '💵', type: '收入' },
    ],

    records: [],
    filteredRecords: [],
    // 展示用：当前筛选后可见记录总数
    displayTotalCount: 0,
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlyNet: 0,
    },

    // 分页参数
    page: 1,
    hasMore: true,

    // 添加记录表单
    newRecord: {
      type: '支出',
      parrot: '小彩',
      category: '食物',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    },
    // 新增：编辑记录数据
    editRecord: {
      id: null,
      type: '支出',
      parrot: '小彩',
      category: '食物',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    },
    parrotIndex: 1,
    categoryIndex: 0,
    modalCategories: [],
    // 弹窗避让参数
    modalTopOffsetPx: 24,
    modalBottomOffsetPx: 24,
    // 搜索关键字
    searchKeyword: '',
    // 趋势图数据
    trendData: [],
    trendCurrentDateObj: Date.now(),
    trendPickerDate: ''
  },

  onLoad() {
    this.loadParrots()
    this.loadExpenses()
    this.loadStats()
    this.loadTrendData()
    // 初始化类别选项与默认选择
    this.updateCategoryOptions()
    const now = new Date()
    this.setData({ trendCurrentDateObj: now.getTime() })
    this.setTrendPickerByPeriod()
  },

  onShow() {
    // 检查是否需要刷新数据
    if (app.globalData.needRefresh) {
      app.globalData.needRefresh = false
      this.loadExpenses()
      this.loadStats()
      this.loadTrendData()
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      records: [],
      filteredRecords: [],
      hasMore: true,
      totalCount: 0,
      displayTotalCount: 0
    })
    this.loadExpenses().then(() => {
      wx.stopPullDownRefresh()
    })
    this.loadStats()
    this.loadTrendData()
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadExpenses()
    }
  },

  // 加载鹦鹉列表
  async loadParrots() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET'
      })
      
      if (res.success && res.data) {
        const list = Array.isArray(res.data.parrots) ? res.data.parrots : []
        const parrotNames = ['全部', ...list.map(p => p.name)]
        this.setData({ parrots: parrotNames })
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
    }
  },

  // 时间过滤器事件处理
  setSelectedPeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ 
      selectedPeriod: period,
      page: 1,
      hasMore: true,
      records: [],
      filteredRecords: [],
      totalCount: 0,
      displayTotalCount: 0,
      loading: false
    }, () => {
      const now = new Date()
      this.setData({ trendCurrentDateObj: now.getTime() })
      this.setTrendPickerByPeriod()
      this.loadExpenses()
      this.loadStats()
      this.loadTrendData()
    })
  },

  // 获取时间范围参数
  // iOS兼容的时间格式化函数
  formatTimeForIOS(dateString) {
    if (!dateString) return ''
    
    try {
      // 将 "2025-10-23 10:53:43" 格式转换为 iOS 兼容的格式
      const isoString = dateString.replace(' ', 'T')
      const date = new Date(isoString)
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        // 如果转换失败，尝试手动解析
        const parts = dateString.split(' ')
        if (parts.length === 2) {
          const datePart = parts[0].replace(/-/g, '/')
          const timePart = parts[1]
          const date = new Date(`${datePart} ${timePart}`)
          if (!isNaN(date.getTime())) {
            return date.toTimeString().slice(0, 5)
          }
        }
        return ''
      }
      
      return date.toTimeString().slice(0, 5)
    } catch (error) {
      console.error('时间格式化失败:', error, dateString)
      return ''
    }
  },

  getDateRange() {
    const base = new Date(this.data.trendCurrentDateObj || Date.now())
    let startDate, endDate
    
    // 辅助函数：将日期转换为本地日期字符串 (YYYY-MM-DD)
    const formatLocalDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    switch (this.data.selectedPeriod) {
      case '今天':
        startDate = new Date(base.getFullYear(), base.getMonth(), base.getDate())
        endDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
        break
      case '本周':
        // 周一开始，限制在当月范围内，以避免跨月导致“本周”总额大于“本月”
        const dayOfWeek = base.getDay()
        const diff = base.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // 周一开始
        const rawWeekStart = new Date(base.getFullYear(), base.getMonth(), diff)
        const monthStart = new Date(base.getFullYear(), base.getMonth(), 1)
        const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1)
        // 周起始取当周周一与当月1号的较晚者
        startDate = rawWeekStart < monthStart ? monthStart : rawWeekStart
        // 结束取“明天”与当月结束的较早者（严格小于结束日）
        const tomorrow = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
        endDate = tomorrow < monthEnd ? tomorrow : monthEnd
        break
      case '本月':
        startDate = new Date(base.getFullYear(), base.getMonth(), 1)
        endDate = new Date(base.getFullYear(), base.getMonth() + 1, 1)
        break
      case '本年':
        startDate = new Date(base.getFullYear(), 0, 1)
        endDate = new Date(base.getFullYear() + 1, 0, 1)
        break
      case '全部':
        // 全部时间：不传时间参数，由后端返回全量汇总与列表
        return {}
      default:
        return {}
    }
    
    return {
      start_date: formatLocalDate(startDate),
      end_date: formatLocalDate(endDate)
    }
  },

  formatDateForPicker(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  setTrendPickerByPeriod() {
    const date = new Date(this.data.trendCurrentDateObj || Date.now())
    const p = this.data.selectedPeriod
    if (p === '本年') {
      this.setData({ trendPickerDate: String(date.getFullYear()) })
    } else if (p === '本月') {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      this.setData({ trendPickerDate: `${y}-${m}` })
    } else {
      this.setData({ trendPickerDate: this.formatDateForPicker(date) })
    }
  },

  getTrendDateRange() {
    const date = new Date(this.data.trendCurrentDateObj || Date.now())
    const p = this.data.selectedPeriod
    const formatLocalDate = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    if (p === '今天') {
      const s = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const e = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      return { start_date: formatLocalDate(s), end_date: formatLocalDate(e) }
    }
    if (p === '本周') {
      const dayOfWeek = date.getDay()
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const start = new Date(date.getFullYear(), date.getMonth(), diff)
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      return { start_date: formatLocalDate(start), end_date: formatLocalDate(end) }
    }
    if (p === '本月') {
      const s = new Date(date.getFullYear(), date.getMonth(), 1)
      const e = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      return { start_date: formatLocalDate(s), end_date: formatLocalDate(e) }
    }
    if (p === '本年') {
      const s = new Date(date.getFullYear(), 0, 1)
      const e = new Date(date.getFullYear() + 1, 0, 1)
      return { start_date: formatLocalDate(s), end_date: formatLocalDate(e) }
    }
    return {}
  },

  onPrevTrendDate() {
    const date = new Date(this.data.trendCurrentDateObj || Date.now())
    const p = this.data.selectedPeriod
    if (p === '本月') date.setMonth(date.getMonth() - 1)
    else if (p === '本年') date.setFullYear(date.getFullYear() - 1)
    else date.setDate(date.getDate() - 7)
    this.setData({ trendCurrentDateObj: date.getTime() })
    this.setTrendPickerByPeriod()
    this.setData({
      page: 1,
      hasMore: true,
      records: [],
      filteredRecords: [],
      totalCount: 0,
      displayTotalCount: 0,
      loading: false
    })
    this.loadTrendData()
    this.loadExpenses()
    this.loadStats()
  },

  onNextTrendDate() {
    const date = new Date(this.data.trendCurrentDateObj || Date.now())
    const p = this.data.selectedPeriod
    if (p === '本月') date.setMonth(date.getMonth() + 1)
    else if (p === '本年') date.setFullYear(date.getFullYear() + 1)
    else date.setDate(date.getDate() + 7)
    this.setData({ trendCurrentDateObj: date.getTime() })
    this.setTrendPickerByPeriod()
    this.setData({
      page: 1,
      hasMore: true,
      records: [],
      filteredRecords: [],
      totalCount: 0,
      displayTotalCount: 0,
      loading: false
    })
    this.loadTrendData()
    this.loadExpenses()
    this.loadStats()
  },

  // 加载支出记录
  async loadExpenses() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const dateParams = this.getDateRange()
      const selectedType = this.data.recordTypeOptions[this.data.selectedRecordTypeIndex]
      const selectedCategoryLabel = this.data.categoryOptions[this.data.selectedCategoryIndex]

      // 计算后端分类值（分别针对支出与收入）
      const expenseCategoryValue = Object.keys(this.data.categoryMap).find(k => this.data.categoryMap[k] === selectedCategoryLabel)
      const incomeReverseMap = {
        '繁殖销售': 'breeding_sale',
        '鸟类销售': 'bird_sale',
        '服务收入': 'service',
        '比赛奖金': 'competition',
        '其他收入': 'other'
      }
      const incomeCategoryValue = incomeReverseMap[selectedCategoryLabel]

      // 构造通用参数
      const commonParams = {
        per_page: 50, // 适中页大小
        ...dateParams,
        ...((selectedCategoryLabel !== '全部' && (selectedType === '支出' || (selectedType === '全部' && this.data.expenseCategories.includes(selectedCategoryLabel))) && expenseCategoryValue) ? { category: expenseCategoryValue } : {}),
        ...((selectedCategoryLabel !== '全部' && (selectedType === '收入' || (selectedType === '全部' && this.data.incomeCategories.includes(selectedCategoryLabel))) && incomeCategoryValue) ? { category: incomeCategoryValue } : {})
      }
      
      // 如果筛选了特定类型，传给后端
      if (selectedType !== '全部') {
        commonParams.record_type = selectedType
      }
      
      // 如果筛选了特定类别，覆盖 category 参数（后端会根据record_type判断是收入还是支出类别）
      // 注意：上面的逻辑已经根据 categoryMap 设置了 category，这里其实已经包含了。
      // 但为了兼容新接口的逻辑：
      // 1. 如果选了支出类别，category就是支出类别值
      // 2. 如果选了收入类别，category就是收入类别值
      // 3. 如果是全部类别，category为空
      
      // 最终请求参数
      const apiParams = {
        page: this.data.page,
        ...commonParams
      }

      // 使用新的聚合接口
      const res = await app.request({
        url: '/api/expenses/transactions',
        method: 'GET',
        data: apiParams
      })
      
      if (res.success && res.data) {
        const newItems = res.data.items || []
        // 格式化时间
        const formattedItems = newItems.map(item => ({
          ...item,
          time: this.formatTimeForIOS(item.created_at)
        }))
        
        const records = this.data.page === 1 ? formattedItems : [...this.data.records, ...formattedItems]
        const hasMore = res.data.has_next
        const totalCount = res.data.total
        
        this.setData({
          records,
          filteredRecords: records, // 后端已经过滤好了
          page: this.data.page + 1,
          hasMore,
          totalCount,
          displayTotalCount: totalCount
        })
      } else {
        throw new Error(res.message || '加载失败')
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 传递时间范围 + 类型与类别过滤到后端
      const dateParams = this.getDateRange()
      const selectedType = this.data.recordTypeOptions[this.data.selectedRecordTypeIndex]
      const categoryValue = this.getSelectedCategoryValue()
      const params = {
        ...dateParams,
        record_type: selectedType === '全部' ? '全部' : selectedType,
        // 如果未选择具体类别或无法映射则不传该字段
        ...(categoryValue ? { category: categoryValue } : {})
      }
      const res = await app.request({
        url: '/api/expenses/summary',
        method: 'GET',
        data: params
      })
      
      if (res.success && res.data) {
        this.setData({
          'stats.totalExpense': res.data.totalExpense || 0,
          'stats.totalIncome': res.data.totalIncome || 0,
          'stats.netIncome': res.data.netIncome || 0,
          // 当前筛选的数据应该与后端汇总数据一致
          'stats.localTotalIncome': res.data.totalIncome || 0,
          'stats.localTotalExpense': res.data.totalExpense || 0
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 加载趋势数据
  async loadTrendData() {
    try {
      const dateParams = this.getTrendDateRange()
      const periodType = ['本年', '全部'].includes(this.data.selectedPeriod) ? 'month' : 'day'
      const params = {
        ...dateParams,
        period: periodType
      }

      const res = await app.request({
        url: '/api/expenses/trend',
        method: 'GET',
        data: params
      })

      if (res.success) {
        const raw = Array.isArray(res.data) ? res.data : []
        let data = raw

        if (this.data.selectedPeriod !== '全部') {
          const map = {}
          raw.forEach(item => {
            if (item && item.date) {
              map[item.date] = item
            }
          })

          if (periodType === 'day') {
            const list = []
            const base = new Date(this.data.trendCurrentDateObj || Date.now())
            if (this.data.selectedPeriod === '本周') {
              const dayOfWeek = base.getDay()
              const diff = base.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
              const start = new Date(base.getFullYear(), base.getMonth(), diff)
              for (let i = 0; i < 7; i++) {
                const d = new Date(start)
                d.setDate(start.getDate() + i)
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                const key = `${y}-${m}-${day}`
                const found = map[key] || {}
                list.push({
                  date: key,
                  income: Number(found.income || 0),
                  expense: Number(found.expense || 0),
                  net: Number(found.net || 0)
                })
              }
            } else if (this.data.selectedPeriod === '本月') {
              const y = base.getFullYear()
              const monthIndex = base.getMonth()
              const m = String(monthIndex + 1).padStart(2, '0')
              const daysInMonth = new Date(y, monthIndex + 1, 0).getDate()
              for (let dd = 1; dd <= daysInMonth; dd++) {
                const day = String(dd).padStart(2, '0')
                const key = `${y}-${m}-${day}`
                const found = map[key] || {}
                list.push({
                  date: key,
                  income: Number(found.income || 0),
                  expense: Number(found.expense || 0),
                  net: Number(found.net || 0)
                })
              }
            } else {
              const start = new Date(dateParams.start_date + 'T00:00:00')
              const end = new Date(dateParams.end_date + 'T00:00:00')
              for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                const key = `${y}-${mm}-${day}`
                const found = map[key] || {}
                list.push({
                  date: key,
                  income: Number(found.income || 0),
                  expense: Number(found.expense || 0),
                  net: Number(found.net || 0)
                })
              }
            }
            data = list
          } else if (periodType === 'month') {
            const base = new Date(this.data.trendCurrentDateObj || Date.now())
            const year = base.getFullYear()
            const list = []
            for (let m = 1; m <= 12; m++) {
              const mm = String(m).padStart(2, '0')
              const key = `${year}-${mm}`
              const found = map[key] || {}
              list.push({
                date: key,
                income: Number(found.income || 0),
                expense: Number(found.expense || 0),
                net: Number(found.net || 0)
              })
            }
            data = list
          }
        }

        this.setData({
          trendData: data
        })
      }
    } catch (error) {
      console.error('加载趋势数据失败:', error)
    }
  },

  // 将当前选择的“类别”标签映射为后端存储值
  getSelectedCategoryValue() {
    const label = this.data.categoryOptions[this.data.selectedCategoryIndex]
    const type = this.data.recordTypeOptions[this.data.selectedRecordTypeIndex]
    if (!label || label === '全部') return ''

    // 支出：使用现有 categoryMap 的反向映射
    const expenseValue = Object.keys(this.data.categoryMap).find(k => this.data.categoryMap[k] === label)
    // 收入：使用固定映射（与加载记录时保持一致）
    const incomeReverseMap = {
      '繁殖销售': 'breeding_sale',
      '鸟类销售': 'bird_sale',
      '服务收入': 'service',
      '比赛奖金': 'competition',
      '其他收入': 'other'
    }
    const incomeValue = incomeReverseMap[label]

    if (type === '支出') {
      return expenseValue || ''
    } else if (type === '收入') {
      return incomeValue || ''
    } else {
      // 全部类型：优先匹配支出，否则匹配收入
      return expenseValue || incomeValue || ''
    }
  },

  initData() {
    // 移除原有的初始化逻辑，改为在onLoad中调用API
    this.updateModalCategories()
  },

  // 更新模态框类别选项
  updateModalCategories() {
    const { newRecord } = this.data
    const categories = newRecord.type === '收入' ? 
      this.data.incomeCategories.slice(1).map(cat => ({ value: cat, label: cat })) :
      this.data.expenseCategories.slice(1).map(cat => ({ value: cat, label: cat }))
    
    this.setData({ modalCategories: categories })
  },

  // 筛选事件处理


  // 添加记录相关方法
  async onShowAddRecord() {
    const isLogin = !!(app && app.globalData && app.globalData.isLogin)
    if (!isLogin) { app.showError && app.showError('请先登录后使用此功能'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      const hasOp = !!(app && typeof app.hasOperationPermission === 'function' && app.hasOperationPermission())
      if (!hasOp) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); return }
      try {
        const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
        const teamId = cur && cur.success && cur.data && cur.data.id
        const userId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
        if (teamId && userId) {
          const membersRes = await app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
          if (membersRes && membersRes.success && Array.isArray(membersRes.data)) {
            const me = membersRes.data.find(m => String(m.user_id || m.id) === String(userId))
            const groupId = me && (typeof me.group_id !== 'undefined' ? me.group_id : null)
            if (!groupId) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); return }
          }
        }
      } catch (_) {}
    }
    this.setData({ showAddRecord: true })
  },

  onHideAddRecord() {
    this.setData({ showAddRecord: false })
  },

  // 收支记录添加成功回调
  onExpenseSuccess() {
    // 关闭两个弹窗（添加/编辑）
    this.setData({ 
      showAddRecord: false,
      showEditRecord: false,
      // 重置分页，确保加载第一页最新数据
      page: 1,
      hasMore: true,
      records: [],
      filteredRecords: [],
      totalCount: 0
    });
    // 刷新页面数据（重新拉取第一页）
    this.loadExpenses();
    this.loadStats();
    this.loadTrendData();
  },

  // 应用筛选
  applyFilters() {
    const selectedType = this.data.recordTypeOptions[this.data.selectedRecordTypeIndex]
    const selectedCategory = this.data.categoryOptions[this.data.selectedCategoryIndex]
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase()

    const filtered = this.data.records.filter(rec => {
      // 记录类型匹配
      const typeMatch = selectedType === '全部' ? true : rec.type === selectedType
      if (!typeMatch) return false
      // 类别匹配：按中文类别文本匹配
      const recCategoryLabel = (rec.category_text || (this.data.categoryMap && this.data.categoryMap[rec.category]) || rec.category)
      const categoryMatch = selectedCategory === '全部' ? true : recCategoryLabel === selectedCategory
      if (!categoryMatch) return false
      // 关键字匹配：匹配类型、类别、描述、鹦鹉名、日期、时间
      if (!keyword) return true
      const haystack = `${rec.type} ${recCategoryLabel} ${rec.description || ''} ${rec.parrot || ''} ${rec.parrot_name || ''} ${rec.parrot_number || ''} ${rec.ring_number || ''} ${rec.date || ''} ${rec.time || ''}`.toLowerCase()
      return haystack.includes(keyword)
    })
    // 仅更新列表，不再覆盖统计卡片的后端汇总值
    // 统计卡片统一由 loadStats() 的后端结果驱动，避免分页/列表筛选造成误差
    this.setData({ 
      filteredRecords: filtered,
      displayTotalCount: filtered.length
    })
  },

  // 搜索输入事件
  onSearchInput(e) {
    const value = e.detail.value || ''
    this.setData({ searchKeyword: value }, () => {
      this.applyFilters()
    })
  },

  // 点击清空搜索
  onSearchClear() {
    this.setData({ searchKeyword: '' }, () => {
      this.applyFilters()
    })
  },

  // 键盘搜索确认
  onSearchConfirm(e) {
    const value = e.detail.value || ''
    this.setData({ searchKeyword: value }, () => {
      this.applyFilters()
    })
  },

  // 记录类型下拉选择
  onRecordTypeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ selectedRecordTypeIndex: idx }, () => {
      this.updateCategoryOptions()
      // 重置类别选择为“全部”
      this.setData({ 
        selectedCategoryIndex: 0,
        // 重置分页与列表，确保重新按新筛选拉取第一页
        page: 1,
        hasMore: true,
        records: [],
        filteredRecords: [],
        totalCount: 0,
        displayTotalCount: 0
      }, () => {
        // 重新拉取列表与统计
        this.loadExpenses()
        this.loadStats()
      })
    })
  },

  // 类别下拉选择
  onCategoryChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ 
      selectedCategoryIndex: idx,
      // 重置分页与列表，确保重新按新类别拉取第一页
      page: 1,
      hasMore: true,
      records: [],
      filteredRecords: [],
      totalCount: 0,
      displayTotalCount: 0
    }, () => {
      this.loadExpenses()
      this.loadStats()
    })
  },

  // 根据记录类型更新类别选项
  updateCategoryOptions() {
    const selectedType = this.data.recordTypeOptions[this.data.selectedRecordTypeIndex]
    let options = ['全部']
    if (selectedType === '收入') {
      options = this.data.incomeCategories
    } else if (selectedType === '支出') {
      options = this.data.expenseCategories
    } else {
      // 全部类型：合并收入与支出类别（去掉各自的“全部”）
      options = ['全部', ...this.data.expenseCategories.slice(1), ...this.data.incomeCategories.slice(1)]
    }
    this.setData({ categoryOptions: options })
  },

  // 为弹窗头部计算胶囊避让内边距（与首页实现保持一致）
  computeModalCapsulePadding() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
      const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (win && rect && typeof win.windowWidth === 'number') {
        const rightGap = win.windowWidth - rect.right
        const modalRightPaddingPx = rightGap + rect.width + 16
        const modalTopPaddingPx = Math.max(0, rect.top - 4)
        const modalTopOffsetPx = Math.max(0, rect.bottom + 12)
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

  onSetNewType(e) {
    const type = e.currentTarget.dataset.type
    const category = type === '收入' ? '繁殖销售' : '食物'
    
    this.setData({
      'newRecord.type': type,
      'newRecord.category': category,
      categoryIndex: 0
    }, () => {
      this.updateModalCategories()
    })
  },

  onNewParrotChange(e) {
    const index = e.detail.value
    const parrot = this.data.parrots[index + 1] || '小彩' // +1 因为parrots包含"全部"
    this.setData({
      'newRecord.parrot': parrot,
      parrotIndex: index
    })
  },

  onNewCategoryChange(e) {
    const index = e.detail.value
    const category = this.data.modalCategories[index]
    this.setData({
      'newRecord.category': category.value,
      categoryIndex: index
    })
  },

  onNewAmountChange(e) {
    this.setData({
      'newRecord.amount': e.detail.value
    })
  },

  onNewDescriptionChange(e) {
    this.setData({
      'newRecord.description': e.detail.value
    })
  },

  onNewDateChange(e) {
    this.setData({
      'newRecord.date': e.detail.value
    })
  },

  // 添加记录
  async onAddRecord() {
    const { newRecord } = this.data
    
    if (!newRecord.amount || !newRecord.category) {
      wx.showToast({
        title: '请填写完整的记录信息',
        icon: 'none'
      })
      return
    }

    try {
      let formData = {}
      let apiUrl = ''
      
      if (newRecord.type === '收入') {
        // 收入类别映射到后端值
        const incomeMap = {
          '繁殖销售': 'breeding_sale',
          '鸟类销售': 'bird_sale',
          '服务收入': 'service',
          '比赛奖金': 'competition',
          '其他收入': 'other'
        }
        const categoryValue = incomeMap[newRecord.category]
        if (!categoryValue) {
          wx.showToast({
            title: '不支持的收入类别',
            icon: 'none'
          })
          return
        }
        
        formData = {
          category: categoryValue,
          amount: parseFloat(newRecord.amount),
          description: newRecord.description,
          income_date: newRecord.date
        }
        apiUrl = '/api/expenses/incomes'
      } else {
        // 支出类别映射到后端值
        const categoryValue = Object.keys(this.data.categoryMap).find(
          key => this.data.categoryMap[key] === newRecord.category
        ) || 'other'
        
        formData = {
          category: categoryValue,
          amount: parseFloat(newRecord.amount),
          description: newRecord.description,
          expense_date: newRecord.date
        }
        apiUrl = '/api/expenses'
      }

      const res = await app.request({
        url: apiUrl,
        method: 'POST',
        data: formData
      })

      if (res.success) {
        this.setData({
          showAddRecord: false,
          'newRecord.amount': '',
          'newRecord.description': '',
          'newRecord.date': new Date().toISOString().split('T')[0],
          page: 1,
          records: [],
          hasMore: true
        })
        
        // 重新加载数据
        this.loadExpenses()
        this.loadStats()
        
        wx.showToast({
          title: '添加成功！',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.message || '添加失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('添加记录失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  },

  // 编辑记录相关方法
  onEditRecord(e) {
    const id = e.currentTarget.dataset.id
    const record = (this.data.filteredRecords || []).find(r => r.id === id)
    if (!record) {
      wx.showToast({ title: '记录未找到', icon: 'none' })
      return
    }
    this.setData({
      editRecord: {
        id: record.id,
        type: record.type,
        parrot_id: record.parrot_id || '',
        parrot_name: record.parrot_name || '',
        parrot_number: record.parrot_number || '',
        ring_number: record.ring_number || '',
        category: record.category,
        amount: record.amount,
        description: record.description || '',
        date: record.date
      },
      showEditRecord: true
    })
    this.computeModalCapsulePadding()
  },

onHideEditRecord() {
this.setData({
showEditRecord: false
});
},

  // 删除记录功能
  onDeleteRecord(e) {
    const id = e.currentTarget.dataset.id
    const record = (this.data.filteredRecords || []).find(r => r.id === id)
    if (!record) {
      wx.showToast({ title: '记录未找到', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条${record.type}记录吗？\n\n类别：${record.category_text || (this.data.categoryMap && this.data.categoryMap[record.category]) || record.category}\n金额：¥${record.amount}\n描述：${record.description || '无描述'}`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      cancelText: '取消',
      success: (res) => { if (res.confirm) { this.deleteRecord(record) } }
    })
  },

  async deleteRecord(record) {
    try {
      wx.showLoading({
        title: '删除中...'
      });
      
      const openid = wx.getStorageSync('openid');
      const userMode = wx.getStorageSync('userMode') || 'personal';
      
      // 根据记录类型选择API端点
      // 从record.id中提取实际的ID（去掉前缀）
      const actualId = record.id.replace(/^(expense_|income_)/, '');
      const apiUrl = record.type === '收入' 
        ? `${app.globalData.baseUrl}/api/expenses/incomes/${actualId}`
        : `${app.globalData.baseUrl}/api/expenses/${actualId}`;
      
      console.log('删除记录API URL:', apiUrl);
      
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: apiUrl,
          method: 'DELETE',
          header: {
            'Content-Type': 'application/json',
            'X-OpenID': openid,
            'X-User-Mode': userMode
          },
          success: resolve,
          fail: reject
        });
      });
      
      console.log('删除记录响应:', response);
      
      if (response.statusCode === 200 && response.data.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重置页码并重新加载数据
        this.setData({
          page: 1,
          records: [],
          hasMore: true
        });
        await this.loadExpenses();
        await this.loadStats();
        
      } else {
        throw new Error(response.data.message || '删除失败');
      }
      
    } catch (error) {
      console.error('删除记录失败:', error);
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
})


