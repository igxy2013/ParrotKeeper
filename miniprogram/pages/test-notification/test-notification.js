// 通知功能测试页面
const { notificationManager } = require('../../utils/notification.js')

Page({
  data: {
    testResults: [],
    isLoading: false
  },

  onLoad() {
    this.addTestResult('页面加载完成', 'success')
  },

  // 添加测试结果
  addTestResult(message, type = 'info') {
    const results = this.data.testResults
    results.push({
      id: Date.now(),
      message: message,
      type: type,
      time: new Date().toLocaleTimeString()
    })
    
    this.setData({
      testResults: results
    })
  },

  // 测试获取通知设置
  testGetSettings() {
    try {
      const settings = notificationManager.getNotificationSettings()
      this.addTestResult(`获取设置成功: ${JSON.stringify(settings)}`, 'success')
    } catch (error) {
      this.addTestResult(`获取设置失败: ${error.message}`, 'error')
    }
  },

  // 测试保存通知设置
  testSaveSettings() {
    try {
      const testSettings = {
        enabled: true,
        feedingReminder: true,
        healthReminder: true,
        cleaningReminder: false,
        medicationReminder: true,
        breedingReminder: false
      }
      
      notificationManager.saveNotificationSettings(testSettings)
      this.addTestResult('保存设置成功', 'success')
      
      // 验证保存结果
      const savedSettings = notificationManager.getNotificationSettings()
      if (JSON.stringify(testSettings) === JSON.stringify(savedSettings)) {
        this.addTestResult('设置保存验证成功', 'success')
      } else {
        this.addTestResult('设置保存验证失败', 'error')
      }
    } catch (error) {
      this.addTestResult(`保存设置失败: ${error.message}`, 'error')
    }
  },

  // 测试添加本地通知
  testAddNotification() {
    try {
      // 先确保通知已启用
      notificationManager.saveNotificationSettings({
        enabled: true,
        feedingReminder: true,
        healthReminder: true,
        cleaningReminder: true,
        medicationReminder: true,
        breedingReminder: true
      })

      // 添加各种类型的测试通知
      notificationManager.addFeedingNotification('测试鹦鹉1', new Date().toISOString())
      notificationManager.addHealthNotification('测试鹦鹉2', new Date().toISOString())
      notificationManager.addCleaningNotification('测试鹦鹉3', new Date().toISOString())
      notificationManager.addMedicationNotification('测试鹦鹉4', new Date().toISOString())
      notificationManager.addBreedingNotification('测试鹦鹉5和测试鹦鹉6', new Date().toISOString())

      this.addTestResult('添加5条测试通知成功', 'success')
      
      // 检查通知数量
      const notifications = notificationManager.getLocalNotifications()
      this.addTestResult(`当前通知数量: ${notifications.length}`, 'info')
      
      const unreadCount = notificationManager.getUnreadCount()
      this.addTestResult(`未读通知数量: ${unreadCount}`, 'info')
      
    } catch (error) {
      this.addTestResult(`添加通知失败: ${error.message}`, 'error')
    }
  },

  // 测试获取通知列表
  testGetNotifications() {
    try {
      const notifications = notificationManager.getLocalNotifications()
      this.addTestResult(`获取到 ${notifications.length} 条通知`, 'success')
      
      if (notifications.length > 0) {
        const latestNotification = notifications[0]
        this.addTestResult(`最新通知: ${latestNotification.title} - ${latestNotification.description}`, 'info')
      }
    } catch (error) {
      this.addTestResult(`获取通知失败: ${error.message}`, 'error')
    }
  },

  // 测试标记通知已读
  testMarkRead() {
    try {
      const notifications = notificationManager.getLocalNotifications()
      if (notifications.length > 0) {
        const firstNotification = notifications[0]
        notificationManager.markNotificationRead(firstNotification.id)
        this.addTestResult(`标记通知 ${firstNotification.id} 为已读`, 'success')
        
        const unreadCount = notificationManager.getUnreadCount()
        this.addTestResult(`剩余未读数量: ${unreadCount}`, 'info')
      } else {
        this.addTestResult('没有通知可标记', 'warning')
      }
    } catch (error) {
      this.addTestResult(`标记已读失败: ${error.message}`, 'error')
    }
  },

  // 测试标记所有通知已读
  testMarkAllRead() {
    try {
      notificationManager.markAllNotificationsRead()
      this.addTestResult('标记所有通知为已读', 'success')
      
      const unreadCount = notificationManager.getUnreadCount()
      this.addTestResult(`未读数量: ${unreadCount}`, 'info')
    } catch (error) {
      this.addTestResult(`标记所有已读失败: ${error.message}`, 'error')
    }
  },

  // 测试清空所有通知
  testClearAll() {
    try {
      notificationManager.clearAllNotifications()
      this.addTestResult('清空所有通知成功', 'success')
      
      const notifications = notificationManager.getLocalNotifications()
      this.addTestResult(`剩余通知数量: ${notifications.length}`, 'info')
    } catch (error) {
      this.addTestResult(`清空通知失败: ${error.message}`, 'error')
    }
  },

  // 测试订阅消息权限申请
  async testSubscriptionPermission() {
    this.setData({ isLoading: true })
    
    try {
      this.addTestResult('开始申请基础订阅消息权限...', 'info')
      
      const acceptedTemplates = await notificationManager.requestSubscriptionPermission()
      this.addTestResult(`基础权限申请成功，已授权模板: ${acceptedTemplates.length} 个`, 'success')
      
      // 尝试申请额外权限
      this.addTestResult('开始申请额外订阅消息权限...', 'info')
      
      try {
        const additionalTemplates = await notificationManager.requestAdditionalSubscriptionPermission()
        this.addTestResult(`额外权限申请成功，已授权模板: ${additionalTemplates.length} 个`, 'success')
      } catch (additionalError) {
        this.addTestResult(`额外权限申请失败: ${additionalError.message}`, 'warning')
      }
      
    } catch (error) {
      this.addTestResult(`基础权限申请失败: ${error.message}`, 'error')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 测试发送订阅消息
  async testSendSubscriptionMessage() {
    this.setData({ isLoading: true })
    
    try {
      this.addTestResult('开始测试发送订阅消息...', 'info')
      
      // 测试发送喂食提醒
      await notificationManager.sendSubscriptionMessage('wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE', {
        content: '测试鹦鹉的喂食记录已成功记录',
        time: new Date().toLocaleString(),
        sender: '鹦鹉管家AI',
        type: '喂食提醒'
      })
      
      this.addTestResult('订阅消息发送测试完成', 'success')
      
    } catch (error) {
      this.addTestResult(`订阅消息发送测试失败: ${error.message}`, 'error')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 运行所有测试
  runAllTests() {
    this.setData({ testResults: [] })
    this.addTestResult('开始运行所有测试...', 'info')
    
    setTimeout(() => {
      this.testGetSettings()
    }, 100)
    
    setTimeout(() => {
      this.testSaveSettings()
    }, 200)
    
    setTimeout(() => {
      this.testAddNotification()
    }, 300)
    
    setTimeout(() => {
      this.testGetNotifications()
    }, 400)
    
    setTimeout(() => {
      this.testMarkRead()
    }, 500)
    
    setTimeout(() => {
      this.testMarkAllRead()
    }, 600)
    
    setTimeout(() => {
      this.addTestResult('所有基础测试完成！', 'success')
    }, 700)
  },

  // 清空测试结果
  clearResults() {
    this.setData({ testResults: [] })
  }
})