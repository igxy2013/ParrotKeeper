// pages/settings/notification-settings/notification-settings.js
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
    ,
    healthAlertPreferences: {
      chick_care: true,
      incubation_advice: true,
      feeding_gap: true,
      feeding_frequency_low: true,
      weight_decline: true,
      care_general_topic: true
    },
    iconPaths: {
      notifyBell: '/images/remix/notification-3-line.png',
      feedRestaurant: '/images/remix/ri-restaurant-fill-orange.png',
      timeClock: '/images/remix/ri-time-line.png',
      healthShield: '/images/remix/ri-shield-check-fill-green.png',
      settingsGear: '/images/remix/settings-3-line.png',
      chickCare: '/images/remix/ri-heart-fill-emerald.png',
      incubationAdvice: '/images/remix/ri-book-fill-orange.png',
      feedingGap: '/images/remix/ri-time-line.png',
      feedingFrequencyLow: '/images/remix/ri-arrow-down-s-fill-gray.png',
      weightDecline: '/images/remix/ri-scales-fill-green.png',
      careGeneralTopic: '/images/remix/ri-book-fill-green.png',
      cleaning: '/images/remix/ri-home-5-fill-green.png',
      medication: '/images/remix/ri-heart-fill-red.png',
      breeding: '/images/remix/ri-heart-fill-purple.png',
      keyLine: '/images/remix/key-2-line.png',
      testExperiment: '/images/remix/ri-nurse-line-purple.png',
      arrowRight: '/images/remix/arrow-right-s-line.png'
    }
  },

  onLoad() {
    this.loadPreferences();
  },

  onNotificationIconError(e) {
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

  // 加载用户偏好设置
  loadPreferences() {
    try {
      const app = getApp()
      const notificationManager = app.globalData.notificationManager
      const { hasValidTemplateIds } = require('../../../utils/template-config')
      
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
        ,
        healthAlertPreferences: notificationSettings.healthAlertPreferences || this.data.healthAlertPreferences
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
      const prevSettings = notificationManager.getNotificationSettings()
      
      // 保存通知设置
      const notificationSettings = {
        enabled: this.data.notificationsEnabled,
        feedingReminder: this.data.feedingReminder,
        healthReminder: this.data.healthReminder,
        cleaningReminder: this.data.cleaningReminder,
        medicationReminder: this.data.medicationReminder,
        breedingReminder: this.data.breedingReminder,
        feedingReminderTime: this.data.feedingReminderTime,
        cleaningReminderTime: this.data.cleaningReminderTime,
        medicationReminderTime: prevSettings.medicationReminderTime || '09:00',
        healthAlertPreferences: this.data.healthAlertPreferences
      }
      
      notificationManager.saveNotificationSettings(notificationSettings)

      try {
        app.request({
          url: '/api/reminders/settings',
          method: 'PUT',
          data: {
            enabled: !!notificationSettings.enabled,
            feedingReminder: !!notificationSettings.feedingReminder,
            healthReminder: !!notificationSettings.healthReminder,
            cleaningReminder: !!notificationSettings.cleaningReminder,
            medicationReminder: !!notificationSettings.medicationReminder,
            breedingReminder: !!notificationSettings.breedingReminder,
            feedingReminderTime: notificationSettings.feedingReminderTime || null,
            cleaningReminderTime: notificationSettings.cleaningReminderTime || null,
            medicationReminderTime: notificationSettings.medicationReminderTime || null,
            healthAlertPreferences: notificationSettings.healthAlertPreferences || {},
            pinnedHealthAlertTypes: (wx.getStorageSync('pinnedHealthAlertTypes_global') || [])
          }
        })
      } catch (_) {}

      // 若时间或开关发生变化，重置当天对应类型的生成状态，允许在当天重新生成一次
      try {
        const STATE_KEY = 'daily_reminders_state'
        const now = new Date()
        const todayKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`
        const state = wx.getStorageSync(STATE_KEY) || {}
        if (state.date === todayKey) {
          const resetFeeding = (prevSettings.feedingReminderTime !== this.data.feedingReminderTime) || (!prevSettings.feedingReminder && this.data.feedingReminder)
          const resetCleaning = (prevSettings.cleaningReminderTime !== this.data.cleaningReminderTime) || (!prevSettings.cleaningReminder && this.data.cleaningReminder)
          if (resetFeeding) state.feeding = false
          if (resetCleaning) state.cleaning = false
          wx.setStorageSync(STATE_KEY, state)
        }
      } catch (_) {}

      // 立即尝试生成当天的本地定时提醒（若时间已到且未生成）
      try { notificationManager.generateDailyRemindersForToday() } catch (_) {}

      // 调用后端保存完整通知设置（若已登录）
      if (app.globalData && app.globalData.openid) {
        app.request({
          url: '/api/reminders/settings',
          method: 'PUT',
          data: {
            enabled: notificationSettings.enabled,
            feedingReminder: notificationSettings.feedingReminder,
            healthReminder: notificationSettings.healthReminder,
            cleaningReminder: notificationSettings.cleaningReminder,
            medicationReminder: notificationSettings.medicationReminder,
            breedingReminder: notificationSettings.breedingReminder,
            feedingReminderTime: notificationSettings.feedingReminderTime,
            cleaningReminderTime: notificationSettings.cleaningReminderTime,
            medicationReminderTime: notificationSettings.medicationReminderTime,
            healthAlertPreferences: notificationSettings.healthAlertPreferences,
            pinnedHealthAlertTypes: (wx.getStorageSync('pinnedHealthAlertTypes_global') || [])
          }
        }).catch(err => {
          console.warn('更新后端提醒设置失败:', err)
        })
      }
    } catch (error) {
      console.error('保存偏好设置失败:', error)
    }
  },

  toggleHealthAlertType(e) {
    const key = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || ''
    const val = (e && e.detail && typeof e.detail.value !== 'undefined') ? !!e.detail.value : true
    if (!key) return
    const next = { ...(this.data.healthAlertPreferences || {}), [key]: val }
    this.setData({ healthAlertPreferences: next })
    this.savePreferences()
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
    this.savePreferences()

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

    // 开启后尝试生成当天提醒（若时间已到），关闭则不做处理
    if (enabled) {
      try { notificationManager.generateDailyRemindersForToday() } catch (_) {}
    }

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
          if (Array.isArray(data.pinnedHealthAlertTypes)) {
            try { wx.setStorageSync('pinnedHealthAlertTypes_global', data.pinnedHealthAlertTypes) } catch (_) {}
          }
          const updated = {}
          if (data.feedingReminderTime) updated.feedingReminderTime = data.feedingReminderTime
          if (data.cleaningReminderTime) updated.cleaningReminderTime = data.cleaningReminderTime
          if (data.medicationReminderTime) updated.medicationReminderTime = data.medicationReminderTime
          if (typeof data.feedingReminder !== 'undefined') updated.feedingReminder = !!data.feedingReminder
          if (typeof data.cleaningReminder !== 'undefined') updated.cleaningReminder = !!data.cleaningReminder
          if (typeof data.healthReminder !== 'undefined') updated.healthReminder = !!data.healthReminder
          if (typeof data.medicationReminder !== 'undefined') updated.medicationReminder = !!data.medicationReminder
          if (typeof data.breedingReminder !== 'undefined') updated.breedingReminder = !!data.breedingReminder
          // 不覆盖本地的 notificationsEnabled，避免服务端旧值导致页面开关回退
          if (data.healthAlertPreferences && typeof data.healthAlertPreferences === 'object') updated.healthAlertPreferences = data.healthAlertPreferences

          if (Object.keys(updated).length > 0) {
            this.setData(updated)
            // 同步到本地通知设置
            const notificationManager = app.globalData.notificationManager
            const currentSettings = notificationManager.getNotificationSettings()
            notificationManager.saveNotificationSettings({
              ...currentSettings,
              feedingReminderTime: updated.feedingReminderTime || this.data.feedingReminderTime,
              cleaningReminderTime: updated.cleaningReminderTime || this.data.cleaningReminderTime,
              medicationReminderTime: updated.medicationReminderTime || (currentSettings.medicationReminderTime || '09:00'),
              // 始终保留当前页面的开关状态
              enabled: this.data.notificationsEnabled,
              feedingReminder: typeof updated.feedingReminder !== 'undefined' ? updated.feedingReminder : this.data.feedingReminder,
              healthReminder: typeof updated.healthReminder !== 'undefined' ? updated.healthReminder : this.data.healthReminder,
              cleaningReminder: typeof updated.cleaningReminder !== 'undefined' ? updated.cleaningReminder : this.data.cleaningReminder,
              medicationReminder: typeof updated.medicationReminder !== 'undefined' ? updated.medicationReminder : this.data.medicationReminder,
              breedingReminder: typeof updated.breedingReminder !== 'undefined' ? updated.breedingReminder : this.data.breedingReminder,
              healthAlertPreferences: updated.healthAlertPreferences || this.data.healthAlertPreferences
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
    const { getConfiguredTemplateIds } = require('../../../utils/template-config')
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
  }
});
