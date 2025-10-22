const app = getApp()

Page({
  data: {
    expenses: [],
    loading: false,
    hasMore: true,
    page: 1,
    limit: 20,
    totalAmount: 0,
    categories: [
      { value: 'food', label: '食物' },
      { value: 'medical', label: '医疗' },
      { value: 'toys', label: '玩具' },
      { value: 'cage', label: '笼具' },
      { value: 'other', label: '其他' }
    ],
    selectedCategory: '',
    showFilter: false,
    startDate: '',
    endDate: '',
    summary: {
      monthly_total: 0,
      yearly_total: 0,
      categories: []
    }
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.openid) {
      const openid = wx.getStorageSync('openid')
      if (openid) {
        app.globalData.openid = openid
        console.log('从存储中恢复openid:', openid)
      } else {
        console.log('未找到openid，跳转到登录页面')
        wx.redirectTo({
          url: '/pages/login/login'
        })
        return
      }
    }
    
    console.log('当前openid:', app.globalData.openid)
    this.loadExpenses()
    this.loadSummary()
  },

  onPullDownRefresh() {
    this.setData({
      expenses: [],
      page: 1,
      hasMore: true
    })
    this.loadExpenses()
    this.loadSummary()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadExpenses()
    }
  },

  // 加载支出列表
  async loadExpenses() {
    if (this.data.loading) return

    this.setData({ loading: true })

    console.log('开始加载支出记录，当前页码:', this.data.page)
    console.log('使用的openid:', app.globalData.openid)

    try {
      const params = {
        page: this.data.page,
        limit: this.data.limit
      }

      if (this.data.selectedCategory) {
        params.category = this.data.selectedCategory
      }

      if (this.data.startDate) {
        params.start_date = this.data.startDate
      }

      if (this.data.endDate) {
        params.end_date = this.data.endDate
      }

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses`,
          method: 'GET',
          data: params,
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('支出列表API响应:', response)
      
      if (response && response.data && response.data.success) {
        const newExpenses = response.data.data.items
        console.log('获取到的支出记录:', newExpenses)
        
        // 处理类别翻译
        const processedExpenses = newExpenses.map(expense => {
          const categoryMap = {
            'food': '食物',
            'medical': '医疗',
            'toys': '玩具',
            'accessories': '用品',
            'grooming': '美容',
            'training': '训练',
            'cage': '笼具',
            'other': '其他'
          }
          
          return {
            ...expense,
            categoryName: categoryMap[expense.category] || expense.category,
            amount: parseFloat(expense.amount) || 0,  // 确保金额是数字类型
            amount_display: (parseFloat(expense.amount) || 0).toFixed(2)
          }
        })
        
        const expenses = this.data.page === 1 ? processedExpenses : [...this.data.expenses, ...processedExpenses]
        
        // 计算总金额
        const totalAmount = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)

        this.setData({
          expenses,
          totalAmount,
          totalAmount_display: totalAmount.toFixed(2),
          hasMore: response.data.data.has_next,
          page: this.data.page + 1
        })
        
        console.log('设置后的支出记录数据:', this.data.expenses)
        console.log('计算的总金额:', totalAmount)
      } else {
        console.error('支出列表API返回错误:', response)
        wx.showToast({
          title: response?.data?.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载支出列表失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载汇总数据
  async loadSummary() {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses/summary`,
          method: 'GET',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('汇总数据API响应:', response)
      
      if (response && response.data && response.data.success) {
        const summaryData = response.data.data
        console.log('汇总数据:', summaryData)
        
        // 确保汇总数据中的金额是数字类型
        const processedSummary = {
          monthly_total: parseFloat(summaryData.monthly_total) || 0,
          yearly_total: parseFloat(summaryData.yearly_total) || 0,
          categories: summaryData.categories || [],
          monthly_total_display: (parseFloat(summaryData.monthly_total) || 0).toFixed(2),
          yearly_total_display: (parseFloat(summaryData.yearly_total) || 0).toFixed(2)
        }
        
        this.setData({
          summary: processedSummary
        })
        
        console.log('设置的汇总数据:', processedSummary)
      } else {
        console.error('汇总数据API返回错误:', response)
      }
    } catch (error) {
      console.error('加载汇总数据失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
    }
  },

  // 添加支出
  onAddExpense() {
    wx.navigateTo({
      url: '/pages/expenses/add-expense/add-expense'
    })
  },

  // 编辑支出
  onEditExpense(e) {
    const expenseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/expenses/edit-expense/edit-expense?id=${expenseId}`
    })
  },

  // 删除支出
  onDeleteExpense(e) {
    const expenseId = e.currentTarget.dataset.id
    const expenseIndex = e.currentTarget.dataset.index

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条支出记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteExpense(expenseId, expenseIndex)
        }
      }
    })
  },

  // 执行删除
  async deleteExpense(expenseId, expenseIndex) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses/${expenseId}`,
          method: 'DELETE',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('删除支出API响应:', response)
      
      if (response && response.data && response.data.success) {
        const expenses = [...this.data.expenses]
        const deletedExpense = expenses[expenseIndex]
        expenses.splice(expenseIndex, 1)
        
        const totalAmount = this.data.totalAmount - deletedExpense.amount
 
         this.setData({
           expenses,
           totalAmount,
           totalAmount_display: totalAmount.toFixed(2)
         })

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 重新加载汇总数据
        this.loadSummary()
      } else {
        console.error('删除支出API返回错误:', response)
        wx.showToast({
          title: response?.data?.message || '删除失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('删除支出失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
    }
  },

  // 显示筛选
  onShowFilter() {
    this.setData({
      showFilter: !this.data.showFilter
    })
  },

  // 选择类别
  onCategoryChange(e) {
    this.setData({
      selectedCategory: e.detail.value
    })
  },

  // 选择开始日期
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  // 选择结束日期
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
  },

  // 应用筛选
  onApplyFilter() {
    this.setData({
      expenses: [],
      page: 1,
      hasMore: true,
      showFilter: false
    })
    this.loadExpenses()
  },

  // 重置筛选
  onResetFilter() {
    this.setData({
      selectedCategory: '',
      startDate: '',
      endDate: '',
      expenses: [],
      page: 1,
      hasMore: true,
      showFilter: false
    })
    this.loadExpenses()
  },

  // 获取类别标签
  getCategoryLabel(category) {
    const categoryItem = this.data.categories.find(item => item.value === category)
    return categoryItem ? categoryItem.label : category
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  }
})