// pages/admin/care-guide-editor/care-guide-editor.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    rawJson: ''
  },

  onShow() { this.initAccessAndLoad() },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadConfig()
  },

  async loadConfig() {
    try {
      const res = await app.request({ url: '/api/care-guide', method: 'GET' })
      if (res && res.success) {
        const cfg = res.data || {}
        this.setData({ rawJson: JSON.stringify(cfg, null, 2) })
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  onInput(e) { this.setData({ rawJson: e.detail.value }) },

  async submitConfig() {
    let payload
    try {
      payload = JSON.parse(this.data.rawJson || '{}')
    } catch (e) {
      wx.showToast({ title: 'JSON格式错误', icon: 'none' })
      return
    }
    if (!payload.sections || !Array.isArray(payload.sections)) {
      wx.showToast({ title: '缺少sections数组', icon: 'none' })
      return
    }
    try {
      const res = await app.request({ url: '/api/care-guide', method: 'POST', data: payload })
      if (res && res.success) {
        wx.showToast({ title: '更新成功', icon: 'none' })
      } else {
        wx.showToast({ title: res && res.message ? res.message : '更新失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  }
})
