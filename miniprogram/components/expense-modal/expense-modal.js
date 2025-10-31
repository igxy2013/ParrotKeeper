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
    },
    // 编辑模式
    isEdit: {
      type: Boolean,
      value: false
    },
    // 编辑的记录数据
    editRecord: {
      type: Object,
      value: null
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
    incomeCategoryLabels: ['繁殖销售','鸟类销售','服务收入','比赛奖金','其他收入'],
    expenseCategoryLabels: ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initForm()
      }
    },
    'editRecord': function(editRecord) {
      if (editRecord && this.data.visible) {
        this.initFormWithEditData(editRecord)
      }
    }
  },

  methods: {
    // 初始化表单
    initForm() {
      if (this.data.isEdit && this.data.editRecord) {
        this.initFormWithEditData(this.data.editRecord)
      } else {
        this.initFormForAdd()
      }
    },

    // 初始化添加表单
    initFormForAdd() {
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

    // 初始化编辑表单
    initFormWithEditData(editRecord) {
      let categoryOptions = []
      let categoryIndex = 0
      
      if (editRecord.type === '收入') {
        categoryOptions = this.data.incomeCategoryLabels || ['繁殖销售','鸟类销售','服务收入','比赛奖金','其他收入']
        // 根据category找到对应的index
        const categoryMap = {
          'bird_sale': '鸟类销售',
          'service': '服务收入',
          'breeding_sale': '繁殖销售',
          'competition': '比赛奖金',
          'other': '其他收入'
        }
        const categoryLabel = categoryMap[editRecord.category] || editRecord.category
        categoryIndex = categoryOptions.indexOf(categoryLabel)
        if (categoryIndex === -1) categoryIndex = 0
      } else {
        categoryOptions = this.data.expenseCategoryLabels || ['食物','医疗','玩具','笼具','幼鸟','种鸟','其他']
        // 根据category找到对应的index
        const categoryMap = {
          'food': '食物',
          'medical': '医疗',
          'toys': '玩具',
          'cage': '笼具',
          'baby_bird': '幼鸟',
          'breeding_bird': '种鸟',
          'other': '其他'
        }
        const categoryLabel = categoryMap[editRecord.category] || editRecord.category
        categoryIndex = categoryOptions.indexOf(categoryLabel)
        if (categoryIndex === -1) categoryIndex = 0
      }

      this.setData({
        formData: {
          type: editRecord.type || '支出',
          categoryIndex: categoryIndex,
          amount: editRecord.amount ? editRecord.amount.toString() : '',
          description: editRecord.description || '',
          date: editRecord.date || ''
        },
        categoryOptions,
        canSubmit: true
      })
    },

    // 设置收支类型
    setExpenseType(e) {
      const type = e.currentTarget.dataset.type
      let categoryOptions = []
      if (type === '收入') {
        categoryOptions = this.data.incomeCategoryLabels || ['繁殖销售','鸟类销售','服务收入','比赛奖金','其他收入']
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
      
      this.setData({ 'formData.amount': value })
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
      let method = 'POST'
      
      if (f.type === '收入') {
        // 收入类别映射到后端值
        const incomeMap = {
          '鸟类销售': 'bird_sale',
          '服务收入': 'service',
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
        
        if (this.data.isEdit && this.data.editRecord) {
          const rawId = String(this.data.editRecord.id || '')
          const actualId = rawId.replace(/^(expense_|income_)/, '')
          apiUrl = `/api/expenses/incomes/${actualId}`
          method = 'PUT'
        } else {
          apiUrl = '/api/expenses/incomes'
          method = 'POST'
        }
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
        
        if (this.data.isEdit && this.data.editRecord) {
          const rawId = String(this.data.editRecord.id || '')
          const actualId = rawId.replace(/^(expense_|income_)/, '')
          apiUrl = `/api/expenses/${actualId}`
          method = 'PUT'
        } else {
          apiUrl = '/api/expenses'
          method = 'POST'
        }
      }

      try {
        const res = await app.request({
          url: apiUrl,
          method: method,
          data: payload
        })
        if (res && res.success) {
          const successMessage = this.data.isEdit ? '更新成功' : '添加成功'
          wx.showToast({ title: successMessage, icon: 'success' })
          this.triggerEvent('success', { type: f.type, data: res.data, isEdit: this.data.isEdit })
          this.onClose()
        } else {
          const errorMessage = this.data.isEdit ? '更新失败' : '添加失败'
          app.showError((res && res.message) || errorMessage)
        }
      } catch (err) {
        console.error('提交收支记录失败:', err)
        const errorMessage = this.data.isEdit ? '网络错误，更新失败' : '网络错误，添加失败'
        app.showError(errorMessage)
      }
    }
  }
})
