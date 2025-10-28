// pages/breeding/breeding.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    loading: false,
    showAddModal: false,
    
    // 统计数据
    stats: {
      totalPairs: 0,
      successfulHatching: 0
    },
    
    // 筛选状态
    statusOptions: ['全部', '配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成'],
    selectedStatus: '全部',
    
    // 繁殖记录数据
    breedingRecords: [],
    filteredRecords: [],
    
    // 鹦鹉选项
    parrotOptions: [],
    
    // 繁殖状态选项
    breedingStatusOptions: ['配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成'],
    
    // 表单数据
    formData: {
      maleParrot: '',
      maleParrotId: '',
      maleParrotIndex: -1,
      femaleParrot: '',
      femaleParrotId: '',
      femaleParrotIndex: -1,
      nestingDate: '',
      layingDate: '',
      hatchingDate: '',
      eggCount: '',
      hatchedCount: '',
      status: '配对中',
      statusIndex: 0,
      notes: ''
    }
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLogin) {
      this.loadParrotOptions()
      this.loadBreedingRecords()
    }
  },

  onPullDownRefresh() {
    if (this.data.isLogin) {
      this.loadBreedingRecords()
    }
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    // 可以在这里实现分页加载
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.globalData.isLogin
    this.setData({ isLogin })
    
    if (!isLogin) {
      this.setData({
        breedingRecords: [],
        filteredRecords: [],
        stats: {
          totalPairs: 0,
          successfulHatching: 0
        }
      })
    }
  },

  // 加载鹦鹉选项
  async loadParrotOptions() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      if (res && res.success) {
        const parrots = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.parrots))
            ? res.data.parrots
            : (res.data && Array.isArray(res.data.items))
              ? res.data.items
              : []
        this.setData({ parrotOptions: parrots })
      }
    } catch (err) {
      console.error('加载鹦鹉列表失败:', err)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载繁殖记录
  async loadBreedingRecords() {
    this.setData({ loading: true })
    try {
      const res = await app.request({
        url: '/api/records/breeding',
        method: 'GET'
      })
      if (res && res.success) {
        const items = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.items))
            ? res.data.items
            : []
        const records = this.processBreedingRecords(items)
        this.setData({
          breedingRecords: records,
          loading: false
        })
        this.filterRecords()
        this.updateStats()
      } else {
        app.showError((res && res.message) || '加载繁殖记录失败')
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载繁殖记录失败:', err)
      app.showError('网络错误，请稍后重试')
      this.setData({ loading: false })
    }
  },

  // 处理繁殖记录数据
  processBreedingRecords(records) {
    return records.map(record => {
      // 构建鹦鹉配对名称
      const maleParrotName = record.male_parrot ? record.male_parrot.name : '未知'
      const femaleParrotName = record.female_parrot ? record.female_parrot.name : '未知'
      const parrotPair = `${maleParrotName} × ${femaleParrotName}`
      
      // 计算孵化率
      let hatchingRate = '-'
      if (record.egg_count > 0) {
        hatchingRate = `${record.chick_count || 0}/${record.egg_count}`
      }
      
      // 根据日期和数据推断状态
      let status = '配对中'
      let statusClass = 'status-pairing'
      
      if (record.hatching_date && record.chick_count > 0) {
        status = '育雏中'
        statusClass = 'status-brooding'
      } else if (record.hatching_date) {
        status = '孵化中'
        statusClass = 'status-hatching'
      } else if (record.egg_laying_date && record.egg_count > 0) {
        status = '产蛋中'
        statusClass = 'status-laying'
      } else if (record.mating_date) {
        status = '筑巢中'
        statusClass = 'status-nesting'
      }
      
      return {
        id: record.id,
        parrotPair,
        maleParrot: maleParrotName,
        femaleParrot: femaleParrotName,
        nestingDate: record.mating_date || '',
        layingDate: record.egg_laying_date || '',
        hatchingDate: record.hatching_date || '',
        eggCount: record.egg_count || 0,
        hatchedCount: record.chick_count || 0,
        hatchingRate,
        status,
        statusClass,
        notes: record.notes || '',
        createdAt: this.formatDate(record.created_at),
        rawData: record
      }
    })
  },

  // 更新统计数据
  updateStats() {
    const records = this.data.breedingRecords
    const totalPairs = records.length
    const successfulHatching = records.filter(record => record.hatchedCount > 0).length
    
    this.setData({
      stats: {
        totalPairs,
        successfulHatching
      }
    })
  },

  // 筛选记录
  filterRecords() {
    const { breedingRecords, selectedStatus } = this.data
    let filteredRecords = breedingRecords
    
    if (selectedStatus !== '全部') {
      filteredRecords = breedingRecords.filter(record => record.status === selectedStatus)
    }
    
    this.setData({ filteredRecords })
  },

  // 选择状态筛选
  selectStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ selectedStatus: status })
    this.filterRecords()
  },

  // 显示添加表单
  showAddForm() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    this.setData({ 
      showAddModal: true,
      formData: {
        maleParrot: '',
        maleParrotId: '',
        maleParrotIndex: -1,
        femaleParrot: '',
        femaleParrotId: '',
        femaleParrotIndex: -1,
        nestingDate: '',
        layingDate: '',
        hatchingDate: '',
        eggCount: '',
        hatchedCount: '',
        status: '配对中',
        statusIndex: 0,
        notes: ''
      }
    })
  },

  // 隐藏添加表单
  hideAddForm() {
    this.setData({ showAddModal: false })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 表单输入处理
  onMaleParrotChange(e) {
    const index = e.detail.value
    const parrot = this.data.parrotOptions[index]
    this.setData({
      'formData.maleParrotIndex': index,
      'formData.maleParrot': parrot ? parrot.name : '',
      'formData.maleParrotId': parrot ? parrot.id : ''
    })
  },

  onFemaleParrotChange(e) {
    const index = e.detail.value
    const parrot = this.data.parrotOptions[index]
    this.setData({
      'formData.femaleParrotIndex': index,
      'formData.femaleParrot': parrot ? parrot.name : '',
      'formData.femaleParrotId': parrot ? parrot.id : ''
    })
  },

  onNestingDateChange(e) {
    this.setData({
      'formData.nestingDate': e.detail.value
    })
  },

  onLayingDateChange(e) {
    this.setData({
      'formData.layingDate': e.detail.value
    })
  },

  onHatchingDateChange(e) {
    this.setData({
      'formData.hatchingDate': e.detail.value
    })
  },

  onEggCountInput(e) {
    this.setData({
      'formData.eggCount': e.detail.value
    })
  },

  onHatchedCountInput(e) {
    this.setData({
      'formData.hatchedCount': e.detail.value
    })
  },

  onStatusChange(e) {
    const index = e.detail.value
    const status = this.data.breedingStatusOptions[index]
    this.setData({
      'formData.statusIndex': index,
      'formData.status': status
    })
  },

  onNotesInput(e) {
    this.setData({
      'formData.notes': e.detail.value
    })
  },

  // 提交表单
  submitForm(e) {
    const { formData } = this.data
    
    // 表单验证
    if (!formData.maleParrotId) {
      app.showError('请选择雄鸟')
      return
    }
    
    if (!formData.femaleParrotId) {
      app.showError('请选择雌鸟')
      return
    }
    
    if (formData.maleParrotId === formData.femaleParrotId) {
      app.showError('雄鸟和雌鸟不能是同一只')
      return
    }
    
    if (!formData.nestingDate) {
      app.showError('请选择筑巢日期')
      return
    }
    
    // 构建提交数据
    const submitData = {
      male_parrot_id: formData.maleParrotId,
      female_parrot_id: formData.femaleParrotId,
      mating_date: formData.nestingDate,
      egg_laying_date: formData.layingDate || null,
      hatching_date: formData.hatchingDate || null,
      egg_count: parseInt(formData.eggCount) || 0,
      chick_count: parseInt(formData.hatchedCount) || 0,
      notes: formData.notes || ''
    }
    
    // 提交数据
    app.request({
      url: '/api/records/breeding',
      method: 'POST',
      data: submitData
    }).then((res) => {
      if (res && res.success) {
        app.showSuccess('繁殖记录添加成功')
        this.hideAddForm()
        this.loadBreedingRecords()
      } else {
        app.showError((res && res.message) || '添加繁殖记录失败')
      }
    }).catch((err) => {
      console.error('添加繁殖记录失败:', err)
      app.showError('网络错误，请稍后重试')
    })
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const record = e.currentTarget.dataset.record
    // 可以导航到详情页面或显示详情弹窗
    console.log('查看记录详情:', record)
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
