const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    membershipEnabled: true,
    limits: { free_personal: 10, free_team: 20, pro_personal: 100, team_basic: 1000, team_advanced: 0 },
    advancedUnlimited: true,
    savingLimits: false,
    showLimitsModal: false,
    keyboardVisible: false,
    keyboardValue: '',
    keyboardTitle: '',
    editingKey: ''
  },
  onShow() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    const role = String(userInfo.role || '')
    const isSuperAdmin = role === 'super_admin'
    this.setData({ isSuperAdmin })
    if (isSuperAdmin) {
      this.loadMembershipToggle()
    }
  },
  openLimitsModal() {
    if (!this.data.isSuperAdmin) return
    this.setData({ showLimitsModal: true })
  },
  closeLimitsModal() {
    this.setData({ showLimitsModal: false })
  },
  stopPropagation() {},
  editLimit(e) {
    const key = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key
    if (!key) return
    const titleMap = {
      free_personal: '免费（个人）上限',
      free_team: '免费（团队）上限',
      pro_personal: 'Pro（个人）上限',
      team_basic: 'Team 基础版上限',
      team_advanced: 'Team 高级版上限'
    }
    const currentVal = this.data.limits[key]
    this.setData({ editingKey: key, keyboardTitle: titleMap[key] || '设置上限', keyboardValue: String(currentVal || 0), keyboardVisible: true })
  },
  onKeyboardInput(e) {
    const v = (e && e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ keyboardValue: v })
  },
  onKeyboardClose() {
    this.setData({ keyboardVisible: false })
  },
  onKeyboardSave(e) {
    const valStr = (e && e.detail && e.detail.value) ? e.detail.value : this.data.keyboardValue
    let num = parseInt(String(valStr))
    if (!Number.isFinite(num) || num < 0) num = 0
    const key = this.data.editingKey
    if (!key) { this.setData({ keyboardVisible: false }); return }
    const next = { ...this.data.limits, [key]: num }
    this.setData({ limits: next, keyboardVisible: false })
  },
  async loadMembershipToggle() {
    try {
      const res = await app.request({ url: '/api/admin/membership-toggle', method: 'GET' })
      if (res && res.success && res.data) {
        this.setData({ membershipEnabled: !!res.data.enabled })
      }
    } catch (_) {}
    try {
      const lr = await app.request({ url: '/api/admin/membership-limits', method: 'GET' })
      if (lr && lr.success && lr.data) {
        const d = lr.data
        const advUnlimited = !(d && typeof d.team_advanced === 'number' && d.team_advanced > 0)
        this.setData({ limits: d, advancedUnlimited: advUnlimited })
      }
    } catch (_) {}
  },
  async onMembershipToggleChange(e) {
    const val = !!(e && e.detail && e.detail.value)
    try {
      const res = await app.request({ url: '/api/admin/membership-toggle', method: 'PUT', data: { enabled: val } })
      if (res && res.success) {
        this.setData({ membershipEnabled: val })
        wx.showToast({ title: '已更新', icon: 'none' })
      } else {
        wx.showToast({ title: '更新失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },
  goAdminRedeemCodes() { wx.navigateTo({ url: '/pages/admin/redeem-codes/redeem-codes' }) },
  goAdminMembersManagement() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/members-management/members-management' })
  }
  ,
  onInputLimit(e) {
    const key = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key
    const v = (e && e.detail && e.detail.value) ? e.detail.value : ''
    let num = parseInt(String(v))
    if (!Number.isFinite(num) || num < 0) num = 0
    const next = { ...this.data.limits, [key]: num }
    this.setData({ limits: next })
  },
  onAdvancedUnlimitedChange(e) {
    const val = !!(e && e.detail && e.detail.value)
    this.setData({ advancedUnlimited: val })
    if (val) {
      const next = { ...this.data.limits, team_advanced: 0 }
      this.setData({ limits: next })
    }
  },
  async saveLimits() {
    if (!this.data.isSuperAdmin) return
    this.setData({ savingLimits: true })
    const payload = { ...this.data.limits }
    if (this.data.advancedUnlimited) payload.team_advanced = 0
    try {
      const res = await app.request({ url: '/api/admin/membership-limits', method: 'PUT', data: payload })
      if (res && res.success) {
        wx.showToast({ title: '已保存', icon: 'none' })
        this.setData({ showLimitsModal: false })
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ savingLimits: false })
    }
  }
})
