// pages/profile/profile.js
const app = getApp()
Page({
  data: {
    isLogin: false,
    userInfo: {},
    isSuperAdmin: false,
    joinDate: '',
    roleDisplay: '',
    points: 0,

    // 模式
    userMode: 'personal',
    showModeDialog: false,
    selectedMode: 'personal',

    // 团队
    isTeamAdmin: false,
    isTeamOwner: false,
    currentTeamName: '',
    showTeamInfoModal: false,
    teamInfo: {},
    teamRoleDisplay: '',
    showJoinTeamModal: false,
    showCreateTeamModal: false,
    inviteCode: '',
    newTeamName: '',
    newTeamDesc: '',
    // 团队管理弹窗
    showTeamManageModal: false,
    editTeamName: '',
    editTeamDesc: '',

    // 编辑昵称
    isEditingNickname: false,
    editNickname: '',

    // 头像（直接点击上传，无弹窗）

    // 应用设置
    notificationsEnabled: false,
    theme: 'system',
    themeDisplay: '跟随系统',
    stats: { parrotCount: 0, totalFeedings: 0, totalCheckups: 0, statsViews: 0 },
    // 客服会话上下文
    contactSessionFrom: '',
    // 团队功能暂不开放，列表置空以隐藏入口
    teamItems: [],
    // 通知中心状态
    showNotifications: false,
    notifications: [],
    unreadCount: 0,
    // 应用版本号（从全局注入，展示真实小程序版本）
    appVersion: '未知',

    // 分享相关（弹窗与默认配置）
    showShareModal: false,
    shareTitle: '鹦鹉管家｜专业的鹦鹉护理助手',
    sharePath: '/pages/index/index',
    shareImageUrl: '/images/logo.png',
    shareQuery: '',

    menuItems: [
      { icon: '⚙️', title: '设置', desc: '个人偏好设置', bgClass: 'bg-gray', iconSrc: '/images/remix/settings-3-line.png' },
      { icon: '📘', title: '护理指南', desc: '鹦鹉护理知识', bgClass: 'bg-green', iconSrc: '/images/remix/ri-book-line.png' },
      { icon: '⭐', title: '积分计划', desc: '查看积分规则', bgClass: 'bg-blue', iconSrc: '/images/remix/information-line.png' },
      { icon: '🛠️', title: '客服支持', desc: '联系我们获取帮助', bgClass: 'bg-orange', iconSrc: '/images/remix/customer-service-2-line.png', isContact: true },
      { icon: '❓', title: '帮助反馈', desc: '提交问题与建议', bgClass: 'bg-amber', iconSrc: '/images/remix/feedback-line.png' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解鹦鹉管家', bgClass: 'bg-indigo', iconSrc: '/images/remix/information-line.png' },
      { icon: '📤', title: '分享应用', desc: '推荐给朋友', bgClass: 'bg-pink', iconSrc: '/images/remix/share-forward-line.png' }
    ],

    // PNG 图标（静态，失败自动回退为 SVG）
    iconPaths: {
      headerNotification: '/images/remix/ri-notification-3-line-white.png',
      cameraLine: '/images/remix/ri-camera.png',
      editLine: '/images/remix/edit-line.png',
      editLine_white: '/images/remix/edit-line-white.png',
      loginAvatar: '/images/parrot-avatar-green.png',
      sectionSettings: '/images/remix/settings-3-line.png',
      closeLine: '/images/remix/close-line.png',
      statHeartRed: '/images/remix/ri-heart-fill-red.png',
      statFeedingOrange: '/images/remix/ri-restaurant-fill-orange.png',
      statShieldBlue: '/images/remix/ri-shield-check-fill-green.png',
      userLine: '/images/remix/user-line.png',
      userFill: '/images/remix/ri-user-fill.png',
      arrowRight: '/images/remix/arrow-right-s-line.png',
      addLine: '/images/remix/ri-add-line.png',
      infoLine: '/images/remix/information-line.png',
      feedbackLine: '/images/remix/feedback-line.png'
    }
  },

  // —— 后台管理导航 ——
  goAdminFeedbacks() {
    wx.navigateTo({ url: '/pages/admin/feedbacks/feedbacks' })
  },
  goAdminCareGuideEditor() {
    wx.navigateTo({ url: '/pages/admin/care-guide-editor/care-guide-editor' })
  },
  goAdminUserRole() {
    wx.navigateTo({ url: '/pages/admin/user-role/user-role' })
  },
  goAdminAnnouncements() {
    wx.navigateTo({ url: '/pages/admin/announcements/announcements' })
  },

  goAnnouncementsCenter() {
    wx.navigateTo({ url: '/pages/announcements/center/center' })
  },

  onLoad() {
    this.initUser();
    this.loadPreferences();
    this.loadOverviewStats();
    // 如果处于团队模式，加载团队信息
    this.loadTeamInfoIfNeeded();
    // 初始化通知中心数据与回调
    this.initNotifications();
    // 注入真实版本号（优先使用后端/平台提供，其次本地）
    try {
      const v = (app.globalData && app.globalData.appVersion) ? app.globalData.appVersion : '未知'
      this.setData({ appVersion: v })
    } catch (_) {}
    // 设置客服会话上下文，便于客服识别来源与用户
    try {
      const uid = app.globalData.openid || '';
      const mode = app.globalData.userMode || this.data.userMode || 'personal';
      this.setData({
        contactSessionFrom: JSON.stringify({
          page: 'profile',
          userId: uid,
          userMode: mode
        })
      });
    } catch (_) {}
    // 启用分享到聊天与朋友圈菜单
    try {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
    } catch (_) {}
  },

  onShow() {
    try {
      const app = getApp();
      const nm = app.globalData.notificationManager;
      nm.generateDailyRemindersForToday();
      const notifications = nm.getLocalNotifications();
      const unreadCount = nm.getUnreadCount();
      this.setData({ notifications, unreadCount });

      // 页面可见期间轮询，确保跨分钟到点也能生成当天提醒
      if (this._reminderTimer) {
        clearInterval(this._reminderTimer);
      }
      this._reminderTimer = setInterval(() => {
        try {
          nm.generateDailyRemindersForToday();
          const updated = nm.getLocalNotifications();
          const updatedUnread = nm.getUnreadCount();
          this.setData({ notifications: updated, unreadCount: updatedUnread });
        } catch (_) {}
      }, 60000);
    } catch (_) {}
    // 如果已登录，刷新用户信息（包括积分）
    if (this.data.isLogin) {
      this.initUser();
    }
    // 如果处于团队模式，刷新团队信息
    this.loadTeamInfoIfNeeded();
    // 检查是否需要因模式切换刷新统计卡片
    try {
      const appInst = getApp();
      if (appInst && appInst.globalData) {
        const currentMode = appInst.globalData.userMode || this.data.userMode;
        // 同步显示的用户模式，避免切换后标签不同步
        if (currentMode && currentMode !== this.data.userMode) {
          this.setData({ userMode: currentMode });
        }
        if (appInst.globalData.needRefresh) {
          // 重置刷新标志并重新加载统计概览
          appInst.globalData.needRefresh = false;
          this.loadOverviewStats();
        }
      }
    } catch (_) {}
    // 拉取公告并注入通知（避免重复）
    this.fetchPublishedAnnouncementsAndInject()
  },

  onHide() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
    }
  },

  onUnload() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
    }
  },

  onUnload() {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.notificationUpdateCallback = null;
    }
  },

  // 加载统计概览用于展示统计网格（改用统一请求封装）
  async loadOverviewStats() {
    try {
      const res = await app.request({ url: '/api/statistics/overview', method: 'GET' })
      if (res.success && res.data) {
        const d = res.data || {}
        this.setData({
          stats: {
            ...this.data.stats,
            // 后端字段为 snake_case，这里统一映射到前端 camelCase
            parrotCount: ('total_parrots' in d) ? d.total_parrots : (('parrot_count' in d) ? d.parrot_count : 0),
            totalFeedings: ('total_feedings' in d) ? d.total_feedings : (('monthly_feeding' in d) ? d.monthly_feeding : (d.today_records && ('feeding' in d.today_records) ? d.today_records.feeding : 0)),
            totalCheckups: ('total_checkups' in d) ? d.total_checkups : (('monthly_health_checks' in d) ? d.monthly_health_checks : 0),
            statsViews: ('stats_views' in d) ? d.stats_views : (('stats_view_count' in d) ? d.stats_view_count : 0)
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

  // 菜单项图标加载失败降级为 SVG
  onMenuItemIconError(e) {
    try {
      const idx = e.currentTarget.dataset.index
      const items = (this.data.menuItems || []).slice()
      if (items[idx] && items[idx].iconSrc) {
        items[idx].iconSrc = items[idx].iconSrc.replace(/\.(png|svg)$/i, '.svg')
        this.setData({ menuItems: items })
      }
    } catch (_) {}
  },

  // 静态图标失败降级为 SVG
  onProfileIconError(e) {
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

  // 检查是否已加入团队
  hasJoinedTeam() {
    return !!(this.data.teamInfo && this.data.teamInfo.id) || !!(this.data.currentTeamName);
  },

  // 团队协作点击处理（功能未开放，禁止跳转）
  onTeamItemTap(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'current') {
      // 检查是否已加入团队
      if (!this.hasJoinedTeam()) {
        wx.showToast({ 
          title: '当前未加入任何团队，请先加入或创建团队！', 
          icon: 'none',
          duration: 2000
        });
        return;
      }
      this.showTeamInfoModal();
    } else if (action === 'join') {
      // 检查是否已加入团队
      if (this.hasJoinedTeam()) {
        wx.showModal({
          title: '已加入团队',
          content: '您当前已加入团队，如需加入其他团队，请先退出当前团队。是否前往退出？',
          confirmText: '前往退出',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.showTeamInfoModal();
            }
          }
        });
        return;
      }
      this.goToJoinTeam();
    } else if (action === 'create') {
      // 检查是否已加入团队
      if (this.hasJoinedTeam()) {
        wx.showModal({
          title: '已加入团队',
          content: '您当前已加入团队，如需创建新团队，请先退出当前团队。是否前往退出？',
          confirmText: '前往退出',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.showTeamInfoModal();
            }
          }
        });
        return;
      }
      this.goToCreateTeam();
    } else if (action === 'manage') {
      // 检查是否是团队创建者
      if (!this.data.isTeamOwner) {
        wx.showToast({ title: '仅团队创建者可访问此功能', icon: 'none' });
        return;
      }
      // 检查是否已加入团队
      if (!this.data.teamInfo.id && !this.data.currentTeamName) {
        wx.showToast({ title: '请先加入或创建团队', icon: 'none' });
        return;
      }
      wx.navigateTo({ url: '/pages/teams/manage/manage' });
    } else {
      wx.showToast({ title: '暂不支持的操作', icon: 'none' });
    }
  },

  // 功能菜单点击处理
  onMenuItemTap(e) {
    const title = e.currentTarget.dataset.title;
    if (title === '设置') {
      // 跳转到独立的应用设置页面
      wx.navigateTo({ url: '/pages/settings/settings' });
    } else if (title === '通知') {
      this.openNotifications();
    } else if (title === '护理指南') {
      wx.navigateTo({ url: '/pages/care-guide/care-guide' });
    } else if (title === '积分计划') {
      wx.navigateTo({ url: '/pages/points/plan/plan' });
    } else if (title === '客服支持') {
      // 备选处理：若未通过内置按钮触发，可给出提示
      wx.showToast({ title: '请点击该项以打开客服会话', icon: 'none' });
    } else if (title === '帮助反馈') {
      wx.navigateTo({ url: '/pages/settings/feedback/feedback' });
    } else if (title === '关于我们') {
      this.showAbout && this.showAbout();
    } else if (title === '分享应用') {
      this.showShareOptions();
    }
  },

  // —— 分享相关 ——
  showShareOptions() {
    // 打开分享弹窗，并确保系统分享菜单可见（含朋友圈）
    this.setData({ showShareModal: true });
    try {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    } catch (_) {}
  },

  hideShareOptions() { this.setData({ showShareModal: false }); },

  copyShareText() {
    const text = '推荐你试试「鹦鹉管家」——专业的鹦鹉护理助手。打开微信“小程序”，搜索“鹦鹉管家”即可使用。';
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制推荐语', icon: 'none' })
    })
  },

  onShareAppMessage() {
    const { shareTitle, sharePath, shareImageUrl, shareQuery } = this.data;
    const query = shareQuery ? (sharePath.includes('?') ? `&${shareQuery}` : `?${shareQuery}`) : '';
    return {
      title: shareTitle,
      path: `${sharePath}${query}`,
      imageUrl: shareImageUrl
    };
  },

  onShareTimeline() {
    const { shareTitle, shareQuery, shareImageUrl } = this.data;
    return {
      title: shareTitle,
      query: shareQuery || 'from=profile',
      imageUrl: shareImageUrl
    };
  },

  // 通知中心：初始化与交互
  initNotifications() {
    const app = getApp();
    const notificationManager = app.globalData.notificationManager;

    // 生成当天的定时提醒（到点后生成一次，避免重复）
    try { notificationManager.generateDailyRemindersForToday(); } catch (_) {}

    // 从本地存储加载通知与未读数
    const notifications = notificationManager.getLocalNotifications();
    const unreadCount = notificationManager.getUnreadCount();
    this.setData({ notifications, unreadCount });

    // 设置通知更新回调（页面级）
    app.globalData.notificationUpdateCallback = () => {
      const updatedNotifications = notificationManager.getLocalNotifications();
      const updatedUnreadCount = notificationManager.getUnreadCount();
      this.setData({ notifications: updatedNotifications, unreadCount: updatedUnreadCount });
    };
  },

  openNotifications() {
    this.setData({ showNotifications: true });
  },

  closeNotifications() {
    this.setData({ showNotifications: false });
  },

  markAllNotificationsRead() {
    const app = getApp();
    const notificationManager = app.globalData.notificationManager;
    notificationManager.markAllNotificationsRead();
  },

  // 拉取已发布公告并注入通知中心
  async fetchPublishedAnnouncementsAndInject() {
    const app = getApp()
    try {
      const res = await app.request({ url: '/api/announcements', method: 'GET', data: { limit: 5 } })
      if (!res || !res.success) return
      const list = (res.data && res.data.announcements) || []
      if (!Array.isArray(list) || list.length === 0) return
      let seen = []
      try { seen = wx.getStorageSync('seen_announcements') || [] } catch (_) {}
      const nm = app.globalData.notificationManager
      const newIds = []
      list.forEach(a => {
        if (!seen.includes(a.id)) {
          nm.addLocalNotification(
            'system',
            `系统公告：${a.title}`,
            (a.content || '').slice(0, 80),
            '',
            '',
            { announcementId: a.id }
          )
          newIds.push(a.id)
        }
      })
      if (newIds.length > 0) {
        try { wx.setStorageSync('seen_announcements', [...seen, ...newIds]) } catch (_) {}
      }
    } catch (e) {
      console.warn('获取公告失败', e)
    }
  },

  clearAllNotifications() {
    const app = getApp();
    const notificationManager = app.globalData.notificationManager;
    notificationManager.clearAllNotifications();
  },

  handleNotificationTap(e) {
    const { id, item } = e.detail || {};
    const app = getApp();
    const notificationManager = app.globalData.notificationManager;
    notificationManager.markNotificationRead(id);
    // 系统公告通知：跳转到公告中心并打开对应公告
    if (item && item.type === 'system' && item.announcementId) {
      try {
        wx.navigateTo({ url: `/pages/announcements/center/center?id=${item.announcementId}` });
        this.setData({ showNotifications: false });
      } catch (_) {}
    }
  },

  // 内置客服回调（open-type="contact"）
  onContact(e) {
    // 可记录 e.detail 会话来源或做统计
    wx.showToast({ title: '已打开客服会话', icon: 'none' });
  },

  // 初始化用户信息（并从后端刷新）
  async initUser() {
    const app = getApp();
    const isLogin = !!app.globalData.openid;
    const userInfo = app.globalData.userInfo || {};
    const points = (typeof userInfo.points === 'number' ? userInfo.points :
                    typeof userInfo.score === 'number' ? userInfo.score : 0);
    this.setData({
      isLogin,
      userInfo,
      isSuperAdmin: (userInfo.role === 'super_admin'),
      joinDate: app.formatDate(userInfo.created_at || Date.now()),
      roleDisplay: this.mapRoleDisplay(userInfo),
      points,
    });

    // 若已登录，则尝试从后端获取最新的用户信息（包含role等字段）
    if (isLogin) {
      try {
        const res = await app.request({ url: '/api/auth/profile', method: 'GET' });
        if (res && res.success && res.data) {
          const serverUser = res.data || {};
          const merged = { ...userInfo, ...serverUser };
          // 更新全局与本地缓存
          app.globalData.userInfo = merged;
          try { wx.setStorageSync('userInfo', merged); } catch (_) {}
          // 更新页面显示
          const points = typeof merged.points === 'number' ? merged.points : (typeof serverUser.points === 'number' ? serverUser.points : this.data.points || 0);
          this.setData({
            userInfo: merged,
            isSuperAdmin: (merged.role === 'super_admin'),
            roleDisplay: this.mapRoleDisplay(merged),
            joinDate: app.formatDate(merged.created_at || Date.now()),
            points: points,
          });
        }
      } catch (e) {
        console.warn('刷新用户信息失败:', e);
      }
    }
  },

  // 将后端角色枚举映射为展示文案
  mapRoleDisplay(userInfo) {
    const role = (userInfo && userInfo.role) || 'user';
    if (role === 'super_admin') return '超级管理员';
    if (role === 'admin') return '管理员';
    return '普通用户';
  },

  // 将团队角色枚举映射为展示文案
  mapTeamRoleDisplay(teamRole) {
    const role = teamRole || 'member';
    if (role === 'owner') return '团队所有者';
    if (role === 'admin') return '团队管理员';
    return '团队成员';
  },

  // 加载团队信息（如果处于团队模式）
  async loadTeamInfoIfNeeded() {
    const app = getApp();
    const userMode = app.globalData.userMode || this.data.userMode || 'personal';
    
    // 只在团队模式下加载团队信息
    if (userMode !== 'team') {
      return;
    }

    try {
      const res = await app.request({ url: '/api/teams/current', method: 'GET' });
      if (res && res.success && res.data) {
        const info = res.data;
        const role = info.user_role || info.role || 'member';
        this.setData({
          currentTeamName: info.name || '',
          teamInfo: info,
          isTeamAdmin: role === 'owner' || role === 'admin',
          isTeamOwner: role === 'owner',
          teamRoleDisplay: this.mapTeamRoleDisplay(role)
        });
      } else {
        // 如果没有团队信息，清空显示
        this.setData({
          currentTeamName: '',
          teamInfo: {},
          teamRoleDisplay: '',
          isTeamOwner: false,
          isTeamAdmin: false
        });
      }
    } catch (err) {
      console.warn('加载团队信息失败:', err);
      // 失败时清空显示
      this.setData({
        currentTeamName: '',
        teamInfo: {},
        teamRoleDisplay: '',
        isTeamOwner: false,
        isTeamAdmin: false
      });
    }
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

  // 关于我们：展示版本与说明
  showAbout() {
    const app = getApp()

    const showModalWithVersion = (version) => {
      const contentText = `鹦鹉管家 v${version}\n用心呵护每一只小鹦鹉\n如需帮助，请使用“客服支持”菜单联系我们。\n我们重视隐私，仅收集必要数据用于改善服务。`
      wx.showModal({
        title: '关于我们',
        content: contentText,
        showCancel: false
      })
    }

    // 优先从后端健康检查接口获取版本号，失败则回退到本地版本
    app.request({ url: '/api/health' })
      .then(res => {
        const version = (res && res.version) ? res.version : (app.globalData.appVersion || '未知')
        showModalWithVersion(version)
      })
      .catch(() => {
        const version = app.globalData.appVersion || '未知'
        showModalWithVersion(version)
      })
  },
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
    // 切换后立即刷新统计卡片，并处理团队信息显示
    if (mode === 'team') {
      this.loadTeamInfoIfNeeded();
    } else {
      this.setData({
        teamRoleDisplay: '',
        currentTeamName: '',
        teamInfo: {},
        isTeamOwner: false,
        isTeamAdmin: false
      });
    }
    this.loadOverviewStats();
  },

  // 胶囊按钮即时模式切换
  chooseUserMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || (mode !== 'personal' && mode !== 'team')) return;
    const app = getApp();
    this.setData({ userMode: mode });
    app.setUserMode && app.setUserMode(mode);
    wx.showToast({ title: `已切换为${mode === 'personal' ? '个人模式' : '团队模式'}`, icon: 'none' });
    // 如果切换到团队模式，加载团队信息
    if (mode === 'team') {
      this.loadTeamInfoIfNeeded();
    } else {
      // 切换到个人模式时清空团队信息显示
      this.setData({
        teamRoleDisplay: '',
        currentTeamName: '',
        teamInfo: {},
        isTeamOwner: false,
        isTeamAdmin: false
      });
    }
    // 切换后立即刷新统计卡片
    this.loadOverviewStats();
  },

  // 团队相关占位
  showTeamInfoModal() {
    // 打开弹窗
    this.setData({ showTeamInfoModal: true });
    // 拉取当前团队基本信息
    const app = getApp();
    app.request({ url: '/api/teams/current', method: 'GET' })
      .then(res => {
        if (res && res.success && res.data) {
          const info = res.data;
          const role = info.user_role || info.role || 'member';
          this.setData({
            currentTeamName: info.name || '',
            teamInfo: info,
            isTeamAdmin: role === 'owner' || role === 'admin',
            isTeamOwner: role === 'owner',
            teamRoleDisplay: this.mapTeamRoleDisplay(role)
          });
          // 继续拉取详细信息（包含邀请码、成员等）
          if (info.id) {
            return app.request({ url: `/api/teams/${info.id}`, method: 'GET' });
          }
        }
        return null;
      })
      .then(detail => {
        if (detail && detail.success && detail.data) {
          const d = detail.data;
          const role = d.user_role || d.role || 'member';
          this.setData({
            teamInfo: d,
            currentTeamName: d.name || this.data.currentTeamName,
            isTeamAdmin: role === 'owner' || role === 'admin',
            isTeamOwner: role === 'owner',
            teamRoleDisplay: this.mapTeamRoleDisplay(role)
          });
        }
      })
      .catch(err => {
        console.warn('获取团队信息失败:', err);
      });
  },
  hideTeamInfoModal() { this.setData({ showTeamInfoModal: false }); },
  // 团队管理弹窗
  async showTeamManageModal() {
    // 打开弹窗
    this.setData({ showTeamManageModal: true });
    const app = getApp();
    try {
      // 若当前信息为空，先拉取当前团队基础信息
      if (!this.data.teamInfo || !this.data.teamInfo.id) {
        const cur = await app.request({ url: '/api/teams/current', method: 'GET' });
        if (cur && cur.success && cur.data) {
          const role = cur.data.user_role || cur.data.role;
          this.setData({
            teamInfo: cur.data,
            currentTeamName: cur.data.name || '',
            isTeamAdmin: role === 'owner' || role === 'admin',
            isTeamOwner: role === 'owner'
          });
        }
      }
      // 继续拉取详细信息（包含成员与邀请码）
      const teamId = this.data.teamInfo && this.data.teamInfo.id;
      if (teamId) {
        const detail = await app.request({ url: `/api/teams/${teamId}`, method: 'GET' });
        if (detail && detail.success && detail.data) {
          const d = detail.data;
          const role = d.user_role || d.role;
          this.setData({
            teamInfo: d,
            currentTeamName: d.name || this.data.currentTeamName,
            isTeamAdmin: role === 'owner' || role === 'admin',
            isTeamOwner: role === 'owner',
            // 预填编辑字段
            editTeamName: d.name || '',
            editTeamDesc: d.description || ''
          });
        } else {
          // 兜底预填
          this.setData({
            editTeamName: this.data.currentTeamName || '',
            editTeamDesc: (this.data.teamInfo && this.data.teamInfo.description) || ''
          });
        }
      }
    } catch (err) {
      console.warn('打开团队管理弹窗失败:', err);
    }
  },
  hideTeamManageModal() { this.setData({ showTeamManageModal: false }); },
  onEditTeamNameInput(e) { this.setData({ editTeamName: (e.detail.value || '').trim() }); },
  onEditTeamDescInput(e) { this.setData({ editTeamDesc: e.detail.value || '' }); },
  async confirmUpdateTeam() {
    const app = getApp();
    const teamId = this.data.teamInfo && this.data.teamInfo.id;
    if (!teamId) {
      return wx.showToast({ title: '无法识别当前团队', icon: 'none' });
    }
    if (!this.data.isTeamAdmin) {
      return wx.showToast({ title: '仅管理员可修改团队信息', icon: 'none' });
    }
    const name = (this.data.editTeamName || '').trim();
    const description = (this.data.editTeamDesc || '').trim();
    if (!name) {
      return wx.showToast({ title: '请输入团队名称', icon: 'none' });
    }
    app.showLoading('正在更新团队信息...');
    try {
      const res = await app.request({ url: `/api/teams/${teamId}`, method: 'PUT', data: { name, description } });
      app.hideLoading();
      if (res && res.success) {
        // 更新本地状态
        const teamInfo = Object.assign({}, this.data.teamInfo, { name, description });
        this.setData({ teamInfo, currentTeamName: name });
        wx.showToast({ title: '已保存团队信息', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' });
      }
    } catch (e) {
      app.hideLoading();
      console.error('更新团队信息失败:', e);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },
  goToJoinTeam() {
    // 检查是否已加入团队
    if (this.hasJoinedTeam()) {
      wx.showModal({
        title: '已加入团队',
        content: '您当前已加入团队，如需加入其他团队，请先退出当前团队。是否前往退出？',
        confirmText: '前往退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.showTeamInfoModal();
          }
        }
      });
      return;
    }
    this.setData({ showJoinTeamModal: true, inviteCode: '' });
  },
  hideJoinTeamModal() { this.setData({ showJoinTeamModal: false }); },
  goToCreateTeam() {
    // 检查是否已加入团队
    if (this.hasJoinedTeam()) {
      wx.showModal({
        title: '已加入团队',
        content: '您当前已加入团队，如需创建新团队，请先退出当前团队。是否前往退出？',
        confirmText: '前往退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.showTeamInfoModal();
          }
        }
      });
      return;
    }
    this.setData({ showCreateTeamModal: true, newTeamName: '', newTeamDesc: '' });
  },
  hideCreateTeamModal() { this.setData({ showCreateTeamModal: false }); },
  // 阻止弹窗容器点击冒泡导致关闭
  preventClose() {},

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

  // 直接选择并上传头像
  async chooseAvatarPhoto() {
    const app = getApp();
    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });
      if (!chooseRes || !chooseRes.tempFiles || !chooseRes.tempFiles.length) {
        return;
      }
      const filePath = chooseRes.tempFiles[0].tempFilePath || chooseRes.tempFiles[0].tempFilePath || chooseRes.tempFiles[0].filePath;

      app.showLoading('正在上传头像...');
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: (app.globalData.baseUrl || '') + '/api/upload/image',
          filePath,
          name: 'file',
          formData: { category: 'avatars' },
          header: {
            'X-OpenID': app.globalData.openid || '',
            'X-User-Mode': app.globalData.userMode || 'personal'
          },
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      app.hideLoading();

      if (uploadRes.statusCode !== 200) {
        return wx.showToast({ title: '上传失败', icon: 'none' });
      }
      let payload = {};
      try { payload = JSON.parse(uploadRes.data || '{}'); } catch (_) { payload = {}; }
      if (!payload || !payload.success || !payload.data || !payload.data.url) {
        return wx.showToast({ title: (payload && payload.message) || '上传失败', icon: 'none' });
      }

      const resolvedUrl = app.resolveUploadUrl(payload.data.url);
      // 立即调用后端更新头像
      const updateRes = await app.request({ url: '/api/auth/profile', method: 'PUT', data: { avatar_url: resolvedUrl } });
      if (updateRes && updateRes.success) {
        const serverUser = updateRes.data || {};
        const userInfo = { ...this.data.userInfo, ...(serverUser || {}), avatar_url: (serverUser.avatar_url || resolvedUrl) };
        this.setData({ userInfo });
        try {
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
        } catch (_) {}
        wx.showToast({ title: '头像已更新', icon: 'none' });
      } else {
        wx.showToast({ title: (updateRes && updateRes.message) || '头像更新失败', icon: 'none' });
      }
    } catch (e) {
      app.hideLoading();
      console.error('选择或上传头像失败:', e);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 通用：阻止弹窗冒泡关闭
  preventClose() {},

  // 加入/创建团队交互占位：输入与确认
  onInviteCodeInput(e) { this.setData({ inviteCode: (e.detail.value || '').trim() }); },
  async confirmJoinTeam() {
    // 检查是否已加入团队
    if (this.hasJoinedTeam()) {
      wx.showModal({
        title: '已加入团队',
        content: '您当前已加入团队，如需加入其他团队，请先退出当前团队。是否前往退出？',
        confirmText: '前往退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showJoinTeamModal: false });
            this.showTeamInfoModal();
          }
        }
      });
      return;
    }

    const app = getApp();
    const code = (this.data.inviteCode || '').trim();
    if (!code) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' });
    }

    app.showLoading('正在加入团队...');
    try {
      const res = await app.request({ url: '/api/teams/join', method: 'POST', data: { invite_code: code } });
      app.hideLoading();
      if (res && res.success) {
        // 成功加入：更新模式与团队信息
        const role = res.data && (res.data.role || res.data.user_role);
        this.setData({
          showJoinTeamModal: false,
          inviteCode: '',
          currentTeamName: (res.data && res.data.team_name) || this.data.currentTeamName,
          isTeamAdmin: role === 'owner' || role === 'admin',
          isTeamOwner: role === 'owner',
          teamRoleDisplay: this.mapTeamRoleDisplay(role)
        });

        // 切换到团队模式
        this.setData({ userMode: 'team' });
        app.setUserMode && app.setUserMode('team');

        // 进一步刷新当前团队详情
        try {
          const cur = await app.request({ url: '/api/teams/current', method: 'GET' });
          if (cur && cur.success && cur.data) {
            const teamRole = cur.data.user_role || cur.data.role || 'member';
            this.setData({ 
              teamInfo: cur.data, 
              currentTeamName: cur.data.name,
              teamRoleDisplay: this.mapTeamRoleDisplay(teamRole),
              isTeamOwner: teamRole === 'owner',
              isTeamAdmin: teamRole === 'owner' || teamRole === 'admin'
            });
          }
        } catch (_) {}

        wx.showToast({ title: '加入团队成功', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.message) || '加入团队失败', icon: 'none' });
      }
    } catch (err) {
      app.hideLoading();
      console.error('加入团队失败:', err);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },

  // 复制邀请码
  copyInviteCode() {
    const code = (this.data.teamInfo && this.data.teamInfo.invite_code) || '';
    if (!code) {
      return wx.showToast({ title: '暂无邀请码', icon: 'none' });
    }
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' })
    });
  },

  // 退出团队（非创建者）
  async confirmLeaveTeam() {
    const app = getApp();
    const teamId = this.data.teamInfo && this.data.teamInfo.id;
    if (!teamId) {
      return wx.showToast({ title: '无法识别当前团队', icon: 'none' });
    }

    wx.showModal({
      title: '确认退出团队',
      content: '退出后将无法访问团队数据，确定要退出吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        app.showLoading('正在退出团队...');
        try {
          const resp = await app.request({ url: `/api/teams/${teamId}/leave`, method: 'POST' });
          app.hideLoading();
          if (resp && resp.success) {
            // 切回个人模式，清理团队信息
            this.setData({
              showTeamInfoModal: false,
              userMode: 'personal',
              currentTeamName: '',
              teamInfo: {},
              teamRoleDisplay: '',
              isTeamOwner: false,
              isTeamAdmin: false
            });
            app.setUserMode && app.setUserMode('personal');
            wx.showToast({ title: '已退出团队', icon: 'none' });
          } else {
            wx.showToast({ title: (resp && resp.message) || '退出团队失败', icon: 'none' });
          }
        } catch (e) {
          app.hideLoading();
          console.error('退出团队失败:', e);
          wx.showToast({ title: '网络或服务器错误', icon: 'none' });
        }
      }
    });
  },

  // 切换成员角色：admin <-> member（仅管理员/所有者可操作）
  async changeMemberRole(e) {
    const app = getApp();
    const teamId = this.data.teamInfo && this.data.teamInfo.id;
    const userId = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userId;
    if (!teamId || !userId) {
      return wx.showToast({ title: '参数缺失，无法操作', icon: 'none' });
    }

    const members = (this.data.teamInfo && this.data.teamInfo.members) || [];
    const target = members.find(m => String(m.id) === String(userId));
    if (!target) {
      return wx.showToast({ title: '成员不存在', icon: 'none' });
    }
    if (target.role === 'owner') {
      return wx.showToast({ title: '不能修改创建者角色', icon: 'none' });
    }

    const newRole = target.role === 'admin' ? 'member' : 'admin';
    app.showLoading('正在更新角色...');
    try {
      const resp = await app.request({ url: `/api/teams/${teamId}/members/${userId}/role`, method: 'PUT', data: { role: newRole } });
      app.hideLoading();
      if (resp && resp.success) {
        // 本地更新角色
        const updatedMembers = members.map(m => {
          if (String(m.id) === String(userId)) { return { ...m, role: newRole }; }
          return m;
        });
        this.setData({ teamInfo: { ...this.data.teamInfo, members: updatedMembers } });
        wx.showToast({ title: '角色更新成功', icon: 'none' });
      } else {
        wx.showToast({ title: (resp && resp.message) || '角色更新失败', icon: 'none' });
      }
    } catch (e) {
      app.hideLoading();
      console.error('更新角色失败:', e);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },

  // 移除团队成员（仅管理员/所有者可操作）
  async removeMember(e) {
    const app = getApp();
    const teamId = this.data.teamInfo && this.data.teamInfo.id;
    const userId = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userId;
    if (!teamId || !userId) {
      return wx.showToast({ title: '参数缺失，无法操作', icon: 'none' });
    }

    const members = (this.data.teamInfo && this.data.teamInfo.members) || [];
    const target = members.find(m => String(m.id) === String(userId));
    if (!target) {
      return wx.showToast({ title: '成员不存在', icon: 'none' });
    }
    if (target.role === 'owner') {
      return wx.showToast({ title: '不能移除创建者', icon: 'none' });
    }

    wx.showModal({
      title: '移除成员',
      content: `确定要移除成员“${target.nickname || ''}”吗？`,
      confirmText: '移除',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        app.showLoading('正在移除成员...');
        try {
          const resp = await app.request({ url: `/api/teams/${teamId}/members/${userId}`, method: 'DELETE' });
          app.hideLoading();
          if (resp && resp.success) {
            const updatedMembers = members.filter(m => String(m.id) !== String(userId));
            const newCount = Math.max(0, (this.data.teamInfo.member_count || updatedMembers.length));
            this.setData({ teamInfo: { ...this.data.teamInfo, members: updatedMembers, member_count: newCount } });
            wx.showToast({ title: '已移除成员', icon: 'none' });
          } else {
            wx.showToast({ title: (resp && resp.message) || '移除成员失败', icon: 'none' });
          }
        } catch (e) {
          app.hideLoading();
          console.error('移除成员失败:', e);
          wx.showToast({ title: '网络或服务器错误', icon: 'none' });
        }
      }
    });
  },
  onNewTeamNameInput(e) { this.setData({ newTeamName: (e.detail.value || '').trim() }); },
  onNewTeamDescInput(e) { this.setData({ newTeamDesc: e.detail.value || '' }); },
  async confirmCreateTeam() {
    // 检查是否已加入团队
    if (this.hasJoinedTeam()) {
      wx.showModal({
        title: '已加入团队',
        content: '您当前已加入团队，如需创建新团队，请先退出当前团队。是否前往退出？',
        confirmText: '前往退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showCreateTeamModal: false });
            this.showTeamInfoModal();
          }
        }
      });
      return;
    }

    const app = getApp();
    const name = (this.data.newTeamName || '').trim();
    const description = (this.data.newTeamDesc || '').trim();
    if (!name) {
      return wx.showToast({ title: '请输入团队名称', icon: 'none' });
    }

    app.showLoading('正在创建团队...');
    try {
      const res = await app.request({ url: '/api/teams', method: 'POST', data: { name, description } });
      app.hideLoading();
      if (res && res.success) {
        // 更新页面状态与团队信息
        this.setData({
          showCreateTeamModal: false,
          currentTeamName: res.data && res.data.name || name,
          teamInfo: {
            id: res.data && res.data.id,
            description: (res.data && res.data.description) || description,
            invite_code: res.data && res.data.invite_code
          },
          isTeamAdmin: true,
          isTeamOwner: true,
          teamRoleDisplay: this.mapTeamRoleDisplay('owner')
        });

        // 切换为团队模式并持久化到后端
        this.setData({ userMode: 'team' });
        app.setUserMode && app.setUserMode('team');

        // 尝试刷新当前团队详情（补充成员数量等）
        try {
          const cur = await app.request({ url: '/api/teams/current', method: 'GET' });
          if (cur && cur.success && cur.data) {
            const teamRole = cur.data.user_role || cur.data.role || 'owner';
            this.setData({
              currentTeamName: cur.data.name,
              teamInfo: cur.data,
              teamRoleDisplay: this.mapTeamRoleDisplay(teamRole),
              isTeamOwner: teamRole === 'owner',
              isTeamAdmin: teamRole === 'owner' || teamRole === 'admin'
            });
          }
        } catch (_) {}

        wx.showToast({ title: '团队创建成功', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.message) || '创建团队失败', icon: 'none' });
      }
    } catch (err) {
      app.hideLoading();
      console.error('创建团队失败:', err);
      wx.showToast({ title: '网络或服务器错误', icon: 'none' });
    }
  },

  // 登录
  handleLogin() {
    const app = getApp();
    app.login().then((user) => {
      this.initUser();
      // 如果登录消息中包含签到信息，已在app.js中显示提示
    }).catch((err) => {
      console.error('登录失败:', err);
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    });
  }
});
