// pages/health-check/health-check.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    hasOperationPermission: false,

    // 筛选数据
    parrotsList: [],
    selectedParrotId: '',
    selectedParrotName: '全部',

    // 记录数据
    healthRecords: [],
    loading: false,

    // 概览统计
    overview: {
      healthyCount: 0,
      attentionCount: 0,
      checkCount: 0
    }
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  onPullDownRefresh() {
    this.loadHealthRecords(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.globalData.isLogin
    const hasOperationPermission = app.globalData.hasOperationPermission
    this.setData({ isLogin, hasOperationPermission })
    
    if (isLogin) {
      this.loadParrotsList()
      this.loadHealthRecords()
    }
  },

  // 加载鹦鹉列表
  async loadParrotsList() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET'
      })
      if (res.success) {
        this.setData({ parrotsList: res.data || [] })
      }
    } catch (e) {
      console.error('加载鹦鹉列表失败:', e)
    }
  },

  // 加载健康记录
  async loadHealthRecords(refresh = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const params = {
        page: 1,
        per_page: 50
      }
      if (this.data.selectedParrotId) {
        params.parrot_id = this.data.selectedParrotId
      }

      const res = await app.request({
        url: '/api/records/health',
        method: 'GET',
        data: params
      })

      if (res.success) {
        const items = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : [])
        const mapped = items.map(r => ({
          id: r.id,
          parrot_name: r.parrot_name || (r.parrot && r.parrot.name) || '',
          record_date_formatted: app.formatDate(r.record_date),
          weight: r.weight,
          notes: r.notes,
          symptoms: r.symptoms,
          treatment: r.treatment,
          health_status: r.health_status,
          health_status_text: r.health_status_text,
          record_date_raw: r.record_date
        }))
        this.setData({ healthRecords: mapped })
        this.computeOverview(mapped)
      }
    } catch (e) {
      console.error('加载健康记录失败:', e)
      app.showError('加载健康记录失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算概览统计
  computeOverview(records) {
    let healthyCount = 0
    let attentionCount = 0
    const checkCount = records.length

    // 统计不同健康状态的鹦鹉数量
    const parrotHealthStatus = {}
    records.forEach(record => {
      if (record.parrot_name) {
        parrotHealthStatus[record.parrot_name] = record.health_status
      }
    })

    Object.values(parrotHealthStatus).forEach(status => {
      if (status === 'healthy') {
        healthyCount++
      } else if (status === 'sick' || status === 'observation') {
        attentionCount++
      }
    })

    this.setData({
      overview: {
        healthyCount,
        attentionCount,
        checkCount
      }
    })
  },

  // 切换鹦鹉筛选
  switchParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      selectedParrotId: id,
      selectedParrotName: name
    })
    this.loadHealthRecords()
  },

  // 添加健康记录
  addHealthRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=health'
    })
  }
})