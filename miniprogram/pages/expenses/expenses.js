const app = getApp()

Page({
  data: {
    loading: false,
    showAddRecord: false,
    selectedParrot: '全部',
    selectedCategory: '全部',
    selectedType: '全部',

    parrots: ['全部', '小彩', '阿福', '小绿'],
    types: ['全部', '收入', '支出'],

    // 类别集合
    expenseCategories: ['全部', '食物', '玩具', '医疗', '用品', '其他'],
    incomeCategories: ['全部', '繁殖收入', '出售用品', '培训服务', '其他收入'],

    filterCategories: ['全部', '食物', '玩具', '医疗', '用品', '其他', '繁殖收入', '出售用品', '培训服务', '其他收入'],

    // 展示用类别网格
    recordCategories: [
      { name: '食物', iconText: '🍚', type: '支出' },
      { name: '玩具', iconText: '🧸', type: '支出' },
      { name: '医疗', iconText: '❤️', type: '支出' },
      { name: '用品', iconText: '🛍️', type: '支出' },
      { name: '其他', iconText: '➕', type: '支出' },
      { name: '繁殖收入', iconText: '🐣', type: '收入' },
      { name: '出售用品', iconText: '🏪', type: '收入' },
      { name: '培训服务', iconText: '🎓', type: '收入' },
      { name: '其他收入', iconText: '💵', type: '收入' },
    ],

    // 示例记录数据（参考APP UI）
    records: [
      { id: 1, type: '支出', parrot: '小彩', category: '食物', amount: 45, description: '优质小米和谷子', date: '2024-01-15', time: '14:30' },
      { id: 2, type: '支出', parrot: '阿福', category: '医疗', amount: 180, description: '定期健康检查', date: '2024-01-14', time: '10:15' },
      { id: 3, type: '支出', parrot: '小绿', category: '玩具', amount: 68, description: '智力训练玩具套装', date: '2024-01-13', time: '16:45' },
      { id: 4, type: '支出', parrot: '小彩', category: '用品', amount: 120, description: '新款鸟笼垫料', date: '2024-01-12', time: '11:20' },
      { id: 5, type: '收入', parrot: '阿福', category: '繁殖收入', amount: 800, description: '出售幼鸟2只', date: '2024-01-11', time: '09:30' },
      { id: 6, type: '收入', parrot: '小绿', category: '培训服务', amount: 300, description: '鹦鹉训练指导服务', date: '2024-01-10', time: '15:10' },
      { id: 7, type: '收入', parrot: '小彩', category: '出售用品', amount: 150, description: '出售闲置鸟笼', date: '2024-01-09', time: '16:20' },
    ],

    filteredRecords: [],
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlyNet: 0,
    },

    // 添加记录表单
    newRecord: {
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
  },

  onLoad() {
    this.initData()
  },

  onShow() {
    this.updateFilteredRecords()
    this.updateStats()
  },

  initData() {
    // 初始化筛选后的记录
    this.updateFilteredRecords()
    this.updateStats()
    this.updateModalCategories()
  },

  // 更新筛选后的记录
  updateFilteredRecords() {
    const { records, selectedParrot, selectedCategory, selectedType } = this.data
    
    const filteredRecords = records.filter(record => {
      const parrotMatch = selectedParrot === '全部' || record.parrot === selectedParrot
      const categoryMatch = selectedCategory === '全部' || record.category === selectedCategory
      const typeMatch = selectedType === '全部' || record.type === selectedType
      return parrotMatch && categoryMatch && typeMatch
    })

    this.setData({ filteredRecords })
  },

  // 更新统计数据
  updateStats() {
    const { filteredRecords, records } = this.data
    
    // 当前筛选的收入和支出
    const totalIncome = filteredRecords.filter(r => r.type === '收入').reduce((sum, record) => sum + record.amount, 0)
    const totalExpense = filteredRecords.filter(r => r.type === '支出').reduce((sum, record) => sum + record.amount, 0)
    const netIncome = totalIncome - totalExpense
    
    // 本月总收入和支出
    const monthlyIncome = records.filter(r => r.type === '收入').reduce((sum, record) => sum + record.amount, 0)
    const monthlyExpense = records.filter(r => r.type === '支出').reduce((sum, record) => sum + record.amount, 0)
    const monthlyNet = monthlyIncome - monthlyExpense

    this.setData({
      stats: {
        totalIncome,
        totalExpense,
        netIncome,
        monthlyIncome,
        monthlyExpense,
        monthlyNet
      }
    })
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
  onSelectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ selectedType: type }, () => {
      this.updateFilteredRecords()
      this.updateStats()
      this.updateFilterCategories()
    })
  },

  onSelectParrot(e) {
    const parrot = e.currentTarget.dataset.parrot
    this.setData({ selectedParrot: parrot }, () => {
      this.updateFilteredRecords()
      this.updateStats()
    })
  },

  onSelectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category }, () => {
      this.updateFilteredRecords()
      this.updateStats()
    })
  },

  onQuickSelectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category }, () => {
      this.updateFilteredRecords()
      this.updateStats()
    })
  },

  // 更新筛选类别
  updateFilterCategories() {
    const { selectedType } = this.data
    let filterCategories = []
    
    if (selectedType === '收入') {
      filterCategories = this.data.incomeCategories
    } else if (selectedType === '支出') {
      filterCategories = this.data.expenseCategories
    } else {
      filterCategories = ['全部', '食物', '玩具', '医疗', '用品', '其他', '繁殖收入', '出售用品', '培训服务', '其他收入']
    }
    
    this.setData({ filterCategories })
  },

  // 添加记录相关方法
  onShowAddRecord() {
    this.setData({ showAddRecord: true })
    this.computeModalCapsulePadding()
    this.updateModalCategories()
  },

  onHideAddRecord() {
    this.setData({ showAddRecord: false })
  },

  // 计算弹窗的顶部胶囊与底部安全区避让
  computeModalCapsulePadding() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (win && rect && typeof win.windowWidth === 'number') {
        const modalTopOffsetPx = Math.max(0, rect.bottom + 12)
        let modalBottomOffsetPx = 24
        if (win && win.safeArea && typeof win.windowHeight === 'number') {
          const bottomInset = win.windowHeight - win.safeArea.bottom
          modalBottomOffsetPx = Math.max(24, bottomInset + 12)
        }
        this.setData({ modalTopOffsetPx, modalBottomOffsetPx })
      }
    } catch (e) {
      this.setData({ modalTopOffsetPx: 24, modalBottomOffsetPx: 24 })
    }
  },

  onSetNewType(e) {
    const type = e.currentTarget.dataset.type
    const category = type === '收入' ? '繁殖收入' : '食物'
    
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

  onAddRecord() {
    const { newRecord } = this.data
    
    if (!newRecord.amount || !newRecord.description) {
      wx.showToast({
        title: '请填写完整的记录信息',
        icon: 'none'
      })
      return
    }

    // 生成新记录
    const newId = Math.max(...this.data.records.map(r => r.id)) + 1
    const record = {
      id: newId,
      type: newRecord.type,
      parrot: newRecord.parrot,
      category: newRecord.category,
      amount: parseFloat(newRecord.amount),
      description: newRecord.description,
      date: newRecord.date,
      time: new Date().toTimeString().slice(0, 5)
    }

    // 添加到记录列表
    const records = [record, ...this.data.records]
    
    this.setData({
      records,
      showAddRecord: false,
      'newRecord.amount': '',
      'newRecord.description': '',
      'newRecord.date': new Date().toISOString().split('T')[0]
    }, () => {
      this.updateFilteredRecords()
      this.updateStats()
      wx.showToast({
        title: `${newRecord.type}记录添加成功！`,
        icon: 'success'
      })
    })
  }
})
