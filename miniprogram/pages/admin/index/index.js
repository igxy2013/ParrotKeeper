// pages/admin/index/index.js
const app = getApp()
Page({
  data: {
    isSuperAdmin: false
  },
  onLoad() {
    try {
      const userInfo = (app.globalData && app.globalData.userInfo) || {}
      this.setData({ isSuperAdmin: String(userInfo.role || '') === 'super_admin' })
    } catch (_) {
      this.setData({ isSuperAdmin: false })
    }
  },
  goAdminFeedbacks() { wx.navigateTo({ url: '/pages/admin/feedbacks/feedbacks' }) },
  goAdminCareGuideEditor() { wx.navigateTo({ url: '/pages/admin/care-guide-editor/care-guide-editor' }) },
  goAdminUserRole() { wx.navigateTo({ url: '/pages/admin/user-role/user-role' }) },
  goAdminAnnouncements() { wx.navigateTo({ url: '/pages/admin/announcements/announcements' }) },
  goAdminApiConfigs() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/api-configs/api-configs' })
  },
  goAdminParrotSpecies() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/parrot-species/parrot-species' })
  },
  goAdminIncubationSuggestions() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/incubation-suggestions/incubation-suggestions' })
  }
})
