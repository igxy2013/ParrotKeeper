// 通知工具类
const app = getApp()
const { getConfiguredTemplateIds, hasValidTemplateIds } = require('./template-config')

// 通知管理工具类
class NotificationManager {
  constructor() {
    this.STORAGE_KEY = 'notification_settings'
    this.LOCAL_NOTIFICATIONS_KEY = 'local_notifications'
    this.UNREAD_COUNT_KEY = 'unread_count'
    
    // 从配置文件获取模板ID
    this.TEMPLATE_IDS = getConfiguredTemplateIds()
    
    // 初始化默认设置
    this.defaultSettings = {
      enabled: false,
      feedingReminder: true,
      healthReminder: true,
      cleaningReminder: true,
      medicationReminder: true,
      breedingReminder: true,
      // 每日提醒时间（本地展示用）
      feedingReminderTime: '08:00',
      cleaningReminderTime: '18:00'
    }
  }

  // 获取通知设置
  getNotificationSettings() {
    try {
      const settings = wx.getStorageSync(this.STORAGE_KEY)
      return settings ? { ...this.defaultSettings, ...settings } : this.defaultSettings
    } catch (error) {
      console.error('获取通知设置失败:', error)
      return this.defaultSettings
    }
  }

  // 保存通知设置
  saveNotificationSettings(settings) {
    try {
      wx.setStorageSync(this.STORAGE_KEY, settings)
      console.log('通知设置已保存:', settings)
    } catch (error) {
      console.error('保存通知设置失败:', error)
    }
  }

  // 请求订阅消息权限
  async requestSubscriptionPermission() {
    return new Promise((resolve, reject) => {
      // 检查是否配置了有效的模板ID
      const templateIds = Object.values(this.TEMPLATE_IDS).filter(id => id && id.trim() !== '')
      
      if (templateIds.length === 0) {
        console.warn('未配置有效的订阅消息模板ID，跳过权限申请')
        resolve([])
        return
      }
      
      // 微信小程序一次最多只能申请3个模板，所以我们只选择最重要的几个
      const importantTemplateIds = templateIds.slice(0, 3)
      
      wx.requestSubscribeMessage({
        tmplIds: importantTemplateIds,
        success: (res) => {
          console.log('订阅消息权限申请结果:', res)
          // 检查每个模板的授权状态
          const acceptedTemplates = []
          importantTemplateIds.forEach(templateId => {
            if (res[templateId] === 'accept') {
              acceptedTemplates.push(templateId)
            }
          })
          
          if (acceptedTemplates.length > 0) {
            resolve(acceptedTemplates)
          } else {
            reject(new Error('用户拒绝了所有订阅消息'))
          }
        },
        fail: (error) => {
          console.error('订阅消息权限申请失败:', error)
          reject(error)
        }
      })
    })
  }

  // 请求额外的订阅消息权限（用药和繁殖）
  async requestAdditionalSubscriptionPermission() {
    return new Promise((resolve, reject) => {
      // 检查是否配置了有效的模板ID
      const allTemplateIds = Object.values(this.TEMPLATE_IDS).filter(id => id && id.trim() !== '')
      
      if (allTemplateIds.length <= 3) {
        console.warn('没有额外的模板ID需要申请权限')
        resolve([])
        return
      }
      
      const additionalTemplateIds = allTemplateIds.slice(3, 5) // 最多再申请2个
      
      wx.requestSubscribeMessage({
        tmplIds: additionalTemplateIds,
        success: (res) => {
          console.log('额外订阅消息权限申请结果:', res)
          const acceptedTemplates = []
          additionalTemplateIds.forEach(templateId => {
            if (res[templateId] === 'accept') {
              acceptedTemplates.push(templateId)
            }
          })
          
          resolve(acceptedTemplates)
        },
        fail: (error) => {
          console.error('额外订阅消息权限申请失败:', error)
          reject(error)
        }
      })
    })
  }

  // 发送订阅消息（需要后端支持）
  async sendSubscriptionMessage(templateId, messageData) {
    try {
      const app = getApp()
      
      // 构造符合微信模板关键词的数据格式
      const templateData = {
        thing1: { value: messageData.content || '您有一条未读消息' }, // 消息内容
        time2: { value: messageData.time || this.formatCurrentTime() }, // 消息时间
        thing3: { value: messageData.sender || '鹦鹉管家AI' }, // 发信人
        thing4: { value: messageData.type || '系统消息' } // 提醒类型
      }
      
      const response = await app.request({
        url: '/api/notifications/send',
        method: 'POST',
        data: {
          openid: app.globalData && app.globalData.openid ? app.globalData.openid : '',
          template_id: templateId,
          data: templateData
        }
      })
      
      if (response.success) {
        console.log('订阅消息发送成功')
      } else {
        console.error('订阅消息发送失败:', response.message)
      }
    } catch (error) {
      console.error('发送订阅消息异常:', error)
    }
  }

  // 添加本地通知
  addLocalNotification(type, title, description, parrotName = '', time = '') {
    try {
      const notifications = this.getLocalNotifications()
      const newNotification = {
        id: Date.now(),
        type: type,
        title: title,
        description: description,
        parrotName: parrotName,
        time: time || this.formatCurrentTime(),
        unread: true,
        createdAt: new Date().toISOString()
      }
      
      notifications.unshift(newNotification)
      
      // 限制通知数量，保留最新的50条
      if (notifications.length > 50) {
        notifications.splice(50)
      }
      
      wx.setStorageSync(this.LOCAL_NOTIFICATIONS_KEY, notifications)
      this.updateUnreadCount()
      this.triggerUpdateCallback()
      
      console.log('本地通知已添加:', newNotification)
    } catch (error) {
      console.error('添加本地通知失败:', error)
    }
  }

  // 获取本地通知列表
  getLocalNotifications() {
    try {
      return wx.getStorageSync(this.LOCAL_NOTIFICATIONS_KEY) || []
    } catch (error) {
      console.error('获取本地通知失败:', error)
      return []
    }
  }

  // 标记通知为已读
  markNotificationRead(notificationId) {
    try {
      const notifications = this.getLocalNotifications()
      const notification = notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.unread = false
        wx.setStorageSync(this.LOCAL_NOTIFICATIONS_KEY, notifications)
        this.updateUnreadCount()
        this.triggerUpdateCallback()
      }
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }

  // 标记所有通知为已读
  markAllNotificationsRead() {
    try {
      const notifications = this.getLocalNotifications()
      notifications.forEach(n => n.unread = false)
      wx.setStorageSync(this.LOCAL_NOTIFICATIONS_KEY, notifications)
      this.updateUnreadCount()
      this.triggerUpdateCallback()
    } catch (error) {
      console.error('标记所有通知已读失败:', error)
    }
  }

  // 清空所有通知
  clearAllNotifications() {
    try {
      wx.setStorageSync(this.LOCAL_NOTIFICATIONS_KEY, [])
      wx.setStorageSync(this.UNREAD_COUNT_KEY, 0)
      this.triggerUpdateCallback()
    } catch (error) {
      console.error('清空通知失败:', error)
    }
  }

  // 获取未读通知数量
  getUnreadCount() {
    try {
      return wx.getStorageSync(this.UNREAD_COUNT_KEY) || 0
    } catch (error) {
      console.error('获取未读数量失败:', error)
      return 0
    }
  }

  // 更新未读数量
  updateUnreadCount() {
    try {
      const notifications = this.getLocalNotifications()
      const unreadCount = notifications.filter(n => n.unread).length
      wx.setStorageSync(this.UNREAD_COUNT_KEY, unreadCount)
    } catch (error) {
      console.error('更新未读数量失败:', error)
    }
  }

  // 触发更新回调
  triggerUpdateCallback() {
    try {
      const app = getApp()
      if (app.globalData.notificationUpdateCallback) {
        app.globalData.notificationUpdateCallback()
      }
    } catch (error) {
      console.error('触发更新回调失败:', error)
    }
  }

  // 格式化当前时间
  formatCurrentTime() {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 将 HH:mm 转换为分钟数
  parseTimeToMinutes(hhmm) {
    try {
      if (!hhmm || typeof hhmm !== 'string') return 0
      const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return 0
      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
      const mi = Math.min(59, Math.max(0, parseInt(m[2], 10)))
      return h * 60 + mi
    } catch (_) { return 0 }
  }

  // 生成当天的每日提醒（喂食/换水），避免重复
  generateDailyRemindersForToday() {
    try {
      const settings = this.getNotificationSettings()
      if (!settings.enabled) return

      const now = new Date()
      const todayKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`
      const STATE_KEY = 'daily_reminders_state'
      const state = wx.getStorageSync(STATE_KEY) || {}
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      const feedingTimeStr = settings.feedingReminderTime || '08:00'
      const cleaningTimeStr = settings.cleaningReminderTime || '18:00'
      const feedingMinutes = this.parseTimeToMinutes(feedingTimeStr)
      const cleaningMinutes = this.parseTimeToMinutes(cleaningTimeStr)

      // 当天状态初始化
      if (state.date !== todayKey) {
        state.date = todayKey
        state.feeding = false
        state.cleaning = false
      }

      // 到点且未生成：喂食提醒
      if (settings.feedingReminder && !state.feeding && currentMinutes >= feedingMinutes) {
        this.addLocalNotification(
          'system',
          '喂食提醒',
          '今天的喂食时间到了，请及时喂食',
          '',
          feedingTimeStr
        )
        state.feeding = true
      }

      // 到点且未生成：换水提醒
      if (settings.cleaningReminder && !state.cleaning && currentMinutes >= cleaningMinutes) {
        this.addLocalNotification(
          'system',
          '换水提醒',
          '今天的换水时间到了，请及时更换饮用水',
          '',
          cleaningTimeStr
        )
        state.cleaning = true
      }

      wx.setStorageSync(STATE_KEY, state)
    } catch (e) {
      console.warn('生成每日提醒失败:', e)
    }
  }

  // 添加喂食通知
  addFeedingNotification(parrotName, feedingTime) {
    const settings = this.getNotificationSettings()
    if (settings.enabled && settings.feedingReminder) {
      // 添加本地通知
      this.addLocalNotification(
        'feeding',
        '喂食记录已添加',
        `${parrotName} 的喂食记录已成功记录`,
        parrotName,
        this.formatTime(feedingTime)
      )
      
      // 发送订阅消息
      if (this.TEMPLATE_IDS.feeding) {
        this.sendSubscriptionMessage(this.TEMPLATE_IDS.feeding, {
          content: `${parrotName} 的喂食记录已成功记录`,
          time: this.formatTime(feedingTime),
          sender: '鹦鹉管家AI',
          type: '喂食提醒'
        })
      }
    }
  }

  // 添加健康通知
  addHealthNotification(parrotName, checkTime) {
    const settings = this.getNotificationSettings()
    if (settings.enabled && settings.healthReminder) {
      // 添加本地通知
      this.addLocalNotification(
        'health',
        '健康检查已记录',
        `${parrotName} 的健康检查记录已成功添加`,
        parrotName,
        this.formatTime(checkTime)
      )
      
      // 发送订阅消息
      if (this.TEMPLATE_IDS.health) {
        this.sendSubscriptionMessage(this.TEMPLATE_IDS.health, {
          content: `${parrotName} 的健康检查记录已成功添加`,
          time: this.formatTime(checkTime),
          sender: '鹦鹉管家AI',
          type: '健康提醒'
        })
      }
    }
  }

  // 添加清洁通知
  addCleaningNotification(parrotName, cleaningTime) {
    const settings = this.getNotificationSettings()
    if (settings.enabled && settings.cleaningReminder) {
      // 添加本地通知
      this.addLocalNotification(
        'cleaning',
        '清洁记录已添加',
        `${parrotName} 的清洁记录已成功记录`,
        parrotName,
        this.formatTime(cleaningTime)
      )
      
      // 发送订阅消息
      if (this.TEMPLATE_IDS.cleaning) {
        this.sendSubscriptionMessage(this.TEMPLATE_IDS.cleaning, {
          content: `${parrotName} 的清洁记录已成功记录`,
          time: this.formatTime(cleaningTime),
          sender: '鹦鹉管家AI',
          type: '清洁提醒'
        })
      }
    }
  }

  // 添加用药通知
  addMedicationNotification(parrotName, medicationTime) {
    const settings = this.getNotificationSettings()
    if (settings.enabled && settings.medicationReminder) {
      // 添加本地通知
      this.addLocalNotification(
        'medication',
        '用药记录已添加',
        `${parrotName} 的用药记录已成功记录`,
        parrotName,
        this.formatTime(medicationTime)
      )
      
      // 发送订阅消息
      if (this.TEMPLATE_IDS.medication) {
        this.sendSubscriptionMessage(this.TEMPLATE_IDS.medication, {
          content: `${parrotName} 的用药记录已成功记录`,
          time: this.formatTime(medicationTime),
          sender: '鹦鹉管家AI',
          type: '用药提醒'
        })
      }
    }
  }

  // 添加繁殖通知
  addBreedingNotification(parrotNames, breedingTime) {
    const settings = this.getNotificationSettings()
    if (settings.enabled && settings.breedingReminder) {
      // 添加本地通知
      this.addLocalNotification(
        'breeding',
        '繁殖记录已添加',
        `${parrotNames} 的繁殖记录已成功记录`,
        parrotNames,
        this.formatTime(breedingTime)
      )
      
      // 发送订阅消息
      if (this.TEMPLATE_IDS.breeding) {
        this.sendSubscriptionMessage(this.TEMPLATE_IDS.breeding, {
          content: `${parrotNames} 的繁殖记录已成功记录`,
          time: this.formatTime(breedingTime),
          sender: '鹦鹉管家AI',
          type: '繁殖提醒'
        })
      }
    }
  }

  // iOS 安全日期解析（支持多种常见格式）
  parseIOSDate(timeInput) {
    try {
      if (!timeInput) return null
      if (timeInput instanceof Date) return timeInput
      if (typeof timeInput === 'number') return new Date(timeInput)
      if (typeof timeInput === 'string') {
        const s = timeInput.trim()
        // 1) 处理 "yyyy-MM-dd HH:mm:ss" 或 "yyyy-MM-dd HH:mm"
        let m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
        if (m) {
          return new Date(
            +m[1],
            +m[2] - 1,
            +m[3],
            +m[4],
            +m[5],
            m[6] ? +m[6] : 0
          )
        }
        // 2) 处理 "yyyy/MM/dd" 或 "yyyy/MM/dd HH:mm:ss"
        m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
        if (m) {
          return new Date(
            +m[1],
            +m[2] - 1,
            +m[3],
            m[4] ? +m[4] : 0,
            m[5] ? +m[5] : 0,
            m[6] ? +m[6] : 0
          )
        }
        // 3) ISO 格式或含时区，先尝试替换空格为 T
        const iso = s.includes(' ') ? s.replace(' ', 'T') : s
        const d = new Date(iso)
        if (!isNaN(d.getTime())) return d
      }
    } catch (e) {
      // 静默兜底
    }
    return null
  }

  // 格式化时间显示
  formatTime(timeString) {
    try {
      if (!timeString) return this.formatCurrentTime()
      const date = this.parseIOSDate(timeString) || new Date()
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      console.error('格式化时间失败:', error)
      return this.formatCurrentTime()
    }
  }
}

// 创建全局实例
const notificationManager = new NotificationManager()

module.exports = {
  notificationManager
}
