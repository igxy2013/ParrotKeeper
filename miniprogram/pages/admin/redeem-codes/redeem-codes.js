const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    items: [],
    createCount: 1,
    createDuration: 30,
    createTier: 'pro',
    createTeamLevel: 'basic',
    creating: false,
    statusFilter: 'all'
  },

  onShow() {
    this.initAccessAndLoad()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  initAccessAndLoad() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    const isSuperAdmin = userInfo.role === 'super_admin'
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/redemption/codes', method: 'GET', data: { status: this.data.statusFilter } })
      if (res && res.success) {
        const data = res.data || {}
        const items = (data.items || []).map(it => {
          const t = String((it && (it.tier || it.membership_tier || it.subscription_tier || '')) || '').toLowerCase()
          const _tier = (t === 'pro' || t === 'team') ? t : ''
          const lvl = String(it && it.team_level || '').toLowerCase()
          const _team_label = _tier === 'team' ? (lvl === 'advanced' ? '团队高级版' : (lvl === 'basic' ? '团队基础版' : '团队版')) : '专业版'
          return {
            ...it,
            _tier,
            _team_label,
            _used_at: this.formatTime(it.used_at),
            _created_at: this.formatTime(it.created_at)
          }
        })
        this.setData({ items })
      } else {
        wx.showToast({ title: (res && res.message) || '加载失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onStatusFilterTap(e) {
    const s = e.currentTarget.dataset.status
    if (!s) return
    this.setData({ statusFilter: s })
    this.loadList()
  },

  onCountInput(e) {
    let n = parseInt(e.detail.value, 10)
    if (!n || n <= 0) n = 1
    if (n > 100) n = 100
    this.setData({ createCount: n })
  },
  
  onDurationInput(e) {
    let n = parseInt(e.detail.value, 10)
    if (!n || n <= 0) n = 1
    this.setData({ createDuration: n })
  },

  onTierTap(e) {
    const tier = e.currentTarget.dataset.tier
    if (!tier) return
    this.setData({ createTier: tier })
  },
  onTeamLevelTap(e) {
    const lv = e.currentTarget.dataset.level
    if (!lv) return
    this.setData({ createTeamLevel: lv })
  },

  onPresetDurationTap(e) {
    const d = parseInt(e.currentTarget.dataset.duration, 10)
    if (!d || d <= 0) return
    this.setData({ createDuration: d })
  },

  async createCodes() {
    if (this.data.creating) return
    
    this.setData({ creating: true })
    try {
      const res = await app.request({
        url: '/api/redemption/codes',
        method: 'POST',
        data: { 
            count: this.data.createCount,
            duration_days: this.data.createDuration,
            tier: this.data.createTier,
            team_level: this.data.createTier === 'team' ? this.data.createTeamLevel : undefined
        }
      })
      if (res && res.success) {
        wx.showToast({ title: `成功生成 ${res.data.count} 个`, icon: 'none' })
        this.loadList()
      } else {
        wx.showToast({ title: (res && res.message) || '生成失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ creating: false })
    }
  },

  copyCode(e) {
    const code = e.currentTarget.dataset.code
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '已复制', icon: 'none' })
    })
  },

  deleteCode(e) {
    const id = e.currentTarget.dataset.id
    const code = e.currentTarget.dataset.code
    const status = e.currentTarget.dataset.status || ''
    if (!id && !code) return
    const content = status === 'used' ? '该兑换码已使用，删除后历史记录不可见，确定删除？' : '确定删除该兑换码吗？'
    const url = code ? `/api/redemption/codes/${encodeURIComponent(code)}` : `/api/redemption/codes/${id}`
    wx.showModal({
      title: '确认删除',
      content,
      success: (r) => {
        if (r.confirm) {
          app.request({ url, method: 'DELETE' })
            .then(() => { wx.showToast({ title: '已删除' }); this.loadList() })
            .catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
        }
      }
    })
  },

  formatTime(iso) {
      if (!iso) return '-'
      return iso.substring(0, 10)
  }
})
