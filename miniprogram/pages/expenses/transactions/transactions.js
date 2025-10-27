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
  },

  onLoad(options) {
    this.updateFilterCategories()
    this.applyFilters()
    this.updateModalCategories()
    if (options && (options.showAddRecord === '1' || options.action === 'add')) {
      this.setData({ showAddRecord: true })
    }
  },

  // 根据选择的类型更新筛选类别集合
  updateFilterCategories() {
    const { selectedType, incomeCategories, expenseCategories } = this.data
    let filters
    if (selectedType === '收入') {
      filters = incomeCategories
    } else if (selectedType === '支出') {
      filters = expenseCategories
    } else {
      filters = ['全部', '食物', '玩具', '医疗', '用品', '其他', '繁殖收入', '出售用品', '培训服务', '其他收入']
    }
    this.setData({ filterCategories: filters })
  },

  // 计算筛选后的记录与统计
  applyFilters() {
    const { records, selectedParrot, selectedCategory, selectedType } = this.data
    const filtered = records.filter(r => {
      const parrotMatch = selectedParrot === '全部' || r.parrot === selectedParrot
      const categoryMatch = selectedCategory === '全部' || r.category === selectedCategory
      const typeMatch = selectedType === '全部' || r.type === selectedType
      return parrotMatch && categoryMatch && typeMatch
    })

    const totalIncome = filtered.filter(r => r.type === '收入').reduce((s, r) => s + r.amount, 0)
    const totalExpense = filtered.filter(r => r.type === '支出').reduce((s, r) => s + r.amount, 0)
    const netIncome = totalIncome - totalExpense

    const monthlyIncome = records.filter(r => r.type === '收入').reduce((s, r) => s + r.amount, 0)
    const monthlyExpense = records.filter(r => r.type === '支出').reduce((s, r) => s + r.amount, 0)
    const monthlyNet = monthlyIncome - monthlyExpense

    this.setData({
      filteredRecords: filtered,
      stats: {
        totalIncome,
        totalExpense,
        netIncome,
        monthlyIncome,
        monthlyExpense,
        monthlyNet,
      }
    })
  },

  // 快速选择类别
  onQuickSelectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category }, () => {
      this.applyFilters()
    })
  },

  // 选择类型
  onSelectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ selectedType: type }, () => {
      this.updateFilterCategories()
      this.applyFilters()
      this.updateModalCategories()
    })
  },

  // 选择鹦鹉
  onSelectParrot(e) {
    const parrot = e.currentTarget.dataset.parrot
    this.setData({ selectedParrot: parrot }, () => this.applyFilters())
  },

  // 选择类别
  onSelectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category }, () => this.applyFilters())
  },

  // 弹窗逻辑
  onShowAddRecord() {
    this.setData({ showAddRecord: true })
  },
  onHideAddRecord() {
    this.setData({ showAddRecord: false })
  },
  onSetNewType(e) {
    const type = e.currentTarget.dataset.type
    const category = type === '收入' ? '繁殖收入' : '食物'
    this.setData({
      newRecord: { ...this.data.newRecord, type, category },
    }, () => this.updateModalCategories())
  },
  updateModalCategories() {
    const { newRecord, incomeCategories, expenseCategories } = this.data
    const cats = (newRecord.type === '收入' ? incomeCategories : expenseCategories)
      .filter(c => c !== '全部')
      .map(label => ({ label }))
    this.setData({ modalCategories: cats, categoryIndex: 0 })
  },
  onNewParrotChange(e) {
    const idx = parseInt(e.detail.value)
    const parrots = this.data.parrots
    const parrot = parrots[Math.max(1, idx)] // 跳过“全部”，默认取第一个具体鹦鹉
    this.setData({ parrotIndex: idx, newRecord: { ...this.data.newRecord, parrot } })
  },
  onNewCategoryChange(e) {
    const idx = parseInt(e.detail.value)
    const cat = this.data.modalCategories[idx]?.label || this.data.modalCategories[0]?.label
    this.setData({ categoryIndex: idx, newRecord: { ...this.data.newRecord, category: cat } })
  },
  onNewAmountInput(e) {
    this.setData({ newRecord: { ...this.data.newRecord, amount: e.detail.value } })
  },
  onNewDescriptionInput(e) {
    this.setData({ newRecord: { ...this.data.newRecord, description: e.detail.value } })
  },
  onNewDateChange(e) {
    this.setData({ newRecord: { ...this.data.newRecord, date: e.detail.value } })
  },
  onSubmitNewRecord() {
    const { newRecord, records } = this.data
    if (!newRecord.amount || !newRecord.description) {
      app.showError && app.showError('请填写完整的记录信息')
      return
    }

    const id = (records[0]?.id || 0) + records.length + 1
    const time = '12:00'
    const amountNum = Number(newRecord.amount)
    const toAdd = { ...newRecord, id, time, amount: amountNum }
    const next = [toAdd, ...records]
    this.setData({
      records: next,
      showAddRecord: false,
      newRecord: {
        type: '支出', parrot: '小彩', category: '食物', amount: '', description: '',
        date: new Date().toISOString().split('T')[0]
      }
    }, () => this.applyFilters())

    wx.showToast({ title: '添加成功', icon: 'success' })
  }
})
