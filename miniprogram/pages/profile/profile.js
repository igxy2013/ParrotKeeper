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
      '/images/avatar-1.png',
      '/images/avatar-2.png',
      '/images/avatar-3.png'
    ],
    selectedAvatar: '',

    // 应用设置
    notificationsEnabled: false,
    theme: 'system',
    themeDisplay: '跟随系统',
    stats: { parrotCount: 0, totalFeedings: 0, totalCheckups: 0, statsViews: 0 },
    achievements: [], // 改为空数组，从后端加载
    teamItems: [
      { icon: '👥', title: '当前团队', desc: '查看团队成员', bgClass: 'bg-blue' },
      { icon: '➕', title: '加入团队', desc: '通过邀请码加入团队', bgClass: 'bg-green' },
      { icon: '👨‍👩‍👧‍👦', title: '创建团队', desc: '创建新的团队并邀请成员', bgClass: 'bg-purple' },
      { icon: '⚙️', title: '团队管理', desc: '管理团队成员和设置', bgClass: 'bg-orange' }
    ],
    menuItems: [
      { icon: '⚙️', title: '设置', desc: '个人偏好设置', bgClass: 'bg-gray' },
      { icon: '📘', title: '护理指南', desc: '鹦鹉护理知识', bgClass: 'bg-green' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解鹦鹉管家', bgClass: 'bg-indigo' },
      { icon: '📤', title: '分享应用', desc: '推荐给朋友', bgClass: 'bg-pink' }
    ]
  },

  onLoad() {
    this.initUser();
    this.loadPreferences();
    this.loadOverviewStats();
    // 团队模式下不加载成就内容
    if ((app.globalData.userMode || this.data.userMode) !== 'team') {
      this.loadAchievements();
    } else {
      // 确保成就列表为空
      this.setData({ achievements: [] });
    }
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
        // 团队模式下不检查成就
        if ((app.globalData.userMode || this.data.userMode) !== 'team') {
          this.checkAchievements()
        }
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
      const res = await app.request({ url: '/api/achievements', method: 'GET' })
      if (res.success) {
        this.setData({ achievements: res.data })
      }
    } catch (err) {
      console.error('获取成就列表失败:', err)
    }
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

  // 团队协作点击处理
  onTeamItemTap(e) {
    const title = e.currentTarget.dataset.title;
    if (title === '当前团队') {
      wx.navigateTo({ url: '/pages/teams/teams' });
    } else if (title === '加入团队') {
      wx.navigateTo({ url: '/pages/teams/join/join' });
    } else if (title === '创建团队') {
      wx.navigateTo({ url: '/pages/teams/create/create' });
    } else if (title === '团队管理') {
      wx.navigateTo({ url: '/pages/teams/settings/settings' });
    }
  },

  // 功能菜单点击处理
  onMenuItemTap(e) {
    const title = e.currentTarget.dataset.title;
    if (title === '设置') {
      // 跳转到独立的应用设置页面
      wx.navigateTo({ url: '/pages/settings/settings' });
    } else if (title === '护理指南') {
      wx.showToast({ title: '护理指南功能即将上线', icon: 'none' });
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
  saveNickname() {
    const app = getApp();
    const nickname = (this.data.editNickname || '').trim();
    if (!nickname) return wx.showToast({ title: '请输入昵称', icon: 'none' });
    app.request({ url: '/api/me', method: 'PUT', data: { nickname } }).then(() => {
      const userInfo = { ...this.data.userInfo, nickname };
      this.setData({ userInfo, isEditingNickname: false });
      wx.showToast({ title: '已保存', icon: 'none' });
    });
  },
  cancelNicknameEdit() { this.setData({ isEditingNickname: false }); },

  toggleAvatarEdit() { this.setData({ showAvatarModal: true }); },
  hideAvatarModal() { this.setData({ showAvatarModal: false }); },
  selectAvatar(e) { this.setData({ selectedAvatar: e.currentTarget.dataset.avatar }); },
  confirmAvatarChange() {
    const app = getApp();
    const url = this.data.selectedAvatar;
    if (!url) return;
    app.request({ url: '/api/me', method: 'PUT', data: { avatar_url: url } }).then(() => {
      const userInfo = { ...this.data.userInfo, avatar_url: url };
      this.setData({ userInfo, showAvatarModal: false });
      wx.showToast({ title: '头像已更新', icon: 'none' });
    });
  },

  // 登录
  handleLogin() {
    const app = getApp();
    app.login().then(() => {
      this.initUser();
    });
  }
});
