const app = getApp()

Page({
  data: {
    expenseId: null,
    formData: {
      category: '',
      amount: '',
      description: '',
      expense_date: '',
      parrot_id: ''
    },
    categories: [
      { value: 'food', label: '食物' },
      { value: 'medical', label: '医疗' },
      { value: 'toys', label: '玩具' },
      { value: 'cage', label: '笼具' },
      { value: 'other', label: '其他' }
    ],
    parrots: [],
    loading: true,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        expenseId: parseInt(options.id)
      })
      this.loadParrots()
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

  // 加载鹦鹉列表
  async loadParrots() {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/parrots`,
          method: 'GET',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('鹦鹉列表API响应:', response)
      
      if (response && response.data && response.data.success) {
        this.setData({
          parrots: response.data.data || []
        })
      } else {
        console.error('鹦鹉列表API返回错误:', response)
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
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
            expense_date: expense.expense_date,
            parrot_id: expense.parrot_id || ''
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

  // 选择鹦鹉
  onParrotChange(e) {
    const index = e.detail.value
    if (index == 0) {
      // 选择了"不指定鹦鹉"
      this.setData({
        'formData.parrot_id': ''
      })
    } else {
      this.setData({
        'formData.parrot_id': this.data.parrots[index - 1].id
      })
    }
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
      if (formData.parrot_id) {
        formData.parrot_id = parseInt(formData.parrot_id)
      } else {
        delete formData.parrot_id
      }

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
  },

  // 获取鹦鹉选择器数组
  getParrotPickerRange() {
    const range = ['不指定鹦鹉']
    this.data.parrots.forEach(parrot => {
      range.push(parrot.name)
    })
    return range
  },

  // 获取当前选中的鹦鹉索引
  getSelectedParrotIndex() {
    if (!this.data.formData.parrot_id) {
      return 0
    }
    const index = this.data.parrots.findIndex(parrot => parrot.id == this.data.formData.parrot_id)
    return index >= 0 ? index + 1 : 0
  }
})