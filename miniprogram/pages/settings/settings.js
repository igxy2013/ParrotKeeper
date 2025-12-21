// pages/settings/settings.js
Page({
  data: {
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
