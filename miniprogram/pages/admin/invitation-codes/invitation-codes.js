const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    items: [],
    newMaxUses: 30,
    creating: false,
    updatingId: null
  },

  onShow() {
    this.initAccessAndLoad()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/admin/invitation-codes', method: 'GET' })
      if (res && res.success) {
        const data = res.data || {}
        const items = data.items || []
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

  onMaxUsesInput(e) {
    const value = e.detail && e.detail.value ? e.detail.value : ''
    let n = parseInt(value, 10)
    if (!n || n <= 0) n = 30
    if (n > 999) n = 999
    this.setData({ newMaxUses: n })
  },

  async createCode() {
    if (this.data.creating) return
    const maxUses = Number(this.data.newMaxUses || 0)
    if (!maxUses || maxUses <= 0) {
      wx.showToast({ title: '次数需大于0', icon: 'none' })
      return
    }
    this.setData({ creating: true })
    try {
      const res = await app.request({
        url: '/api/admin/invitation-codes',
        method: 'POST',
        data: { max_uses: maxUses }
      })
      if (res && res.success) {
        wx.showToast({ title: '邀请码已生成', icon: 'none' })
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
    if (!code) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
    })
  },

  async toggleActive(e) {
    const id = e.currentTarget.dataset.id
    const active = !!e.currentTarget.dataset.active
    if (!id) return
    const target = !active
    this.setData({ updatingId: id })
    try {
      const res = await app.request({
        url: `/api/admin/invitation-codes/${id}`,
        method: 'PUT',
        data: { is_active: target }
      })
      if (res && res.success) {
        const list = (this.data.items || []).map(item => {
          if (item.id === id) {
            return Object.assign({}, item, { is_active: target })
          }
          return item
        })
        this.setData({ items: list })
        wx.showToast({ title: '状态已更新', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ updatingId: null })
    }
  },

  formatTime(iso) {
    try {
      return app.formatDate(iso)
    } catch (_) {
      return iso || ''
    }
  }
})

