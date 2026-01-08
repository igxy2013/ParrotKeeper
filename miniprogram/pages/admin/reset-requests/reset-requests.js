const app = getApp()

Page({
  data: {
    isAdminOrSuper: false,
    username: '',
    loading: false,
    request: null
  },

  onShow() {
    try {
      const userInfo = (app.globalData && app.globalData.userInfo) || {}
      const role = String(userInfo.role || '')
      this.setData({ isAdminOrSuper: role === 'admin' || role === 'super_admin' })
    } catch (_) {
      this.setData({ isAdminOrSuper: false })
    }
  },

  onUsernameInput(e) { this.setData({ username: (e.detail && e.detail.value) || '' }) },

  async fetchRequest() {
    if (!this.data.isAdminOrSuper) { app.showError && app.showError('仅管理员或超级管理员可进入'); return }
    const username = (this.data.username || '').trim()
    if (!username) { wx.showToast({ title: '请输入账号用户名', icon: 'none' }); return }
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/admin/reset-requests', method: 'GET', data: { username } })
      if (res && res.success) {
        const data = (res.data && res.data.request) || null
        this.setData({ request: data })
        wx.showToast({ title: res.message || '查询成功', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '查询失败', icon: 'none' })
      }
    } catch (e) {
      const msg = (e && e.message) ? String(e.message) : '查询失败'
      if (/账号不存在/.test(msg)) {
        wx.showToast({ title: '未找到该用户名，请确认输入', icon: 'none' })
      } else {
        wx.showToast({ title: msg, icon: 'none' })
      }
      this.setData({ request: null })
    } finally {
      this.setData({ loading: false })
    }
  },

  clear() { this.setData({ username: '', request: null }) },

  copyCode() {
    const code = this.data.request && this.data.request.code
    if (!code) { wx.showToast({ title: '暂无验证码', icon: 'none' }); return }
    wx.setClipboardData({ data: String(code), success: () => wx.showToast({ title: '已复制', icon: 'none' }) })
  }
})
