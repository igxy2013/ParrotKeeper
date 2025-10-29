// pages/settings/settings.js
Page({
  data: {
    // 通知设置（规范化对象存储，便于统一读写）
    notificationSettings: {
      enabled: false,
      feedingReminder: true,
      healthReminder: true,
      cleaningReminder: true,
      medicationReminder: true,
      breedingReminder: true
    },
    notificationsEnabled: false,
    feedingReminder: true,
    healthReminder: true,
    cleaningReminder: true,
    medicationReminder: true,
    breedingReminder: true,
    // 每日提醒时间
    feedingReminderTime: '08:00',
    cleaningReminderTime: '18:00',
    // 模板ID配置有效性（用于提示与按钮可用态）
    hasTemplateIds: false
  },

  onLoad() {
    this.loadPreferences();
  },

  // 加载用户偏好设置
  loadPreferences() {
    try {
      const app = getApp()
      const notificationManager = app.globalData.notificationManager
      const { hasValidTemplateIds } = require('../../utils/template-config')
      
      // 加载通知设置
      const notificationSettings = notificationManager.getNotificationSettings()
      
      this.setData({
        notificationSettings,
        notificationsEnabled: notificationSettings.enabled,
        feedingReminder: notificationSettings.feedingReminder,
        healthReminder: notificationSettings.healthReminder,
        cleaningReminder: notificationSettings.cleaningReminder,
        medicationReminder: notificationSettings.medicationReminder,
        breedingReminder: notificationSettings.breedingReminder,
        feedingReminderTime: notificationSettings.feedingReminderTime || '08:00',
        cleaningReminderTime: notificationSettings.cleaningReminderTime || '18:00',
        hasTemplateIds: !!hasValidTemplateIds()
      })

      // 同步后端提醒设置（若已登录）
      this.syncServerReminderSettings()
    } catch (error) {
      console.error('加载偏好设置失败:', error)
    }
  },

  // 保存用户偏好设置
  savePreferences() {
    try {
      const app = getApp()
      const notificationManager = app.globalData.notificationManager
      
      // 保存通知设置
      const notificationSettings = {
        enabled: this.data.notificationsEnabled,
        feedingReminder: this.data.feedingReminder,
        healthReminder: this.data.healthReminder,
        cleaningReminder: this.data.cleaningReminder,
        medicationReminder: this.data.medicationReminder,
        breedingReminder: this.data.breedingReminder,
        feedingReminderTime: this.data.feedingReminderTime,
        cleaningReminderTime: this.data.cleaningReminderTime
      }
      
      notificationManager.saveNotificationSettings(notificationSettings)

      // 调用后端保存提醒时间（若已登录）
      if (app.globalData && app.globalData.openid) {
        app.request({
          url: '/api/reminders/settings',
          method: 'PUT',
          data: {
            feedingReminderTime: this.data.feedingReminderTime,
            cleaningReminderTime: this.data.cleaningReminderTime,
            feedingReminder: this.data.feedingReminder,
            cleaningReminder: this.data.cleaningReminder
          }
        }).catch(err => {
          console.warn('更新后端提醒设置失败:', err)
        })
      }
    } catch (error) {
      console.error('保存偏好设置失败:', error)
    }
  },

  // 切换通知开关
  async toggleNotifications(e) {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    const currentSettings = this.data.notificationSettings || {
      enabled: this.data.notificationsEnabled,
      feedingReminder: this.data.feedingReminder,
      healthReminder: this.data.healthReminder,
      cleaningReminder: this.data.cleaningReminder,
      medicationReminder: this.data.medicationReminder,
      breedingReminder: this.data.breedingReminder
    }
    const requestedEnabled = (e && e.detail && typeof e.detail.value !== 'undefined')
      ? !!e.detail.value
      : !currentSettings.enabled

    // 仅更新本地开关；订阅权限必须通过“订阅权限”按钮点击触发
    this.updateNotificationSettings(requestedEnabled)

    if (requestedEnabled && this.data.hasTemplateIds) {
      wx.showToast({ title: '已开启本地通知，请点击“订阅权限”授权', icon: 'none' })
    }
  },

  // 更新通知设置的辅助方法
  updateNotificationSettings(enabled) {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    const currentSettings = this.data.notificationSettings || {
      enabled: this.data.notificationsEnabled,
      feedingReminder: this.data.feedingReminder,
      healthReminder: this.data.healthReminder,
      cleaningReminder: this.data.cleaningReminder,
      medicationReminder: this.data.medicationReminder,
      breedingReminder: this.data.breedingReminder
    }
    const newSettings = { ...currentSettings, enabled }

    notificationManager.saveNotificationSettings(newSettings)
    this.setData({
      notificationSettings: newSettings,
      notificationsEnabled: newSettings.enabled
    })

    wx.showToast({ title: enabled ? '通知已开启' : '通知已关闭', icon: 'success' })
  },

  // 切换各种提醒设置
  toggleFeedingReminder(e) {
    this.setData({ feedingReminder: e.detail.value })
    this.savePreferences()
  },

  toggleHealthReminder(e) {
    this.setData({ healthReminder: e.detail.value })
    this.savePreferences()
  },

  toggleCleaningReminder(e) {
    this.setData({ cleaningReminder: e.detail.value })
    this.savePreferences()
  },

  toggleMedicationReminder(e) {
    this.setData({ medicationReminder: e.detail.value })
    this.savePreferences()
  },

  toggleBreedingReminder(e) {
    this.setData({ breedingReminder: e.detail.value })
    this.savePreferences()
  },

  // 时间选择器变更
  onFeedingTimeChange(e) {
    const value = e && e.detail && e.detail.value ? e.detail.value : this.data.feedingReminderTime
    this.setData({ feedingReminderTime: value })
    this.savePreferences()
  },

  onCleaningTimeChange(e) {
    const value = e && e.detail && e.detail.value ? e.detail.value : this.data.cleaningReminderTime
    this.setData({ cleaningReminderTime: value })
    this.savePreferences()
  },

  // 从后端同步提醒设置（若已登录）
  syncServerReminderSettings() {
    const app = getApp()
    if (!app.globalData || !app.globalData.openid) return

    app.request({ url: '/api/reminders/settings' })
      .then(res => {
        if (res && res.success && res.data) {
          const data = res.data
          const updated = {}
          if (data.feedingReminderTime) updated.feedingReminderTime = data.feedingReminderTime
          if (data.cleaningReminderTime) updated.cleaningReminderTime = data.cleaningReminderTime
          if (typeof data.feedingReminder !== 'undefined') updated.feedingReminder = !!data.feedingReminder
          if (typeof data.cleaningReminder !== 'undefined') updated.cleaningReminder = !!data.cleaningReminder

          if (Object.keys(updated).length > 0) {
            this.setData(updated)
            // 同步到本地通知设置
            const notificationManager = app.globalData.notificationManager
            const currentSettings = notificationManager.getNotificationSettings()
            notificationManager.saveNotificationSettings({
              ...currentSettings,
              feedingReminderTime: updated.feedingReminderTime || this.data.feedingReminderTime,
              cleaningReminderTime: updated.cleaningReminderTime || this.data.cleaningReminderTime,
              feedingReminder: typeof updated.feedingReminder !== 'undefined' ? updated.feedingReminder : this.data.feedingReminder,
              cleaningReminder: typeof updated.cleaningReminder !== 'undefined' ? updated.cleaningReminder : this.data.cleaningReminder
            })
          }
        }
      })
      .catch(err => {
        console.warn('同步后端提醒设置失败:', err)
      })
  },

  // 重新申请订阅权限（在已开启时可手动触发）
  async reapplySubscriptionPermissions() {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    try {
      wx.showLoading({ title: '申请权限中...' })
      const acceptedTemplates = await notificationManager.requestSubscriptionPermission()
      console.log('基础权限重新申请成功:', acceptedTemplates)
      try {
        const additionalTemplates = await notificationManager.requestAdditionalSubscriptionPermission()
        console.log('额外权限重新申请成功:', additionalTemplates)
      } catch (additionalError) {
        console.log('额外权限重新申请失败，但不影响基础功能:', additionalError)
      }
      wx.hideLoading()
      wx.showToast({ title: '权限申请成功', icon: 'success' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '权限申请失败', icon: 'none' })
      console.error('订阅消息权限申请失败:', error)
    }
  },

  // 发送测试订阅消息
  async sendTestNotification() {
    const app = getApp()
    const notificationManager = app.globalData.notificationManager
    const { getConfiguredTemplateIds } = require('../../utils/template-config')
    const TIDS = getConfiguredTemplateIds()
    const candidate = TIDS.feeding || TIDS.health || TIDS.cleaning || TIDS.medication || TIDS.breeding
    if (!candidate) {
      wx.showToast({ title: '未配置模板ID，无法测试订阅消息', icon: 'none' })
      return
    }
    try {
      await notificationManager.sendSubscriptionMessage(candidate, {
        content: '这是一条测试通知',
        time: app.formatDateTime(Date.now(), 'YYYY-MM-DD HH:mm'),
        sender: '鹦鹉管家',
        type: '测试消息'
      })
      wx.showToast({ title: '测试消息已发送', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
  },

  // （已移除主题相关功能）

  // 其它服务项（可逐步完善）
  exportData() {
    wx.showToast({ title: '数据导出功能即将上线', icon: 'none' });
  },
  showAbout() {
    const app = getApp();
    // 优先使用后端 API 返回的版本号，但不展示后端地址
    app.request({ url: '/api/health' })
      .then(res => {
        const version = (res && res.version) ? res.version : (app.globalData.appVersion || '未知');
        // 使用模板字符串生成真正的多行文本，兼容 DevTools 与真机
        const contentText = `鹦鹉管家 v${version}\n用心呵护每一只小鹦鹉`;
        wx.showModal({
          title: '关于应用',
          content: contentText,
          showCancel: false
        });
      })
      .catch(() => {
        const version = app.globalData.appVersion || '未知';
        const contentText = `鹦鹉管家 v${version}\n用心呵护每一只小鹦鹉`;
        wx.showModal({
          title: '关于应用',
          content: contentText,
          showCancel: false
        });
      });
  },
  showHelp() {
    wx.showModal({ title: '帮助反馈', content: '有问题或建议，欢迎联系我们。', showCancel: false });
  },

  // 跳转到通知功能测试页面（已隐藏）
  /*
  goToTestNotification() {
    wx.navigateTo({
      url: '/pages/test-notification/test-notification'
    });
  },
  */
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
