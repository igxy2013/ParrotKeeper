const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    items: [],
    createCount: 1,
    createDuration: 30,
    createTier: 'pro',
    creating: false
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
      const res = await app.request({ url: '/api/redemption/codes', method: 'GET' })
      if (res && res.success) {
        const data = res.data || {}
        const items = (data.items || []).map(it => {
          const t = String((it && (it.tier || it.membership_tier || it.subscription_tier || '')) || '').toLowerCase()
          const _tier = (t === 'pro' || t === 'team') ? t : ''
          return {
            ...it,
            _tier,
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
            tier: this.data.createTier
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

  formatTime(iso) {
      if (!iso) return '-'
      return iso.substring(0, 10)
  }
})
