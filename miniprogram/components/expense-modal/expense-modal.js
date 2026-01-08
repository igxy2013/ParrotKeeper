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
    // 关联鹦鹉选择
    parrotOptions: [],
    filteredParrotOptions: [],
    selectedParrotId: '',
    selectedParrotName: '',
    selectedParrotNumber: '',
    selectedRingNumber: '',
    showParrotDropdown: false,
    parrotSearchKeyword: '',
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
        this.loadParrots()
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
        canSubmit: false,
        selectedParrotId: '',
        selectedParrotName: ''
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

      // 初始化编辑时的关联鹦鹉
      const possibleId = (editRecord.parrot_id != null && editRecord.parrot_id !== '') ? String(editRecord.parrot_id) : ''
      const possibleName = editRecord.parrot_name || editRecord.parrot || ''
      const possibleNumber = editRecord.parrot_number || ''
      const possibleRing = editRecord.ring_number || ''
      if (possibleId) {
        this.setData({ selectedParrotId: possibleId, selectedParrotName: possibleName || '', selectedParrotNumber: possibleNumber, selectedRingNumber: possibleRing })
      } else if (possibleName) {
        const list = this.data.parrotOptions || []
        const found = list.find(p => String(p.name) === String(possibleName))
        if (found) {
          this.setData({ selectedParrotId: String(found.id), selectedParrotName: found.name, selectedParrotNumber: found.parrot_number || '', selectedRingNumber: found.ring_number || '' })
        } else {
          this.setData({ selectedParrotId: '', selectedParrotName: possibleName , selectedParrotNumber: possibleNumber, selectedRingNumber: possibleRing })
        }
      } else {
        this.setData({ selectedParrotId: '', selectedParrotName: '' , selectedParrotNumber: '', selectedRingNumber: '' })
      }
      // 确保与选项同步（避免异步加载导致未显示名称）
      this.syncSelectedParrotFromOptions()
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

    // 键盘保存（与底部“添加/保存”一致）
    onKeyboardSave() {
      this.onSubmit()
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

    // 加载鹦鹉列表
    async loadParrots() {
      try {
        const res = await app.request({ url: '/api/parrots', method: 'GET', data: { per_page: 100 } })
        const list = (res && res.success && res.data && Array.isArray(res.data.parrots)) ? res.data.parrots : []
        const options = list.map(p => ({ 
          id: p.id, 
          name: p.name, 
          ring_number: p.ring_number || '',
          parrot_number: p.parrot_number || ''
        }))
        this.setData({ parrotOptions: options, filteredParrotOptions: options })
        // 如果已经有选中的名字但没有ID，尝试回填
        if (!this.data.selectedParrotId && this.data.selectedParrotName) {
          const found = options.find(p => p.name === this.data.selectedParrotName)
          if (found) this.setData({ selectedParrotId: String(found.id), selectedParrotNumber: found.parrot_number || '', selectedRingNumber: found.ring_number || '' })
        }
        // 如果已有ID但未有名称，尝试根据ID回填名称与编号
        this.syncSelectedParrotFromOptions()
      } catch (e) {
        // 静默失败
      }
    },

    // 根据当前选中ID或名称，从options回填展示字段
    syncSelectedParrotFromOptions() {
      const options = Array.isArray(this.data.parrotOptions) ? this.data.parrotOptions : []
      const sid = this.data.selectedParrotId
      const sname = this.data.selectedParrotName
      if (sid) {
        const found = options.find(p => String(p.id) === String(sid))
        if (found) {
          this.setData({ selectedParrotName: found.name || sname || '', selectedParrotNumber: found.parrot_number || '', selectedRingNumber: found.ring_number || '' })
        }
      } else if (sname) {
        const found = options.find(p => String(p.name) === String(sname))
        if (found) {
          this.setData({ selectedParrotId: String(found.id), selectedParrotNumber: found.parrot_number || '', selectedRingNumber: found.ring_number || '' })
        }
      }
    },

    // 下拉开关
    toggleParrotDropdown() {
      if (this.data.isEdit) return
      this.setData({ showParrotDropdown: !this.data.showParrotDropdown })
    },

    // 搜索输入
    onParrotSearchInput(e) {
      const kw = String((e && e.detail && e.detail.value) || '').trim().toLowerCase()
      const src = Array.isArray(this.data.parrotOptions) ? this.data.parrotOptions : []
      const filtered = kw ? src.filter(p => {
        const name = String(p.name || '').toLowerCase()
        const ring = String(p.ring_number || '').toLowerCase()
        const num = String(p.parrot_number || '').toLowerCase()
        return name.includes(kw) || ring.includes(kw) || num.includes(kw)
      }) : src
      this.setData({ parrotSearchKeyword: kw, filteredParrotOptions: filtered })
    },

    // 清除搜索
    clearParrotSearch() {
      const src = Array.isArray(this.data.parrotOptions) ? this.data.parrotOptions : []
      this.setData({ parrotSearchKeyword: '', filteredParrotOptions: src })
    },

    // 选择鹦鹉
    selectParrot(e) {
      if (this.data.isEdit) return
      const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id
      const name = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.name
      const num = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.num
      const ring = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.ring
      const selId = id ? String(id) : ''
      const selName = name || ''
      this.setData({ selectedParrotId: selId, selectedParrotName: selName, selectedParrotNumber: num || '', selectedRingNumber: ring || '', showParrotDropdown: false })
    },

  // 提交收支记录
  async onSubmit() {
      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      if (mode === 'team') {
        try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){}
        const canCreateFinance = app && typeof app.hasPermission === 'function' ? app.hasPermission('finance.create') : true
        if (!canCreateFinance) { app.showError('您没有新增收支的权限'); return }
      }
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
        if (this.data.selectedParrotId) {
          const pidNum = Number(this.data.selectedParrotId)
          if (!isNaN(pidNum) && pidNum > 0) payload.parrot_id = pidNum
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
        if (this.data.selectedParrotId) {
          const pidNum = Number(this.data.selectedParrotId)
          if (!isNaN(pidNum) && pidNum > 0) payload.parrot_id = pidNum
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
