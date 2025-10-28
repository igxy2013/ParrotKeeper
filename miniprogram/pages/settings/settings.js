// pages/settings/settings.js
Page({
  data: {
    notificationsEnabled: false,
    feedingReminder: true,
    healthReminder: true,
    cleaningReminder: true,
    medicationReminder: true,
    breedingReminder: true
  },

  onLoad() {
    this.loadPreferences();
  },

  // 加载用户偏好设置
  loadPreferences() {
    try {
      const app = getApp()
      const notificationManager = app.globalData.notificationManager
      
      // 加载通知设置
      const notificationSettings = notificationManager.getNotificationSettings()
      
      this.setData({
        notificationsEnabled: notificationSettings.enabled,
        feedingReminder: notificationSettings.feedingReminder,
        healthReminder: notificationSettings.healthReminder,
        cleaningReminder: notificationSettings.cleaningReminder,
        medicationReminder: notificationSettings.medicationReminder,
        breedingReminder: notificationSettings.breedingReminder
      })
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
        breedingReminder: this.data.breedingReminder
      }
      
      notificationManager.saveNotificationSettings(notificationSettings)
    } catch (error) {
      console.error('保存偏好设置失败:', error)
    }
  },

  // 切换通知开关
  async toggleNotifications() {
    const currentSettings = this.data.notificationSettings
    const newEnabled = !currentSettings.enabled
    
    if (newEnabled) {
      // 检查是否配置了有效的模板ID
      const { hasValidTemplateIds } = require('../../utils/template-config')
      
      if (!hasValidTemplateIds()) {
        wx.showModal({
          title: '提示',
          content: '当前未配置订阅消息模板ID，通知功能将仅支持本地提醒。如需微信订阅消息推送，请联系开发者配置模板。',
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 即使没有模板ID，也允许开启本地通知功能
            this.updateNotificationSettings(newEnabled)
          }
        })
        return
      }
      
      // 开启通知时，先申请基础权限
      try {
        wx.showLoading({ title: '申请权限中...' })
        
        const acceptedTemplates = await notificationManager.requestSubscriptionPermission()
        console.log('基础权限申请成功:', acceptedTemplates)
        
        // 尝试申请额外权限（不强制要求成功）
        try {
          const additionalTemplates = await notificationManager.requestAdditionalSubscriptionPermission()
          console.log('额外权限申请成功:', additionalTemplates)
        } catch (additionalError) {
          console.log('额外权限申请失败，但不影响基础功能:', additionalError)
        }
        
        wx.hideLoading()
        wx.showToast({
          title: '权限申请成功',
          icon: 'success'
        })
        
      } catch (error) {
        wx.hideLoading()
        wx.showToast({
          title: '权限申请失败',
          icon: 'none'
        })
        console.error('订阅消息权限申请失败:', error)
        return // 权限申请失败时不更新设置
      }
    }
    
    this.updateNotificationSettings(newEnabled)
  },

  // 更新通知设置的辅助方法
  updateNotificationSettings(enabled) {
    const currentSettings = this.data.notificationSettings
    const newSettings = {
      ...currentSettings,
      enabled: enabled
    }
    
    notificationManager.saveNotificationSettings(newSettings)
    this.setData({
      notificationSettings: newSettings
    })
    
    wx.showToast({
      title: enabled ? '通知已开启' : '通知已关闭',
      icon: 'success'
    })
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
