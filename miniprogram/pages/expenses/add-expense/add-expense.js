const app = getApp()

Page({
  data: {
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
      { value: 'other', label: '其他' }
    ],
    submitting: false,
    selectedCategoryIndex: -1,
    selectedCategoryLabel: ''
  },

  onLoad() {
    // 设置默认日期为今天
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0')
    
    // 设置默认类别为食物
    this.setData({
      'formData.expense_date': dateStr,
      'formData.category': 'food',
      selectedCategoryIndex: 0,
      selectedCategoryLabel: '食物'
    })
  },

  // 选择类别
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const selectedCategory = this.data.categories[index]
    
    console.log('类别选择变化:', index, selectedCategory)
    
    this.setData({
      'formData.category': selectedCategory.value,
      selectedCategoryIndex: index,
      selectedCategoryLabel: selectedCategory.label
    }, () => {
      console.log('数据更新完成，当前formData:', this.data.formData)
      console.log('当前选中的类别标签:', this.data.selectedCategoryLabel)
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
    console.log('开始提交表单，当前formData:', this.data.formData)
    
    if (!this.validateForm()) {
      console.log('表单验证失败')
      return
    }

    if (this.data.submitting) {
      console.log('正在提交中，忽略重复提交')
      return
    }

    this.setData({ submitting: true })

    try {
      const formData = { ...this.data.formData }
      
      // 转换数据类型
      formData.amount = parseFloat(formData.amount)

      console.log('准备发送的数据:', formData)
      console.log('API地址:', `${app.globalData.baseUrl}/api/expenses`)
      console.log('OpenID:', app.globalData.openid)

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/expenses`,
          method: 'POST',
          data: formData,
          header: {
            'X-OpenID': app.globalData.openid,
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        })
      })

      console.log('添加支出API响应:', response)

      if (response && response.data && response.data.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        console.error('添加支出API返回错误:', response)
        wx.showToast({
          title: response?.data?.message || '添加失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('添加支出失败:', error)
      wx.showToast({
        title: '网络错误，请检查网络连接',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 重置表单
  onReset() {
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0')

    this.setData({
      formData: {
        category: '',
        amount: '',
        description: '',
        expense_date: dateStr
      },
      selectedCategoryIndex: -1,
      selectedCategoryLabel: ''
    })
  },

  // 获取类别标签
  getCategoryLabel(value) {
    const category = this.data.categories.find(item => item.value === value)
    return category ? category.label : '请选择类别'
  }
})