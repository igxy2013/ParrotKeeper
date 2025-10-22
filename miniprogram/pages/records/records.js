// pages/records/records.js
const app = getApp()

Page({
  data: {
    activeTab: 'feeding',
    isLogin: false,
    
    // 记录数据
    feedingRecords: [],
    healthRecords: [],
    cleaningRecords: [],
    
    // 筛选数据
    parrotsList: [],
    selectedParrot: '',
    selectedParrotId: '',
    dateRange: 'all',
    dateFilterText: '全部时间',
    
    // 弹窗状态
    showParrotModal: false,
    showDateModal: false,
    
    // 加载状态
    loading: false,
    
    // 分页
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.checkLoginAndLoad()
  },

  onShow() {
    this.checkLoginAndLoad()
  },

  // 检查登录状态并加载数据
  checkLoginAndLoad() {
    const isLogin = app.globalData.isLogin
    this.setData({ isLogin })
    
    if (isLogin) {
      this.loadParrotsList()
      this.loadRecords()
    } else {
      // 游客模式显示提示信息
      this.setData({
        feedingRecords: [],
        healthRecords: [],
        cleaningRecords: [],
        parrotsList: []
      })
    }
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreRecords()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true
    })
    
    try {
      await this.loadRecords(true)
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      page: 1,
      hasMore: true
    })
    this.loadRecords(true)
  },

  // 加载鹦鹉列表
  async loadParrotsList() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      
      if (res.success) {
        this.setData({
          parrotsList: res.data.parrots
        })
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
    }
  },

  // 加载记录
  async loadRecords(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      let url = ''
      let dataKey = ''
      
      switch (this.data.activeTab) {
        case 'feeding':
          url = '/api/records/feeding'
          dataKey = 'feedingRecords'
          break
        case 'health':
          url = '/api/records/health'
          dataKey = 'healthRecords'
          break
        case 'cleaning':
          url = '/api/records/cleaning'
          dataKey = 'cleaningRecords'
          break
      }
      
      const params = {
        page: refresh ? 1 : this.data.page,
        limit: 10,
        parrot_id: this.data.selectedParrotId,
        ...this.getDateRangeParams()
      }
      
      const res = await app.request({
        url,
        method: 'GET',
        data: params
      })
      
      if (res.success) {
        const newRecords = this.formatRecords(res.data.records || res.data)
        
        this.setData({
          [dataKey]: refresh ? newRecords : [...this.data[dataKey], ...newRecords],
          page: refresh ? 2 : this.data.page + 1,
          hasMore: newRecords.length === 10
        })
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      app.showError('加载失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多记录
  loadMoreRecords() {
    this.loadRecords()
  },

  // 格式化记录数据
  formatRecords(records) {
    if (!Array.isArray(records)) {
      return []
    }
    
    return records.map(record => {
      const formatted = { ...record }
      
      // 格式化时间字段
      if (record.feeding_time) {
        formatted.feeding_time_formatted = app.formatDateTime(record.feeding_time)
      }
      if (record.check_date) {
        formatted.check_date_formatted = app.formatDate(record.check_date)
      }
      if (record.cleaning_date) {
        formatted.cleaning_date_formatted = app.formatDate(record.cleaning_date)
      }
      
      return formatted
    })
  },

  // 获取日期范围参数
  getDateRangeParams() {
    const now = new Date()
    const params = {}
    
    switch (this.data.dateRange) {
      case 'today':
        params.start_date = app.formatDate(now)
        params.end_date = app.formatDate(now)
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        params.start_date = app.formatDate(weekAgo)
        params.end_date = app.formatDate(now)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        params.start_date = app.formatDate(monthAgo)
        params.end_date = app.formatDate(now)
        break
    }
    
    return params
  },

  // 显示鹦鹉筛选
  showParrotFilter() {
    this.setData({ showParrotModal: true })
  },

  // 隐藏鹦鹉筛选
  hideParrotFilter() {
    this.setData({ showParrotModal: false })
  },

  // 选择鹦鹉
  selectParrot(e) {
    const { parrot, id } = e.currentTarget.dataset
    this.setData({
      selectedParrot: parrot || '',
      selectedParrotId: id || '',
      showParrotModal: false
    })
    this.refreshData()
  },

  // 显示日期筛选
  showDateFilter() {
    this.setData({ showDateModal: true })
  },

  // 隐藏日期筛选
  hideDateFilter() {
    this.setData({ showDateModal: false })
  },

  // 选择日期范围
  selectDateRange(e) {
    const range = e.currentTarget.dataset.range
    const rangeMap = {
      'all': '全部时间',
      'today': '今天',
      'week': '最近一周',
      'month': '最近一月'
    }
    
    this.setData({
      dateRange: range,
      dateFilterText: rangeMap[range],
      showDateModal: false
    })
    this.refreshData()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭模态框
  },

  // 添加记录
  addRecord() {
    const urlMap = {
      'feeding': '/pages/records/add-feeding/add-feeding',
      'health': '/pages/records/add-health/add-health',
      'cleaning': '/pages/records/add-cleaning/add-cleaning'
    }
    
    wx.navigateTo({
      url: urlMap[this.data.activeTab]
    })
  },

  // 添加喂食记录
  addFeedingRecord() {
    wx.navigateTo({
      url: '/pages/records/add-feeding/add-feeding'
    })
  },

  // 添加健康记录
  addHealthRecord() {
    wx.navigateTo({
      url: '/pages/records/add-health/add-health'
    })
  },

  // 添加清洁记录
  addCleaningRecord() {
    wx.navigateTo({
      url: '/pages/records/add-cleaning/add-cleaning'
    })
  },

  // 编辑记录
  editRecord(e) {
    const { type, id } = e.currentTarget.dataset
    
    if (type === 'feeding') {
      wx.navigateTo({
        url: `/pages/records/edit-feeding/edit-feeding?id=${id}`
      })
    }
  },

  // 删除记录
  deleteRecord(e) {
    const { type, id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteRecord(type, id)
        }
      }
    })
  },

  // 执行删除记录
  async performDeleteRecord(type, id) {
    try {
      app.showLoading('删除中...')
      
      let url = ''
      switch (type) {
        case 'feeding':
          url = `/api/records/feeding/${id}`
          break
        case 'health':
          url = `/api/records/health/${id}`
          break
        case 'cleaning':
          url = `/api/records/cleaning/${id}`
          break
      }
      
      const res = await app.request({
        url,
        method: 'DELETE'
      })
      
      if (res.success) {
        app.showSuccess('删除成功')
        this.refreshData()
      } else {
        app.showError(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      app.showError('删除失败，请重试')
    } finally {
      app.hideLoading()
    }
  }
})