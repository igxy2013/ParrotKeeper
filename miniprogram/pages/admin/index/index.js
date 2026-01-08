// pages/admin/index/index.js
const app = getApp()
Page({
  data: {
    isSuperAdmin: false,
    isAdminOrSuper: false
  },
  onLoad() {
    try {
      const userInfo = (app.globalData && app.globalData.userInfo) || {}
      const role = String(userInfo.role || '')
      this.setData({
        isSuperAdmin: role === 'super_admin',
        isAdminOrSuper: role === 'super_admin' || role === 'admin'
      })
    } catch (_) {
      this.setData({ isSuperAdmin: false, isAdminOrSuper: false })
    }
  },
  goAdminFeedbacks() { wx.navigateTo({ url: '/pages/admin/feedbacks/feedbacks' }) },
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
  ,
  goAdminMarketPrices() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/market-prices/market-prices' })
  },
  goAdminInvitationCodes() {
    wx.navigateTo({ url: '/pages/admin/invitation-codes/invitation-codes' })
  },
  
  goAdminRedeemCodes() {
    wx.navigateTo({ url: '/pages/admin/redeem-codes/redeem-codes' })
  },
  
  goAdminMembersManagement() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/members-management/members-management' })
  },
  
  goAdminResetRequests() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    const role = String(userInfo.role || '')
    if (!(role === 'admin' || role === 'super_admin')) {
      app.showError && app.showError('仅管理员或超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/reset-requests/reset-requests' })
  },

  goAdminUsersManagement() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    if (String(userInfo.role || '') !== 'super_admin') {
      app.showError && app.showError('仅超级管理员可进入')
      return
    }
    wx.navigateTo({ url: '/pages/admin/users-management/users-management' })
  }
})
