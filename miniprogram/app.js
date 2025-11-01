// app.js
const { notificationManager } = require('./utils/notification.js')

App({
  globalData: {
    userInfo: null,
    openid: null,
    // 动态设置，默认正式环境，开发工具中自动切换为本地
    //baseUrl: 'https://bimai.xyz', // 后端API地址（默认正式环境）
    //baseUrl: 'https://acbim.cn', // 后端API地址（默认正式环境）
    //baseUrl: 'https://aixbim.cn', // 后端API地址（默认正式环境）
    baseUrl: 'http://192.168.0.80:5090', // 后端API地址（默认开发环境，与 .env 端口一致）
    isLogin: false,
    userMode: 'personal', // 添加用户模式，默认为个人模式
    needRefresh: false, // 页面数据刷新标志（模式变更时触发）
    appVersion: '1.0.0', // 小程序版本号（通过微信API动态获取）
    notificationManager, // 全局通知管理器
    notificationUpdateCallback: null, // 通知更新回调
    platformInfo: { isIOS: false, system: '' },
    useIconFont: true // 是否启用图标字体（iOS优先启用，统一兼容）
  },

  // 初始化小程序版本号
  initAppVersion() {
    try {
      const accountInfo = wx.getAccountInfoSync()
      if (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.version) {
        this.globalData.appVersion = accountInfo.miniProgram.version
        console.log('获取到小程序版本号:', this.globalData.appVersion)
      } else {
        console.log('无法获取小程序版本号，使用默认版本号')
      }
    } catch (e) {
      console.error('获取小程序版本号失败:', e)
    }
  },

  // 通过后端API获取版本号
  fetchServerVersion() {
    this.request({ url: '/api/health' })
      .then(res => {
        if (res && res.success && res.version) {
          this.globalData.appVersion = res.version
          console.log('从后端API获取版本号:', res.version)
        }
      })
      .catch(err => {
        console.warn('获取后端版本号失败:', err)
      })
  },

  // 设置用户模式（个人/团队），持久化并通知页面刷新
  setUserMode(mode) {
    if (mode !== 'personal' && mode !== 'team') {
      console.warn('无效的用户模式:', mode)
      return
    }
    const prev = this.globalData.userMode
    if (prev === mode) {
      // 模式未变化，但仍确保持久化
      try { wx.setStorageSync('userMode', mode) } catch(_) {}
      return
    }

    this.globalData.userMode = mode
    this.globalData.needRefresh = true
    try { wx.setStorageSync('userMode', mode) } catch(_) {}

    // 登录状态下通知后端更新用户模式（便于持久化）
    if (this.globalData.openid) {
      this.request({
        url: '/api/auth/profile',
        method: 'PUT',
        data: { user_mode: mode }
      }).catch(err => {
        console.warn('更新后端用户模式失败:', err)
      })
    }
  },

  onLaunch() {
    console.log('小程序启动')
    
    // 先初始化平台与后端地址，再请求后端版本
    this.initPlatformInfo()
    // 获取版本号：优先后端API，其次微信API
    this.fetchServerVersion()
    this.initAppVersion()
    
    // 检查登录状态
    const openid = wx.getStorageSync('openid')
    const userInfo = wx.getStorageSync('userInfo')
    const userMode = wx.getStorageSync('userMode') || 'personal' // 获取用户模式
    
    console.log('从存储中获取的openid:', openid)
    console.log('从存储中获取的userInfo:', userInfo)
    console.log('从存储中获取的userMode:', userMode)
    
    if (openid) {
      this.globalData.openid = openid
      console.log('设置全局openid:', this.globalData.openid)
    } else {
      console.log('未找到openid，需要重新登录')
    }
    
    if (userInfo) {
      this.globalData.userInfo = userInfo
      console.log('设置全局userInfo:', this.globalData.userInfo)
    }

    // 设置用户模式
    this.globalData.userMode = userMode
    console.log('设置全局userMode:', this.globalData.userMode)

    // 根据存储的openid与userInfo设置登录状态
    this.globalData.isLogin = !!(this.globalData.openid && this.globalData.userInfo)
    if (this.globalData.isLogin) {
      console.log('检测到已登录状态')
    }

    // 全局启用分享菜单（好友和朋友圈）
    try {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    } catch (e) {
      console.warn('启用分享菜单失败:', e)
    }
  },

  // 初始化平台信息与图标策略
  initPlatformInfo() {
    try {
      // 使用新接口优先获取设备/应用信息，旧接口作为兼容兜底
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {}
      const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {}
      const systemStr = (deviceInfo.system || appBaseInfo.system || '').toLowerCase()
      const isIOS = systemStr.indexOf('ios') !== -1
      this.globalData.platformInfo = { isIOS, system: deviceInfo.system || appBaseInfo.system || '' }
      // iOS 强制启用图标字体（更稳定），其它平台也启用，必要时可用本地/远程字体兜底
      this.globalData.useIconFont = true
      console.log('平台信息:', this.globalData.platformInfo, 'useIconFont:', this.globalData.useIconFont)
    } catch (e) {
      console.warn('获取系统信息失败，使用默认设置', e)
      this.globalData.platformInfo = { isIOS: false, system: '' }
      this.globalData.useIconFont = true
    }
  },


  // 解析后端上传图片的URL：支持相对路径与完整URL
  resolveUploadUrl(path) {
    if (!path) return ''
    const str = String(path)
    // 若是完整URL，且包含 /uploads/，则统一重写到当前 baseUrl，避免跨域失效
    if (/^https?:\/\//.test(str)) {
      // 如果是生产域名 bimai.xyz 的绝对地址，保持原样，避免在本地将其重写为本地 baseUrl 导致 404
      if (/^https?:\/\/([^.]*\.)?bimai\.xyz\//.test(str)) {
        return str
      }
      // 其他包含 /uploads/ 的绝对路径，按当前 baseUrl 统一
      const m = str.match(/\/uploads\/(.+)$/)
      if (m && m[1]) {
        const suffix = m[1].replace(/^images\/?/, '')
        return this.globalData.baseUrl + '/uploads/' + suffix
      }
      return str
    }
    // 保留本地静态资源：以 /images/ 开头的路径为小程序内置资源，直接返回
    if (/^\/?images\//.test(str)) {
      return str.startsWith('/') ? str : '/' + str
    }
    // 兼容后端上传路径：去掉前导的 /uploads/images 或 /uploads
    const normalized = str
      .replace(/^\/?uploads\/?images\/?/, '')
      .replace(/^\/?uploads\/?/, '')
    return this.globalData.baseUrl + '/uploads/' + normalized
  },

  // 基于性别/品种生成本地默认彩色头像（稳定且无需网络）
  getDefaultAvatarForParrot(parrot) {
    try {
      const paletteAll = ['green', 'blue', 'red', 'yellow', 'purple', 'orange']
      const warm = ['red', 'yellow', 'orange', 'purple']
      const cool = ['blue', 'green']
      const gender = (parrot && parrot.gender) || 'unknown'
      const speciesName = (parrot && (parrot.species_name || (parrot.species && parrot.species.name) || parrot.name || '')) || ''
      // 计算稳定索引：基于品种/名称字符串哈希
      let hash = 0
      for (let i = 0; i < speciesName.length; i++) {
        hash = (hash + speciesName.charCodeAt(i)) % 9973
      }
      if (gender === 'male') {
        const idx = hash % cool.length
        return `/images/parrot-avatar-${cool[idx]}.svg`
      } else if (gender === 'female') {
        const idx = hash % warm.length
        return `/images/parrot-avatar-${warm[idx]}.svg`
      } else {
        const idx = hash % paletteAll.length
        return `/images/parrot-avatar-${paletteAll[idx]}.svg`
      }
    } catch (_) {
      return '/images/parrot-avatar-green.svg'
    }
  },

  // 微信登录
  login() {
    return new Promise((resolve, reject) => {
      // 先获取用户信息
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (userRes) => {
          // 再进行微信登录
          wx.login({
            success: (res) => {
              if (res.code) {
                // 发送登录请求到后端
                this.request({
                  url: '/api/auth/login',
                  method: 'POST',
                  data: {
                    code: res.code,
                    userInfo: userRes.userInfo
                  }
                }).then(response => {
                  if (response.success) {
                    // 保存登录信息
                    this.globalData.openid = response.data.user.openid
                    this.globalData.userInfo = response.data.user
                    this.globalData.isLogin = true
                    
                    wx.setStorageSync('openid', response.data.user.openid)
                    wx.setStorageSync('userInfo', response.data.user)
                    
                    resolve(response.data.user)
                  } else {
                    reject(new Error(response.message))
                  }
                }).catch(reject)
              } else {
                reject(new Error('登录失败'))
              }
            },
            fail: reject
          })
        },
        fail: reject
      })
    })
  },

  // 退出登录
  logout() {
    this.globalData.openid = null
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    this.globalData.userMode = 'personal' // 重置用户模式为默认值
    
    wx.removeStorageSync('openid')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('userMode') // 清除用户模式存储
    try { wx.removeStorageSync('pref_language') } catch (_) {}
  },

  // 检查登录状态
  checkLoginStatus() {
    const openid = this.globalData.openid || wx.getStorageSync('openid')
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo')
    
    if (openid && userInfo) {
      // 更新全局数据
      this.globalData.openid = openid
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
      return true
    }
    
    this.globalData.isLogin = false
    return false
  },

  // 统一请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data = {}, header = {} } = options
      
      // 添加认证头
      if (this.globalData.openid) {
        header['X-OpenID'] = this.globalData.openid
      }
      
      // 添加用户模式信息
      if (this.globalData.userMode) {
        header['X-User-Mode'] = this.globalData.userMode
      }
      
      const apiBase = this.globalData.baseUrl || ''
      wx.request({
        url: apiBase + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            // 未登录，跳转到登录页面
            this.logout()
            wx.showToast({
              title: '请先登录',
              icon: 'none'
            })
            reject(new Error('未登录'))
          } else {
            reject(new Error(res.data.message || '请求失败'))
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
          reject(err)
        }
      })
    })
  },

  // 显示加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    })
    // 标记已显示，避免未配对的隐藏调用
    this._loadingShown = true
  },

  // 隐藏加载提示
  hideLoading() {
    if (this._loadingShown) {
      wx.hideLoading()
      this._loadingShown = false
    }
  },

  // 显示成功提示
  showSuccess(title) {
    wx.showToast({
      title,
      icon: 'success'
    })
  },

  // 显示错误提示
  showError(title) {
    wx.showToast({
      title,
      icon: 'none'
    })
  },

  // 格式化日期
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return ''
    
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
  },

  // 格式化日期时间
  formatDateTime(date, format = 'YYYY-MM-DD HH:mm') {
    if (!date) return ''
    
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
  },

  // 格式化相对时间（精确到分钟）
  formatRelativeTime(date) {
    if (!date) return ''
    
    const now = new Date()
    const target = new Date(date)
    const diffMs = now - target
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      // 超过一周显示具体日期
      return this.formatDateTime(date, 'MM-DD HH:mm')
    }
  },

  // 计算年龄
  calculateAge(birthDate) {
    if (!birthDate) return ''
    
    const birth = new Date(birthDate)
    const now = new Date()
    const diffTime = Math.abs(now - birth)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays}天`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months}个月`
    } else {
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      return months > 0 ? `${years}年${months}个月` : `${years}年`
    }
  },

  // 检查用户是否为团队管理员
  isTeamAdmin() {
    // 在个人模式下，用户拥有所有权限
    if (this.globalData.userMode === 'personal') {
      return true
    }
    
    // 在团队模式下，检查用户角色
    const userInfo = this.globalData.userInfo
    if (!userInfo || !userInfo.teamRole) {
      return false
    }
    
    // 只有owner和admin才是管理员
    return userInfo.teamRole === 'owner' || userInfo.teamRole === 'admin'
  },

  // 检查是否为超级管理员
  isSuperAdmin() {
    const userInfo = this.globalData.userInfo
    return !!(userInfo && userInfo.role === 'super_admin')
  },

  // 检查用户是否有操作权限（增删改）
  hasOperationPermission() {
    // 超级管理员始终拥有操作权限
    if (this.isSuperAdmin()) return true
    return this.isTeamAdmin()
  }
})
