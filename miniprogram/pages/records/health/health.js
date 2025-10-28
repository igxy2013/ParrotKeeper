// pages/records/health/health.js
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

    // 概览统计（对齐APP：健康鹦鹉、需关注、检查次数）
    overview: {
      healthyCount: 0,
      attentionCount: 0,
      checkCount: 0
    }
  },

  onShow() {
    this.checkLoginAndLoad()
  },

  onPullDownRefresh() {
    this.loadHealthRecords(true).finally(() => wx.stopPullDownRefresh())
  },

  // 检查登录并加载数据
  checkLoginAndLoad() {
    const isLogin = app.globalData.isLogin
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ isLogin, hasOperationPermission })

    if (isLogin) {
      this.loadParrotsList()
      this.loadHealthRecords(true)
    } else {
      this.setData({ parrotsList: [], healthRecords: [] })
    }
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
        const list = Array.isArray(res.data?.parrots) ? res.data.parrots : (Array.isArray(res.data) ? res.data : [])
        this.setData({ parrotsList: list })
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
        const mappedBase = items.map(r => ({
          id: r.id,
          parrot_id: r.parrot_id || (r.parrot && r.parrot.id),
          parrot_name: r.parrot_name || (r.parrot && r.parrot.name) || '',
          parrot: r.parrot,
          record_date_formatted: app.formatDate(r.record_date),
          weight: r.weight,
          notes: r.notes,
          health_status: r.health_status,
          record_date_raw: r.record_date
        }))
        // 生成头像字段：优先使用记录中的 parrot.avatar/photo，其次从 parrotsList 匹配
        const list = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
        const mapped = mappedBase.map(r => {
          const fromRecord = r.parrot && (r.parrot.photo_url || r.parrot.avatar_url)
          let avatar = fromRecord || null
          if (!avatar) {
            const pid = r.parrot_id
            const pname = r.parrot_name
            const p = list.find(x => (pid && x.id === pid) || (pname && x.name === pname))
            avatar = p ? (p.photo_url || p.avatar_url) : null
          }
          return {
            ...r,
            parrot_avatar: avatar,
            parrot_avatars: avatar ? [avatar] : []
          }
        })
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

  // 切换鹦鹉筛选
  switchParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      selectedParrotId: id || '',
      selectedParrotName: name || '全部'
    })
    this.loadHealthRecords(true)
  },

  // 计算概览数据（健康鹦鹉、需关注、检查次数）
  computeOverview(records) {
    if (!Array.isArray(records) || records.length === 0) {
      this.setData({ overview: { healthyCount: 0, attentionCount: 0, checkCount: 0 } })
      return
    }

    let healthyCount = 0
    let attentionCount = 0
    const checkCount = records.length

    records.forEach(r => {
      const status = r.health_status
      if (status === 'healthy') {
        healthyCount += 1
      } else if (status === 'sick' || status === 'recovering' || status === 'observation') {
        attentionCount += 1
      }
    })

    this.setData({ overview: { healthyCount, attentionCount, checkCount } })
  },

  // 工具：格式化日期为 YYYY-MM-DD
  formatDateYYYYMMDD(d) {
    const y = d.getFullYear()
    const m = `${d.getMonth()+1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${dd}`
  },

  // 添加健康记录
  addHealthRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=health'
    })
  }
})
