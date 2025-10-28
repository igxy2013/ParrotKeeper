const app = getApp()

Page({
  data: {
    loading: false,
    showAddRecord: false,
    showEditRecord: false, // 新增：编辑记录弹窗显示状态
    selectedParrot: '全部',
    selectedCategory: '全部',
    selectedType: '全部',
    
    // 时间过滤器
    selectedPeriod: '本月', // 默认选择本月

    parrots: ['全部'],
    types: ['全部', '收入', '支出'],

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

    filterCategories: ['全部', '食物', '医疗', '玩具', '笼具', '幼鸟', '种鸟', '其他', '繁殖销售', '鸟类销售', '服务收入', '比赛奖金', '其他收入'],

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
    editCategoryIndex: 0, // 新增：编辑时的类别索引
    modalCategories: [],
    editModalCategories: [], // 新增：编辑弹窗的类别选项
    // 弹窗避让参数
    modalTopOffsetPx: 24,
    modalBottomOffsetPx: 24,
  },

  onLoad() {
    this.loadParrots()
    this.loadExpenses()
    this.loadStats()
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
      totalCount: 0
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
      totalCount: 0
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
        // 覆盖全量数据：使用足够宽的时间范围
        startDate = new Date(1970, 0, 1)
        endDate = new Date(2100, 0, 1)
        break
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
      const params = {
        page: this.data.page,
        per_page: 20,
        ...this.getDateRange()
      }
      
      // 添加筛选条件
      if (this.data.selectedCategory !== '全部') {
        const categoryKey = Object.keys(this.data.categoryMap).find(
          key => this.data.categoryMap[key] === this.data.selectedCategory
        )
        if (categoryKey) {
          params.category = categoryKey
        }
      }

      // 同时获取支出和收入记录
      const [expenseRes, incomeRes] = await Promise.all([
        app.request({
          url: '/api/expenses',
          method: 'GET',
          data: params
        }),
        app.request({
          url: '/api/expenses/incomes',
          method: 'GET',
          data: params
        })
      ])
      
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
      
      this.setData({
        records,
        page: this.data.page + 1,
        hasMore,
        totalCount
      })
      
      this.updateFilteredRecords()
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
      const params = this.getDateRange()
      const res = await app.request({
        url: '/api/expenses/summary',
        method: 'GET',
        data: params
      })
      
      if (res.success && res.data) {
        this.setData({
          'stats.totalExpense': res.data.totalExpense || 0,
          'stats.totalIncome': res.data.totalIncome || 0,
          'stats.netIncome': res.data.netIncome || 0
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  initData() {
    // 移除原有的初始化逻辑，改为在onLoad中调用API
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
    this.updateStats()
  },

  // 更新统计数据
  updateStats() {
    const { filteredRecords } = this.data
    
    // 当前筛选的收入和支出
    const totalIncome = filteredRecords.filter(r => r.type === '收入').reduce((sum, record) => sum + record.amount, 0)
    const totalExpense = filteredRecords.filter(r => r.type === '支出').reduce((sum, record) => sum + record.amount, 0)
    const netIncome = totalIncome - totalExpense

    this.setData({
      // 将当前列表的统计写入局部字段，避免覆盖后端汇总的统计
      'stats.localTotalIncome': totalIncome,
      'stats.localTotalExpense': totalExpense,
      'stats.localNetIncome': netIncome
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
          '出售用品': 'bird_sale',
          '培训服务': 'service',
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

  // 筛选类别变化
  onCategoryChange(e) {
    const selectedCategory = this.data.filterCategories[e.detail.value]
    this.setData({ 
      selectedCategory,
      page: 1,
      records: [],
      hasMore: true
    })
    this.loadExpenses()
  },

  // 筛选鹦鹉变化
  onParrotChange(e) {
    const selectedParrot = this.data.parrots[e.detail.value]
    this.setData({ selectedParrot })
    this.updateFilteredRecords()
  },

  // 筛选类型变化
  onTypeChange(e) {
    const selectedType = this.data.types[e.detail.value]
    this.setData({ selectedType })
    this.updateFilteredRecords()
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
        amount: record.amount.toString(),
        description: record.description || '',
        date: record.date
      },
      showEditRecord: true
    });
    
    // 更新编辑弹窗的类别选项
    this.updateEditModalCategories();
    
    // 设置类别索引
    this.setEditCategoryIndex();
    
    // 计算弹窗避让参数
    this.computeModalCapsulePadding();
  },

onHideEditRecord() {
this.setData({
showEditRecord: false
});
},

updateEditModalCategories() {
const editType = this.data.editRecord.type;
let categories = [];

if (editType === '收入') {
categories = this.data.incomeCategories.filter(cat => cat !== '全部').map(cat => ({
label: cat,
value: cat
}));
} else {
categories = this.data.expenseCategories.filter(cat => cat !== '全部').map(cat => ({
label: cat,
value: cat
}));
}

this.setData({
editModalCategories: categories
});
},

setEditCategoryIndex() {
const categories = this.data.editModalCategories;
const currentCategory = this.data.editRecord.category;
const index = categories.findIndex(cat => cat.label === currentCategory);

this.setData({
editCategoryIndex: index >= 0 ? index : 0
});
},

onSetEditType(e) {
const type = e.currentTarget.dataset.type;
const editRecord = { ...this.data.editRecord };
editRecord.type = type;

// 切换类型时重置类别为第一个
if (type === '收入') {
editRecord.category = this.data.incomeCategories[1]; // 跳过'全部'
} else {
editRecord.category = this.data.expenseCategories[1]; // 跳过'全部'
}

this.setData({
editRecord: editRecord,
editCategoryIndex: 0
});

this.updateEditModalCategories();
},

onEditCategoryChange(e) {
const index = e.detail.value;
const category = this.data.editModalCategories[index];
const editRecord = { ...this.data.editRecord };
editRecord.category = category.label;

this.setData({
editRecord: editRecord,
editCategoryIndex: index
});
},

onEditAmountChange(e) {
const editRecord = { ...this.data.editRecord };
editRecord.amount = e.detail.value;
this.setData({
editRecord: editRecord
});
},

onEditDescriptionChange(e) {
const editRecord = { ...this.data.editRecord };
editRecord.description = e.detail.value;
this.setData({
editRecord: editRecord
});
},

onEditDateChange(e) {
const editRecord = { ...this.data.editRecord };
editRecord.date = e.detail.value;
this.setData({
editRecord: editRecord
});
},

onUpdateRecord: async function() {
const { editRecord } = this.data;

// 验证必填字段
if (!editRecord.amount || parseFloat(editRecord.amount) <= 0) {
wx.showToast({
title: '请输入有效金额',
icon: 'none'
});
return;
}

if (!editRecord.category) {
wx.showToast({
title: '请选择类别',
icon: 'none'
});
return;
}

try {
wx.showLoading({
title: '保存中...'
});

const openid = wx.getStorageSync('openid');
const userMode = wx.getStorageSync('userMode') || 'personal';

// 构建请求数据
const requestData = {
type: editRecord.type === '收入' ? 'income' : 'expense',
category: editRecord.category,
amount: parseFloat(editRecord.amount),
description: editRecord.description,
date: editRecord.date,
parrot: editRecord.parrot
};

console.log('更新记录请求数据:', requestData);

// 根据记录类型选择API端点
const apiUrl = editRecord.type === '收入' 
? `${app.globalData.baseUrl}/api/expenses/incomes/${editRecord.id}`
: `${app.globalData.baseUrl}/api/expenses/${editRecord.id}`;

const response = await new Promise((resolve, reject) => {
wx.request({
url: apiUrl,
method: 'PUT',
data: requestData,
header: {
'Content-Type': 'application/json',
'X-OpenID': openid,
'X-User-Mode': userMode
},
success: resolve,
fail: reject
});
});

console.log('更新记录响应:', response);

if (response.statusCode === 200 && response.data.success) {
wx.showToast({
title: '保存成功',
icon: 'success'
});

// 隐藏弹窗
this.setData({
showEditRecord: false
});

// 重新加载数据
await this.loadExpenses();
await this.loadStats();

} else {
throw new Error(response.data.message || '保存失败');
}

} catch (error) {
console.error('更新记录失败:', error);
wx.showToast({
title: error.message || '保存失败',
icon: 'none'
});
} finally {
wx.hideLoading();
}
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
