const app = getApp()

Page({
  data: {
    expenseId: null,
    formData: {
      category: '',
      amount: '',
      description: '',
      expense_date: ''
    },
    categories: [], // 改为空数组，从API加载
    selectedCategoryIndex: -1, // 初始不选中
    selectedCategoryLabel: '', // 新增：选中类别的显示标签
    loading: true,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        expenseId: parseInt(options.id)
      })
      // 先加载类别，再加载支出详情
      this.loadCategories().then(() => {
        this.loadExpenseDetail()
      })
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载支出类别
  async loadCategories() {
    try {
      console.log('开始加载支出类别...')
      const response = await app.request({
        url: '/api/expenses/categories',
        method: 'GET'
      })

      console.log('支出类别API响应:', response)
      
      if (response && response.success) {
        console.log('API返回的categories数据:', response.data)
        this.setData({
          categories: response.data
        }, () => {
          console.log('categories设置完成，当前值:', this.data.categories)
        })
        console.log('设置的支出类别:', response.data)
      } else {
        console.error('支出类别API返回错误:', response)
        // 如果API失败，使用默认类别
        const defaultCategories = [
          { value: 'food', label: '食物' },
          { value: 'medical', label: '医疗' },
          { value: 'toys', label: '玩具' },
          { value: 'cage', label: '笼具' },
          { value: 'baby_bird', label: '幼鸟' },
          { value: 'breeding_bird', label: '种鸟' },
          { value: 'other', label: '其他' }
        ]
        this.setData({
          categories: defaultCategories
        })
        console.log('使用默认类别:', defaultCategories)
      }
    } catch (error) {
      console.error('加载支出类别失败:', error)
      // 如果网络错误，使用默认类别
      const defaultCategories = [
        { value: 'food', label: '食物' },
        { value: 'medical', label: '医疗' },
        { value: 'toys', label: '玩具' },
        { value: 'cage', label: '笼具' },
        { value: 'baby_bird', label: '幼鸟' },
        { value: 'breeding_bird', label: '种鸟' },
        { value: 'other', label: '其他' }
      ]
      this.setData({
        categories: defaultCategories
      })
      console.log('网络错误，使用默认类别:', defaultCategories)
    }
  },

  // 加载支出详情
  async loadExpenseDetail() {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses/${this.data.expenseId}`,
          method: 'GET',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('支出详情API响应:', response)
      
      if (response && response.data && response.data.success) {
        const expense = response.data.data
        
        console.log('支出详情数据:', expense)
        console.log('当前categories数组:', this.data.categories)
        
        // 找到当前类别在categories数组中的索引
        const categoryIndex = this.data.categories.findIndex(cat => cat.value === expense.category)
        const categoryLabel = categoryIndex >= 0 ? this.data.categories[categoryIndex].label : ''
        
        console.log('支出类别值:', expense.category)
        console.log('找到的类别索引:', categoryIndex)
        console.log('找到的类别标签:', categoryLabel)
        
        this.setData({
          formData: {
            category: expense.category,
            amount: expense.amount.toString(),
            description: expense.description || '',
            expense_date: expense.expense_date
          },
          selectedCategoryIndex: categoryIndex >= 0 ? categoryIndex : -1, // 设置正确的类别索引
          selectedCategoryLabel: categoryLabel,
          loading: false
        }, () => {
          // 数据设置完成后的回调，确保页面已更新
          console.log('数据设置完成，当前formData.category:', this.data.formData.category)
          console.log('数据设置完成，当前selectedCategoryIndex:', this.data.selectedCategoryIndex)
          console.log('数据设置完成，当前selectedCategoryLabel:', this.data.selectedCategoryLabel)
          console.log('数据设置完成，当前categories:', this.data.categories)
        })
        
        console.log('设置后的formData.category:', this.data.formData.category)
        console.log('设置后的selectedCategoryIndex:', this.data.selectedCategoryIndex)
        console.log('设置后的selectedCategoryLabel:', this.data.selectedCategoryLabel)
      } else {
        console.error('支出详情API返回错误:', response)
        wx.showToast({
          title: response?.data?.message || '加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载支出详情失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 选择类别
  onCategoryChange(e) {
    const index = e.detail.value
    const selected = this.data.categories[index]
    this.setData({
      'formData.category': selected.value,
      selectedCategoryIndex: index, // 同时更新选中的索引
      selectedCategoryLabel: selected.label
    }, () => {
      console.log('选择类别完成，当前selectedCategoryLabel:', this.data.selectedCategoryLabel)
    })
  },

  // 输入金额
  onAmountInput(e) {
    let value = e.detail.value
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '')
    // 只允许一个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    // 限制小数位数为2位
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }

    this.setData({
      'formData.amount': value
    })
  },

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 选择日期
  onDateChange(e) {
    this.setData({
      'formData.expense_date': e.detail.value
    })
  },

  // 表单验证
  validateForm() {
    const { category, amount, expense_date } = this.data.formData

    if (!category) {
      wx.showToast({
        title: '请选择支出类别',
        icon: 'none'
      })
      return false
    }

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return false
    }

    if (!expense_date) {
      wx.showToast({
        title: '请选择支出日期',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) {
      return
    }

    if (this.data.submitting) {
      return
    }

    this.setData({ submitting: true })

    try {
      const formData = { ...this.data.formData }
      
      // 转换数据类型
      formData.amount = parseFloat(formData.amount)

      const response = await app.request({ url: `/api/expenses/${this.data.expenseId}`, method: 'PUT', data: formData })

      console.log('更新支出API响应:', response)
      
      if (response && response.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 设置刷新标识，确保返回支出管理页面时会刷新数据
        app.globalData.needRefresh = true

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        console.error('更新支出API返回错误:', response)
        wx.showToast({
          title: response?.message || '更新失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('更新支出失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 删除支出
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条支出记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteExpense()
        }
      }
    })
  },

  // 执行删除
  async deleteExpense() {
    try {
      const response = await app.request({ url: `/api/expenses/${this.data.expenseId}`, method: 'DELETE' })

      console.log('删除支出API响应:', response)
      
      if (response && response.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        app.globalData.needRefresh = true

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        console.error('删除支出API返回错误:', response)
        wx.showToast({
          title: response?.message || '删除失败',
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

  // 获取类别标签
  getCategoryLabel(value) {
    console.log('getCategoryLabel被调用，参数value:', value)
    console.log('当前categories数组:', this.data.categories)
    
    if (!value) {
      console.log('value为空，返回默认文本')
      return '请选择类别'
    }
    
    if (!this.data.categories || this.data.categories.length === 0) {
      console.log('categories数组为空，返回默认文本')
      return '请选择类别'
    }
    
    const category = this.data.categories.find(item => item.value === value)
    console.log('找到的category:', category)
    
    const result = category ? category.label : '请选择类别'
    console.log('getCategoryLabel返回结果:', result)
    return result
  }
})
