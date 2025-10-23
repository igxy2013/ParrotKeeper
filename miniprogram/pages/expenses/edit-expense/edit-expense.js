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
    categories: [
      { value: 'food', label: '食物' },
      { value: 'medical', label: '医疗' },
      { value: 'toys', label: '玩具' },
      { value: 'cage', label: '笼具' },
      { value: 'baby_bird', label: '幼鸟' },
      { value: 'breeding_bird', label: '种鸟' },
      { value: 'other', label: '其他' }
    ],
    loading: true,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        expenseId: parseInt(options.id)
      })
      this.loadExpenseDetail()
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
        this.setData({
          formData: {
            category: expense.category,
            amount: expense.amount.toString(),
            description: expense.description || '',
            expense_date: expense.expense_date
          },
          loading: false
        })
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
    this.setData({
      'formData.category': this.data.categories[index].value
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

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses/${this.data.expenseId}`,
          method: 'PUT',
          data: formData,
          header: {
            'X-OpenID': app.globalData.openid,
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('更新支出API响应:', response)
      
      if (response && response.data && response.data.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        console.error('更新支出API返回错误:', response)
        wx.showToast({
          title: response?.data?.message || '更新失败',
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
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses/${this.data.expenseId}`,
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
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
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

  // 获取类别标签
  getCategoryLabel(value) {
    const category = this.data.categories.find(item => item.value === value)
    return category ? category.label : '请选择类别'
  }
})