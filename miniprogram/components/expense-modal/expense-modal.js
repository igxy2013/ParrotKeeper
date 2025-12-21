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
      categoryValue: 'food',
      amount: '',
      description: '',
      date: ''
    },
    categoryOptions: [],
    canSubmit: false,
    // 类别定义
    incomeCategories: [
      { label: '繁殖销售', value: 'breeding_sale', icon: '/images/remix/ri-shopping-bag-fill-blue.png' },
      { label: '鸟类销售', value: 'bird_sale', icon: '/images/parrot-avatar-yellow.svg' },
      { label: '服务收入', value: 'service', icon: '/images/remix/service-line.png' },
      { label: '比赛奖金', value: 'competition', icon: '/images/remix/trophy-line-orange.png' },
      { label: '其他收入', value: 'other', icon: '/images/remix/ri-information-fill-green.png' }
    ],
    expenseCategories: [
      { label: '食物', value: 'food', icon: '/images/remix/ri-restaurant-fill-orange.png' },
      { label: '医疗', value: 'medical', icon: '/images/remix/ri-nurse-line-purple.png' },
      { label: '玩具', value: 'toys', icon: '/images/remix/ri-heart-fill-red.png' },
      { label: '笼具', value: 'cage', icon: '/images/remix/ri-home-5-fill-green.png' },
      { label: '幼鸟', value: 'baby_bird', icon: '/images/parrot-avatar-yellow.svg' },
      { label: '种鸟', value: 'breeding_bird', icon: '/images/parrot-avatar-green.svg' },
      { label: '其他', value: 'other', icon: '/images/remix/ri-information-fill-amber.png' }
    ],
    showKeyboard: false
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
      const categoryOptions = this.data.expenseCategories

      this.setData({
        formData: {
          type: '支出',
          categoryValue: 'food',
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
      let categoryValue = ''
      
      if (editRecord.type === '收入') {
        categoryOptions = this.data.incomeCategories
        categoryValue = editRecord.category
      } else {
        categoryOptions = this.data.expenseCategories
        categoryValue = editRecord.category
      }

      // 如果找不到对应的category，默认选中第一个
      const found = categoryOptions.find(opt => opt.value === categoryValue)
      if (!found && categoryOptions.length > 0) {
        categoryValue = categoryOptions[0].value
      }

      this.setData({
        formData: {
          type: editRecord.type || '支出',
          categoryValue: categoryValue,
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
      let defaultCategoryValue = ''

      if (type === '收入') {
        categoryOptions = this.data.incomeCategories
        defaultCategoryValue = categoryOptions[0].value
      } else {
        categoryOptions = this.data.expenseCategories
        defaultCategoryValue = categoryOptions[0].value
      }
      this.setData({
        'formData.type': type,
        categoryOptions,
        'formData.categoryValue': defaultCategoryValue
      })
      this.updateCanSubmit()
    },

    // 选择类别
    onCategoryChange(e) {
      const { value } = e.detail
      this.setData({ 'formData.categoryValue': value })
      this.updateCanSubmit()
    },

    // 打开键盘
    openKeyboard() {
      this.setData({ showKeyboard: true })
    },

    // 关闭键盘
    closeKeyboard() {
      this.setData({ showKeyboard: false })
    },

    // 键盘输入
    onKeyboardInput(e) {
      const { value } = e.detail
      this.setData({ 'formData.amount': value })
      this.updateCanSubmit()
    },

    // 键盘确认
    onKeyboardConfirm(e) {
      this.setData({ showKeyboard: false })
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
      const ok = !!(f.amount && Number(f.amount) > 0 && f.categoryValue)
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
      
      const categoryValue = f.categoryValue
      if (!categoryValue) {
        app.showError('请选择类别')
        return
      }

      let payload = {}
      let apiUrl = ''
      let method = 'POST'
      
      if (f.type === '收入') {
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
