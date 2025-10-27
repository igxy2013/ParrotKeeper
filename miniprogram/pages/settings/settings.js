// pages/settings/settings.js
Page({
  data: {
    notificationsEnabled: false,
    language: 'zh-CN',
    languageDisplay: '简体中文',
    theme: 'system',
    themeDisplay: '跟随系统',
    pageThemeClass: '',
    showLangSheet: false
  },

  onLoad() {
    this.loadPreferences();
  },

  // 偏好读取
  loadPreferences() {
    try {
      const notificationsEnabled = wx.getStorageSync('pref_notifications') || false;
      const language = wx.getStorageSync('pref_language') || 'zh-CN';
      const theme = wx.getStorageSync('pref_theme') || 'system';
      this.setData({
        notificationsEnabled,
        language,
        languageDisplay: this.langLabel(language),
        theme,
        themeDisplay: this.themeLabel(theme),
      });
      this.applyTheme(theme);
      try {
        wx.onThemeChange && wx.onThemeChange(({ theme: sysTheme }) => {
          if (this.data.theme === 'system') {
            this.applyTheme('system');
          }
        });
      } catch (_) {}
    } catch (e) {
      console.warn('加载偏好失败', e);
    }
  },

  // 偏好保存
  savePreferences() {
    const { notificationsEnabled, language, theme } = this.data;
    try {
      wx.setStorageSync('pref_notifications', notificationsEnabled);
      wx.setStorageSync('pref_language', language);
      wx.setStorageSync('pref_theme', theme);
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

  // 语言与主题 ActionSheet
  showLanguageSheet() { this.setData({ showLangSheet: true }); },
  closeLangSheet() { this.setData({ showLangSheet: false }); },
  chooseLanguage(e) {
    const val = e.currentTarget.dataset.lang;
    const display = this.langLabel(val);
    this.setData({ language: val, languageDisplay: display });
    this.savePreferences();
    wx.showToast({ title: `语言切换为${display}` , icon: 'none' });
    this.closeLangSheet();
  },

  showThemeSheet() {
    const items = ['跟随系统', '浅色', '深色'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const map = ['system', 'light', 'dark'];
        const val = map[res.tapIndex];
        this.setData({ theme: val, themeDisplay: this.themeLabel(val) });
        this.applyTheme(val);
        this.savePreferences();
      }
    });
  },

  langLabel(lang) {
    return lang === 'en-US' ? 'English' : '简体中文';
  },
  themeLabel(theme) {
    if (theme === 'light') return '浅色';
    if (theme === 'dark') return '深色';
    return '跟随系统';
  },

  applyTheme(theme) {
    let themeClass = '';
    if (theme === 'light') themeClass = 'theme-light';
    else if (theme === 'dark') themeClass = 'theme-dark';
    else {
      const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
      themeClass = info && info.theme === 'dark' ? 'theme-dark' : 'theme-light';
    }
    this.setData({ pageThemeClass: themeClass });
  },

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
