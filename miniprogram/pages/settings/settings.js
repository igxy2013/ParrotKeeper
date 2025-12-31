// pages/settings/settings.js
Page({
  data: {
    iconPaths: {
      sectionSettings: '/images/remix/settings-3-line.png',
      sectionData: '/images/remix/ri-bar-chart-fill-orange.png',
      sectionAccount: '/images/remix/user-line.png',
      notifyBell: '/images/remix/notification-3-line.png',
      categoryMoney: '/images/remix/ri-money-dollar-circle-fill-green.png',
      feedRestaurant: '/images/remix/ri-restaurant-fill-orange.png',
      accountLock: '/images/remix/lock-fill.png',
      logoutClose: '/images/remix/logout-box-line-red.png',
      arrowRight: '/images/remix/arrow-right-s-line.png',
      deleteBin: '/images/remix/delete-bin-line-red.png'
    }
  },

  onLoad() {
  },

  goToNotificationSettings() {
    wx.navigateTo({
      url: '/pages/settings/notification-settings/notification-settings'
    });
  },

  showAbout() {
    const app = getApp();
    // 直接使用全局版本号（已在 app.js 启动时从微信API获取）
    const version = app.globalData.appVersion || '未知';
    const contentText = `鹦鹉管家 v${version}\n用心呵护每一只小鹦鹉`;
    wx.showModal({
      title: '关于应用',
      content: contentText,
      showCancel: false
    });
  },

  goToCategoryManagement() {
    wx.navigateTo({ url: '/pages/settings/category-management/category-management' });
  },

  goToFeedTypeManagement() {
    wx.navigateTo({ url: '/pages/settings/feed-type-management/feed-type-management' });
  },

  goToAccountManagement() {
    wx.navigateTo({ url: '/pages/account-management/account-management' });
  },

  onSettingsIconError(e) {
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

  showHelp() {
    wx.navigateTo({ url: '/pages/settings/feedback/feedback' })
  },

  handleClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有本地缓存数据吗？\n这将释放存储空间，但下次加载图片或数据时可能会消耗更多流量。\n您的登录状态和个性化设置将被保留。',
      confirmText: '清除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.doClearCache()
        }
      }
    })
  },

  doClearCache() {
    wx.showLoading({ title: '清理中...', mask: true })
    const app = getApp()
    
    // 延迟一小会儿让 Loading 显示出来
    setTimeout(() => {
      try {
        // 1. 保留白名单
        const whitelist = [
          'openid', 
          'userInfo', 
          'userMode', 
          'apiBaseUrl', 
          'pending_requests', 
          'pending_forms',
          'logs' // 调试日志
        ]
        
        const res = wx.getStorageInfoSync()
        const keys = res.keys || []
        
        keys.forEach(key => {
          if (!whitelist.includes(key)) {
            try {
              wx.removeStorageSync(key)
            } catch (e) {
              console.warn(`移除 key ${key} 失败:`, e)
            }
          }
        })
        
        // 2. 清理图片文件缓存目录
        const fs = wx.getFileSystemManager()
        const cacheDir = wx.env.USER_DATA_PATH + '/image-cache'
        try {
          // 检查目录是否存在
          fs.accessSync(cacheDir)
          // 尝试删除目录
          fs.rmdirSync(cacheDir, true)
          // 重新创建空目录（避免后续立即写入失败，虽然 ensureImageCacheDir 会做）
          // app.ensureImageCacheDir() // 可选，下次用的时候会自动创建
        } catch (e) {
          // 目录不存在或删除失败，通常忽略
          console.log('清理图片缓存目录跳过:', e.message)
        }
        
        // 3. 重置内存中的缓存索引
        if (app.clearDataCache) app.clearDataCache()
        if (app.setImageCacheIndex) app.setImageCacheIndex({})
        if (app._imageCachingSet) app._imageCachingSet.clear()
        
        // 4. 重置全局刷新标志，确保页面重新加载数据
        app.globalData.needRefresh = true
        
        wx.hideLoading()
        wx.showToast({ title: '缓存已清除', icon: 'success' })
        
      } catch (e) {
        wx.hideLoading()
        console.error('清除缓存失败:', e)
        wx.showToast({ title: '清理失败', icon: 'none' })
      }
    }, 100)
  },

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
