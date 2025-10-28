// components/expense-modal/expense-modal.js
const app = getApp()

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    modalTopOffsetPx: {
      type: Number,
      value: 24
    },
    modalBottomOffsetPx: {
      type: Number,
      value: 24
    }
  },

  data: {
    formData: {
      type: '支出',
      categoryIndex: 0,
      amount: '',
      description: '',
      date: ''
    },
    categoryOptions: [],
    canSubmit: false,
    // 类别标签列表
    incomeCategoryLabels: ['销售幼鸟','配种服务','其他收入'],
    expenseCategoryLabels: ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initForm()
      }
    }
  },

  methods: {
    // 初始化表单
    initForm() {
      // 默认日期：今天
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`

      // 初始化类别选项为支出类别
      const categoryOptions = this.data.expenseCategoryLabels || ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']

      this.setData({
        formData: {
          type: '支出',
          categoryIndex: 0,
          amount: '',
          description: '',
          date: dateStr
        },
        categoryOptions,
        canSubmit: false
      })
    },

    // 设置收支类型
    setExpenseType(e) {
      const type = e.currentTarget.dataset.type
      let categoryOptions = []
      if (type === '收入') {
        categoryOptions = this.data.incomeCategoryLabels || ['销售幼鸟','配种服务','其他收入']
      } else {
        categoryOptions = this.data.expenseCategoryLabels || ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
      }
      this.setData({
        'formData.type': type,
        categoryOptions,
        'formData.categoryIndex': 0
      })
      this.updateCanSubmit()
    },

    // 选择类别
    onCategoryChange(e) {
      const idx = Number(e.detail.value)
      this.setData({ 'formData.categoryIndex': idx })
      this.updateCanSubmit()
    },

    // 金额输入
    onAmountInput(e) {
      this.setData({ 'formData.amount': e.detail.value })
      this.updateCanSubmit()
    },

    // 描述输入
    onDescInput(e) {
      this.setData({ 'formData.description': e.detail.value })
    },

    // 日期选择
    onDateChange(e) {
      this.setData({ 'formData.date': e.detail.value })
      this.updateCanSubmit()
    },

    // 更新提交可用态
    updateCanSubmit() {
      const f = this.data.formData || {}
      const ok = !!(f.amount && Number(f.amount) > 0 && this.data.categoryOptions && this.data.categoryOptions.length > 0)
      this.setData({ canSubmit: ok })
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
    },

    // 点击遮罩层关闭
    onOverlayTap() {
      this.onClose()
    },

    // 阻止事件冒泡
    stopPropagation() {
      // 阻止事件冒泡
    },

    // 提交收支记录
    async onSubmit() {
      const f = this.data.formData
      if (!f || !f.amount || Number(f.amount) <= 0) {
        app.showError('请输入有效金额')
        return
      }
      const categoryLabel = (this.data.categoryOptions || [])[f.categoryIndex] || ''
      if (!categoryLabel) {
        app.showError('请选择类别')
        return
      }

      let payload = {}
      let apiUrl = ''
      
      if (f.type === '收入') {
        // 收入类别映射到后端值
        const incomeMap = {
          '销售幼鸟': 'bird_sale',
          '配种服务': 'service',
          '繁殖销售': 'breeding_sale',
          '比赛奖金': 'competition',
          '其他收入': 'other',
          '其他': 'other'
        }
        const categoryValue = incomeMap[categoryLabel]
        if (!categoryValue) {
          app.showError('不支持的收入类别')
          return
        }
        
        // 组装收入payload
        payload = {
          category: categoryValue,
          amount: Number(f.amount),
          description: f.description || '',
          income_date: f.date || ''
        }
        apiUrl = '/api/expenses/incomes'
      } else {
        // 支出类别映射到后端值
        const expenseMap = {
          '食物': 'food',
          '医疗': 'medical',
          '玩具': 'toys',
          '笼具': 'cage',
          '幼鸟': 'baby_bird',
          '种鸟': 'breeding_bird',
          '其他': 'other'
        }
        const categoryValue = expenseMap[categoryLabel]
        if (!categoryValue) {
          app.showError('不支持的支出类别')
          return
        }

        // 组装支出payload
        payload = {
          category: categoryValue,
          amount: Number(f.amount),
          description: f.description || '',
          expense_date: f.date || ''
        }
        apiUrl = '/api/expenses'
      }

      try {
        const res = await app.request({
          url: apiUrl,
          method: 'POST',
          data: payload
        })
        if (res && res.success) {
          wx.showToast({ title: '添加成功', icon: 'success' })
          this.triggerEvent('success', { type: f.type, data: res.data })
          this.onClose()
        } else {
          app.showError((res && res.message) || '添加失败')
        }
      } catch (err) {
        console.error('提交收支记录失败:', err)
        app.showError('网络错误，添加失败')
      }
    }
  }
})