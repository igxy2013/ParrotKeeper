// pages/profile/profile.js
const app = getApp()
Page({
  data: {
    isLogin: false,
    userInfo: {},
    joinDate: '',
    roleDisplay: '',
    points: 0,

    // 模式
    userMode: 'personal',
    showModeDialog: false,
    selectedMode: 'personal',

    // 团队
    isTeamAdmin: false,
    currentTeamName: '',
    showTeamInfoModal: false,
    teamInfo: {},
    showJoinTeamModal: false,
    showCreateTeamModal: false,

    // 编辑昵称
    isEditingNickname: false,
    editNickname: '',

    // 头像
    showAvatarModal: false,
    avatarOptions: [
      '/images/default-avatar.png',
      '/images/default-avatar.svg',
      '/images/parrot-avatar-green.svg',
      '/images/parrot-avatar-blue.svg',
      '/images/parrot-avatar-orange.svg',
      '/images/parrot-avatar-purple.svg',
      '/images/parrot-avatar-red.svg',
      '/images/parrot-avatar-yellow.svg'
    ],
    selectedAvatar: '',

    // 应用设置
    notificationsEnabled: false,
    theme: 'system',
    themeDisplay: '跟随系统',
    stats: { parrotCount: 0, totalFeedings: 0, totalCheckups: 0, statsViews: 0 },
    // 团队功能暂不开放，列表置空以隐藏入口
    teamItems: [],
    menuItems: [
      { icon: '⚙️', title: '设置', desc: '个人偏好设置', bgClass: 'bg-gray', iconSrc: '/images/remix/settings-3-line.svg' },
      { icon: '🔔', title: '通知', desc: '消息提醒设置', bgClass: 'bg-blue', iconSrc: '/images/remix/ri-notification-3-line.svg' },
      { icon: '📘', title: '护理指南', desc: '鹦鹉护理知识', bgClass: 'bg-green', iconSrc: '/images/remix/ri-book-line.svg' },
      { icon: '🛠️', title: '客服支持', desc: '联系我们获取帮助', bgClass: 'bg-orange', iconSrc: '/images/remix/customer-service-2-line.svg' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解鹦鹉管家', bgClass: 'bg-indigo', iconSrc: '/images/remix/information-line.svg' },
  { icon: '📤', title: '分享应用', desc: '推荐给朋友', bgClass: 'bg-pink', iconSrc: '/images/remix/share-forward-line.svg' }
    ]
  },

  onLoad() {
    this.initUser();
    this.loadPreferences();
    this.loadOverviewStats();
  },

  // 加载统计概览用于展示统计网格（改用统一请求封装）
  async loadOverviewStats() {
    try {
      const res = await app.request({ url: '/api/statistics/overview', method: 'GET' })
      if (res.success) {
        this.setData({
          stats: {
            ...this.data.stats,
            ...res.data,
            statsViews: res.data.stats_views || 0
          }
        })
      }
    } catch (err) {
      console.error('获取统计数据失败:', err)
    }
  },

  // 检查成就解锁（改用统一请求封装）
  async checkAchievements() {
    // 团队模式下不提示、不检查解锁
    if ((app.globalData.userMode || this.data.userMode) === 'team') return
    try {
      const res = await app.request({ url: '/api/achievements/check', method: 'POST', data: {} })
      if (res.success && res.data && Array.isArray(res.data.newly_unlocked) && res.data.newly_unlocked.length > 0) {
        res.data.newly_unlocked.forEach(achievement => this.showAchievementUnlock(achievement))
        await this.loadAchievements()
      }
    } catch (err) {
      console.error('检查成就失败:', err)
    }
  },

  // 加载成就列表（改用统一请求封装）
  async loadAchievements() {
    // 团队模式下不加载成就列表
    if ((app.globalData.userMode || this.data.userMode) === 'team') {
      this.setData({ achievements: [] })
      return
    }
    try {
      const res = await app.request({ url: '/api/achievements/', method: 'GET' })
      if (res.success) {
        const mapped = Array.isArray(res.data) ? res.data.map(a => ({
          ...a,
          iconSrc: this.mapAchievementIcon(a)
        })) : []
        this.setData({ achievements: mapped })
      }
    } catch (err) {
      console.error('获取成就列表失败:', err)
    }
  },

  // 根据后端返回的成就信息映射图标
  mapAchievementIcon(a) {
    const t = (a.title || a.name || '').toLowerCase()
    const i = (a.icon || '').toLowerCase()
    if (i.includes('heart') || t.includes('heart') || t.includes('爱') || t.includes('心')) {
      return '/images/remix/ri-heart-fill-red.svg'
    }
    if (i.includes('shield') || t.includes('shield') || t.includes('健康') || t.includes('护盾')) {
      return '/images/remix/ri-shield-check-fill-blue.svg'
    }
    if (i.includes('trophy') || t.includes('trophy') || t.includes('奖杯') || t.includes('成就')) {
      return '/images/remix/ri-trophy-fill.svg'
    }
    if (i.includes('star') || t.includes('star') || t.includes('星')) {
      // 若无星形图标，复用奖杯以保证一致风格
      return '/images/remix/ri-trophy-fill-purple.svg'
    }
    return '/images/remix/ri-trophy-fill.svg'
  },

  // 显示成就解锁提示
  showAchievementUnlock(achievement) {
    // 团队模式下不提示成就解锁
    if ((app.globalData.userMode || this.data.userMode) === 'team') return
    wx.showToast({
      title: `🎉 解锁成就：${achievement.title}`,
      icon: 'none',
      duration: 3000
    });
  },

  // 团队协作点击处理（功能未开放，禁止跳转）
  onTeamItemTap() {
    wx.showToast({ title: '团队功能暂未开放', icon: 'none' })
  },

  // 功能菜单点击处理
  onMenuItemTap(e) {
    const title = e.currentTarget.dataset.title;
    if (title === '设置') {
      // 跳转到独立的应用设置页面
      wx.navigateTo({ url: '/pages/settings/settings' });
    } else if (title === '通知') {
      wx.navigateTo({ url: '/pages/settings/settings' });
    } else if (title === '护理指南') {
      wx.showToast({ title: '护理指南功能即将上线', icon: 'none' });
    } else if (title === '客服支持') {
      wx.showToast({ title: '请通过关于页面或客服渠道联系我们', icon: 'none' });
    } else if (title === '关于我们') {
      this.showAbout && this.showAbout();
    } else if (title === '分享应用') {
      wx.showShareMenu({ withShareTicket: true });
    }
  },

  // 初始化用户信息
  initUser() {
    const app = getApp();
    const isLogin = !!app.globalData.openid;
    const userInfo = app.globalData.userInfo || {};
    // 角色显示：优先使用后端提供的自定义称谓，其次映射团队角色
    const roleDisplay = userInfo.roleTitle || (app.isTeamAdmin() ? '管理员' : '成员');
    // 积分显示：优先 points，其次 score，最后回退 0
    const points = (typeof userInfo.points === 'number' ? userInfo.points :
                    typeof userInfo.score === 'number' ? userInfo.score : 0);
    this.setData({
      isLogin,
      userInfo,
      joinDate: app.formatDate(userInfo.created_at || Date.now()),
      roleDisplay,
      points,
    });
  },

  // 偏好读取
  loadPreferences() {
    try {
      const notificationsEnabled = wx.getStorageSync('pref_notifications') || false;
      const theme = wx.getStorageSync('pref_theme') || 'system';
      // 优先使用全局 userMode，其次从统一键 userMode 读取，最后回退当前值
      const storedMode = wx.getStorageSync('userMode');
      const userMode = app.globalData.userMode || storedMode || this.data.userMode;
      // 清理遗留的语言偏好存储键
      try { wx.removeStorageSync('pref_language'); } catch (_) {}
      this.setData({
        notificationsEnabled,
        theme,
        themeDisplay: this.themeLabel(theme),
        userMode,
      });
      // 读取后应用主题，以确保初次加载正确显示
      this.applyTheme(theme);
      // 跟随系统主题变化（仅当选择“system”时）
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
    const { notificationsEnabled, theme } = this.data;
    try {
      wx.setStorageSync('pref_notifications', notificationsEnabled);
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

  // 主题选择

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

  themeLabel(theme) {
    if (theme === 'light') return '浅色';
    if (theme === 'dark') return '深色';
    return '跟随系统';
  },

  applyTheme(theme) {
    // 统一设置页面根节点主题类（兼容 system）
    let themeClass = '';
    if (theme === 'light') themeClass = 'theme-light';
    else if (theme === 'dark') themeClass = 'theme-dark';
    else {
      const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
      themeClass = info && info.theme === 'dark' ? 'theme-dark' : 'theme-light';
    }
    this.setData({ pageThemeClass: themeClass });
  },

  // 导出数据
  exportData() {
    const app = getApp();
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '导出中...' });
    app.request({
      url: '/api/export',
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res && res.file_url) {
        wx.showModal({
          title: '导出成功',
          content: '是否下载导出文件？',
          success: (m) => {
            if (m.confirm) {
              wx.downloadFile({
                url: res.file_url,
                success: (d) => {
                  wx.openDocument({ filePath: d.tempFilePath });
                }
              });
            }
          }
        });
      } else {
        wx.showToast({ title: '导出失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
      console.error(err);
    });
  },

  // 其它已有的方法占位
  showAbout() {},
  showHelp() {},
  handleLogout() {},

  // 模式切换相关
  showModeSwitch() {
    this.setData({ showModeDialog: true, selectedMode: this.data.userMode });
  },
  hideModeDialog() {
    this.setData({ showModeDialog: false });
  },
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ selectedMode: mode });
  },
  confirmModeSwitch() {
    const app = getApp();
    const mode = this.data.selectedMode;
    this.setData({ userMode: mode, showModeDialog: false });
    app.setUserMode && app.setUserMode(mode);
    wx.showToast({ title: `已切换为${mode === 'personal' ? '个人模式' : '团队模式'}`, icon: 'none' });
  },

  // 胶囊按钮即时模式切换
  chooseUserMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || (mode !== 'personal' && mode !== 'team')) return;
    const app = getApp();
    this.setData({ userMode: mode });
    app.setUserMode && app.setUserMode(mode);
    wx.showToast({ title: `已切换为${mode === 'personal' ? '个人模式' : '团队模式'}`, icon: 'none' });
  },

  // 团队相关占位
  showTeamInfoModal() { this.setData({ showTeamInfoModal: true }); },
  hideTeamInfoModal() { this.setData({ showTeamInfoModal: false }); },
  goToJoinTeam() { this.setData({ showJoinTeamModal: true }); },
  hideJoinTeamModal() { this.setData({ showJoinTeamModal: false }); },
  goToCreateTeam() { this.setData({ showCreateTeamModal: true }); },
  hideCreateTeamModal() { this.setData({ showCreateTeamModal: false }); },
  confirmJoinTeam() {},
  confirmCreateTeam() {},

  // 昵称与头像
  toggleNicknameEdit() {
    const isEditing = !this.data.isEditingNickname;
    this.setData({ isEditingNickname: isEditing, editNickname: this.data.userInfo.nickname || '' });
  },
  onEditNicknameInput(e) { this.setData({ editNickname: e.detail.value }); },
  async saveNickname() {
    const app = getApp();
    const nickname = (this.data.editNickname || '').trim();
    if (!nickname) return wx.showToast({ title: '请输入昵称', icon: 'none' });
    try {
      const res = await app.request({ url: '/api/auth/profile', method: 'PUT', data: { nickname } });
      if (res && res.success) {
        const serverUser = res.data || {};
        const userInfo = { ...this.data.userInfo, ...(serverUser || {}), nickname: (serverUser.nickname || nickname) };
        // 更新本页与全局、持久化存储
        this.setData({ userInfo, isEditingNickname: false });
        try {
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
        } catch (_) {}
        wx.showToast({ title: '已保存', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.warn('保存昵称失败:', err);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },
  cancelNicknameEdit() { this.setData({ isEditingNickname: false }); },

  toggleAvatarEdit() { this.setData({ showAvatarModal: true }); },
  hideAvatarModal() { this.setData({ showAvatarModal: false }); },
  selectAvatar(e) { this.setData({ selectedAvatar: e.currentTarget.dataset.avatar }); },
  async confirmAvatarChange() {
    const app = getApp();
    const url = this.data.selectedAvatar;
    if (!url) return;
    try {
      const res = await app.request({ url: '/api/auth/profile', method: 'PUT', data: { avatar_url: url } });
      if (res && res.success) {
        const serverUser = res.data || {};
        const userInfo = { ...this.data.userInfo, ...(serverUser || {}), avatar_url: (serverUser.avatar_url || url) };
        this.setData({ userInfo, showAvatarModal: false });
        try {
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
        } catch (_) {}
        wx.showToast({ title: '头像已更新', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.message) || '头像更新失败', icon: 'none' });
      }
    } catch (err) {
      console.warn('更新头像失败:', err);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },

  // 登录
  handleLogin() {
    const app = getApp();
    app.login().then(() => {
      this.initUser();
    });
  }
});
