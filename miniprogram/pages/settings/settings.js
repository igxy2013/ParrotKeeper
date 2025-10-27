// pages/settings/settings.js
Page({
  data: {
    notificationsEnabled: false,
  },

  onLoad() {
    this.loadPreferences();
  },

  // 偏好读取
  loadPreferences() {
    try {
      const notificationsEnabled = wx.getStorageSync('pref_notifications') || false;
      this.setData({ notificationsEnabled });
      wx.setStorageSync('pref_theme', 'light');
    } catch (e) {
      console.warn('加载偏好失败', e);
    }
  },

  // 偏好保存
  savePreferences() {
    const { notificationsEnabled } = this.data;
    try {
      wx.setStorageSync('pref_notifications', notificationsEnabled);
    } catch (e) {
      console.warn('保存偏好失败', e);
    }
  },

  // 通知开关
  toggleNotifications(e) {
    const enabled = e.detail.value;
    this.setData({ notificationsEnabled: enabled });
    this.savePreferences();
    wx.showToast({ title: enabled ? '已开启通知' : '已关闭通知', icon: 'none' });
  },

  // （已移除主题相关功能）

  // 其它服务项（可逐步完善）
  exportData() {
    wx.showToast({ title: '数据导出功能即将上线', icon: 'none' });
  },
  showAbout() {
    wx.showModal({ title: '关于应用', content: '鹦鹉管家 v1.0.0\n用心呵护每一只小鹦鹉', showCancel: false });
  },
  showHelp() {
    wx.showModal({ title: '帮助反馈', content: '有问题或建议，欢迎联系我们。', showCancel: false });
  },
  handleLogout() {
    wx.showToast({ title: '已退出登录（示例）', icon: 'none' });
  }
});
