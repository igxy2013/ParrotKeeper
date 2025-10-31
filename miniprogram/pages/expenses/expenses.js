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
    searchKeyword: ''
  },

  onLoad() {
    this.loadParrots()
    this.loadExpenses()
    this.loadStats()
    // 初始化类别选项与默认选择
    this.updateCategoryOptions()
  },

  onShow() {
    // 检查是否需要刷新数据
    if (app.globalData.needRefresh) {
      app.globalData.needRefresh = false
      this.loadExpenses()
      this.loadStats()
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
      // 在setData完成后再调用，确保selectedPeriod已更新
      this.loadExpenses()
      this.loadStats()
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
    const now = new Date()
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
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case '本周':
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // 周一开始
        startDate = new Date(now.getFullYear(), now.getMonth(), diff)
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case '本月':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case '本年':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear() + 1, 0, 1)
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

      // 请求参数：分别为支出与收入接口组装，按需附加类别过滤
      const expenseParams = {
        page: this.data.page,
        per_page: 20,
        ...dateParams,
        // 当选择支出或全部且选择的是支出类别时，传递支出类别到后端
        ...((selectedCategoryLabel !== '全部' && (selectedType === '支出' || (selectedType === '全部' && this.data.expenseCategories.includes(selectedCategoryLabel))) && expenseCategoryValue) ? { category: expenseCategoryValue } : {})
      }
      const incomeParams = {
        page: this.data.page,
        per_page: 20,
        ...dateParams,
        // 当选择收入或全部且选择的是收入类别时，传递收入类别到后端
        ...((selectedCategoryLabel !== '全部' && (selectedType === '收入' || (selectedType === '全部' && this.data.incomeCategories.includes(selectedCategoryLabel))) && incomeCategoryValue) ? { category: incomeCategoryValue } : {})
      }
      
      console.log('加载记录参数 - 支出:', expenseParams, '收入:', incomeParams)

      // 同时获取支出和收入记录
      const [expenseRes, incomeRes] = await Promise.all([
        app.request({
          url: '/api/expenses',
          method: 'GET',
          data: expenseParams
        }),
        app.request({
          url: '/api/expenses/incomes',
          method: 'GET',
          data: incomeParams
        })
      ])
      
      console.log('支出API响应:', expenseRes)
      console.log('收入API响应:', incomeRes)
      
      let newRecords = []
      
      // 处理支出记录
      if (expenseRes.success && expenseRes.data) {
        const expenseRecords = expenseRes.data.items.map(item => ({
          id: `expense_${item.id}`,
          type: '支出',
          parrot: item.parrot_name || '未指定',
          category: this.data.categoryMap[item.category] || item.category,
          amount: item.amount,
          description: item.description || '',
          date: item.expense_date,
          time: this.formatTimeForIOS(item.created_at),
          originalType: 'expense'
        }))
        newRecords = [...newRecords, ...expenseRecords]
      }
      
      // 处理收入记录
      if (incomeRes.success && incomeRes.data) {
        // 收入类别映射
        const incomeMap = {
          'breeding_sale': '繁殖销售',
          'bird_sale': '鸟类销售',
          'service': '服务收入',
          'competition': '比赛奖金',
          'other': '其他收入'
        }
        
        const incomeRecords = incomeRes.data.items.map(item => ({
          id: `income_${item.id}`,
          type: '收入',
          parrot: item.parrot_name || '未指定',
          category: incomeMap[item.category] || item.category,
          amount: item.amount,
          description: item.description || '',
          date: item.income_date,
          time: this.formatTimeForIOS(item.created_at),
          originalType: 'income'
        }))
        newRecords = [...newRecords, ...incomeRecords]
      }
      
      // 按日期排序（最新的在前）
      newRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
      
      const records = this.data.page === 1 ? newRecords : [...this.data.records, ...newRecords]
      
      // 计算总数和是否有更多数据
      const expenseTotal = expenseRes.success ? (expenseRes.data.total || 0) : 0
      const incomeTotal = incomeRes.success ? (incomeRes.data.total || 0) : 0
      const totalCount = expenseTotal + incomeTotal
      
      const expenseHasNext = expenseRes.success ? (expenseRes.data.has_next || false) : false
      const incomeHasNext = incomeRes.success ? (incomeRes.data.has_next || false) : false
      const hasMore = expenseHasNext || incomeHasNext
      
      console.log(`加载完成，记录数: ${newRecords.length}, 总数: ${totalCount}, 当前时间段: ${this.data.selectedPeriod}`)
      
      this.setData({
        records,
        filteredRecords: records,
        page: this.data.page + 1,
        hasMore,
        totalCount
      }, () => {
        // 加载后应用筛选
        this.applyFilters()
      })
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
  onShowAddRecord() {
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
      // 类别匹配：当选择具体类别时，两个类型都按显示的类别文字匹配
      const categoryMatch = selectedCategory === '全部' ? true : rec.category === selectedCategory
      if (!categoryMatch) return false
      // 关键字匹配：匹配类型、类别、描述、鹦鹉名、日期、时间
      if (!keyword) return true
      const haystack = `${rec.type} ${rec.category} ${rec.description || ''} ${rec.parrot || ''} ${rec.date || ''} ${rec.time || ''}`.toLowerCase()
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
    const record = e.currentTarget.dataset.record;
    console.log('编辑记录:', record);
    
    // 设置编辑记录数据
    this.setData({
      editRecord: {
        id: record.id,
        type: record.type,
        parrot: record.parrot || '小彩',
        category: record.category,
        amount: record.amount,
        description: record.description || '',
        date: record.date
      },
      showEditRecord: true
    });
    
    // 计算弹窗避让参数
    this.computeModalCapsulePadding();
  },

onHideEditRecord() {
this.setData({
showEditRecord: false
});
},

  // 删除记录功能
  onDeleteRecord(e) {
    const record = e.currentTarget.dataset.record;
    console.log('删除记录:', record);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条${record.type}记录吗？\n\n类别：${record.category}\n金额：¥${record.amount}\n描述：${record.description || '无描述'}`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecord(record);
        }
      }
    });
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


