const app = getApp()

Page({
  data: {
    records: [],
    activeTab: 'records'
  },

  onLoad() {
    const isLogin = app.globalData.isLogin || app.checkLoginStatus()
    if (!isLogin) {
      wx.showToast({ title: '请先登录后使用此功能', icon: 'none' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
      return
    }
  },

  onShow() {
    const isLogin = app.globalData.isLogin || app.checkLoginStatus()
    if (!isLogin) {
      wx.showToast({ title: '请先登录后使用此功能', icon: 'none' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
      return
    }
    this.loadRecords()
  },

  loadRecords() {
    try {
      const list = wx.getStorageSync('pairingRecords') || []
      this.setData({ records: list })
    } catch (_) {
      this.setData({ records: [] })
    }
  },

  formatTime(ts) {
    try {
      const d = new Date(ts)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    } catch (_) {
      return ''
    }
  },

  deleteRecord(e) {
    const idx = Number(e.currentTarget.dataset.index || 0)
    try {
      const list = wx.getStorageSync('pairingRecords') || []
      if (idx >= 0 && idx < list.length) {
        list.splice(idx, 1)
        wx.setStorageSync('pairingRecords', list)
        this.setData({ records: list })
        wx.showToast({ title: '已删除' })
      }
    } catch (_) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  clearAll() {
    wx.showModal({
      title: '清空确认',
      content: '确定清空所有配对记录？',
      success: (r) => {
        if (r.confirm) {
          try {
            wx.removeStorageSync('pairingRecords')
            this.setData({ records: [] })
            wx.showToast({ title: '已清空' })
          } catch (_) {
            wx.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  },

  goCalculator() {
    wx.navigateTo({ url: '/pages/tools/pairing-calculator/pairing-calculator' })
  },

  noop() {},

  switchTab(e) {
    const tab = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab) || ''
    if (tab === 'calculator') {
      this.goCalculator()
    } else {
      this.setData({ activeTab: 'records' })
    }
  }
})
