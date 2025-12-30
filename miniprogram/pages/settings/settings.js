// pages/settings/settings.js
Page({
  data: {
    iconPaths: {
      sectionSettings: '/images/remix/settings-3-line.png',
      sectionData: '/images/remix/ri-bar-chart-fill-orange.png',
      sectionAccount: '/images/remix/user-line.png',
      notifyBell: '/images/remix/notification-3-line.png',
      categoryMoney: '/images/remix/ri-money-dollar-circle-fill-green.png',
      feedRestaurant: '/images/remix/ri-restaurant-fill-orange.png',
      accountLock: '/images/remix/lock-fill.png',
      logoutClose: '/images/remix/logout-box-line-red.png',
      arrowRight: '/images/remix/arrow-right-s-line.png'
    }
  },

  onLoad() {
  },

  goToNotificationSettings() {
    wx.navigateTo({
      url: '/pages/settings/notification-settings/notification-settings'
    });
  },

  showAbout() {
    const app = getApp();
    // 直接使用全局版本号（已在 app.js 启动时从微信API获取）
    const version = app.globalData.appVersion || '未知';
    const contentText = `鹦鹉管家 v${version}\n用心呵护每一只小鹦鹉`;
    wx.showModal({
      title: '关于应用',
      content: contentText,
      showCancel: false
    });
  },

  goToCategoryManagement() {
    wx.navigateTo({ url: '/pages/settings/category-management/category-management' });
  },

  goToFeedTypeManagement() {
    wx.navigateTo({ url: '/pages/settings/feed-type-management/feed-type-management' });
  },

  goToAccountManagement() {
    wx.navigateTo({ url: '/pages/account-management/account-management' });
  },

  onSettingsIconError(e) {
    try {
      const keyPath = e.currentTarget.dataset.key
      const current = this.data.iconPaths || {}
      const next = JSON.parse(JSON.stringify(current))
      const setByPath = (obj, path, value) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i]
          if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
          cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
      }
      const getByPath = (obj, path) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length; i++) {
          cur = cur[parts[i]]
          if (cur === undefined || cur === null) return null
        }
        return cur
      }
      const replaceExt = (p, toExt) => {
        if (!p || typeof p !== 'string') return p
        return p.replace(/\.(png|svg)$/i, `.${toExt}`)
      }
      const curVal = getByPath(next, keyPath)
      if (typeof curVal === 'string') {
        setByPath(next, keyPath, replaceExt(curVal, 'svg'))
        this.setData({ iconPaths: next })
      }
    } catch (_) {}
  },

  showHelp() {
    wx.navigateTo({ url: '/pages/settings/feedback/feedback' })
  },

  handleLogout() {
    const app = getApp();
    const isLogin = !!(app.globalData.openid && app.globalData.userInfo);
    if (!isLogin) {
      wx.showToast({ title: '当前未登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      confirmText: '退出登录',
      cancelText: '取消',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          try {
            app.logout();
            wx.showToast({ title: '已退出登录', icon: 'none' });
          } catch (e) {
            wx.showToast({ title: '退出失败', icon: 'none' });
            return;
          }
          // 返回登录页（清空页面栈）
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
