// app.js
const { notificationManager } = require('./utils/notification.js')

App({
  globalData: {
    userInfo: null,
    openid: null,
    // 动态设置，默认正式环境，开发工具中自动切换为本地
    baseUrl: 'https://bimai.xyz', // 后端API地址（默认正式环境）
    //baseUrl: 'http://192.168.0.80:5075', // 后端API地址（默认开发环境，与 .env 端口一致）
    isLogin: false,
    userMode: 'personal', // 添加用户模式，默认为个人模式
    needRefresh: false, // 页面数据刷新标志（模式变更时触发）
    appVersion: '1.0.0', // 小程序版本号（通过微信API动态获取）
    notificationManager, // 全局通知管理器
    notificationUpdateCallback: null, // 通知更新回调
    // 反馈徽标同步：用于底部导航“个人中心”显示红点
    hasUnreadFeedback: false,
    feedbackBadgeUpdateCallback: null,
    platformInfo: { isIOS: false, system: '' },
    useIconFont: true, // 是否启用图标字体（iOS优先启用，统一兼容）
    // 网络与重试队列
    networkConnected: true,
    pendingRequests: [],
    pendingForms: [],
    imageCacheTTL: 604800000
  },

  // 初始化小程序版本号（优先使用微信官方版本号）
  initAppVersion() {
    try {
      const accountInfo = wx.getAccountInfoSync()
      if (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.version) {
        this.globalData.appVersion = accountInfo.miniProgram.version
        console.log('获取到小程序版本号:', this.globalData.appVersion)
        return true
      } else {
        console.log('无法获取小程序版本号，使用默认版本号')
        return false
      }
    } catch (e) {
      console.error('获取小程序版本号失败:', e)
      return false
    }
  },

  // 通过后端API获取版本号（作为后备方案）
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
    
    // 先初始化平台与后端地址，再获取版本号
    this.initPlatformInfo()
    this.initBaseUrl()
    // 获取版本号：优先微信API，其次后端API
    const wxVersionSuccess = this.initAppVersion()
    if (!wxVersionSuccess) {
      this.fetchServerVersion()
    }
    
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

    // 初始化网络状态与重试监听
    try {
      wx.getNetworkType({
        success: (res) => {
          this.globalData.networkConnected = res.networkType !== 'none'
        }
      })
      if (wx.onNetworkStatusChange) {
        wx.onNetworkStatusChange((res) => {
          this.globalData.networkConnected = res.isConnected
          if (res.isConnected) {
            this.processPendingRequests()
            this.processPendingForms()
          }
        })
      }
      const saved = wx.getStorageSync('pending_requests') || []
      if (Array.isArray(saved) && saved.length) {
        this.globalData.pendingRequests = saved
        if (this.globalData.networkConnected) {
          this.processPendingRequests()
        }
      }
      const savedForms = wx.getStorageSync('pending_forms') || []
      if (Array.isArray(savedForms) && savedForms.length) {
        this.globalData.pendingForms = savedForms
        if (this.globalData.networkConnected) {
          this.processPendingForms()
        }
      }
    } catch (_) {}
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

  // 根据环境初始化后端 API 基础地址
  initBaseUrl() {
    try {
      // 允许通过本地存储覆盖（便于开发时临时切换）
      const stored = wx.getStorageSync('apiBaseUrl')
      if (stored && typeof stored === 'string') {
        this.globalData.baseUrl = stored
        console.log('使用存储覆盖的 API 地址:', this.globalData.baseUrl)
        return
      }

      // 微信提供的环境标识：develop | trial | release
      let envVersion = 'develop'
      try {
        const account = wx.getAccountInfoSync && wx.getAccountInfoSync()
        if (account && account.miniProgram && account.miniProgram.envVersion) {
          envVersion = account.miniProgram.envVersion
        }
      } catch (_) {}

      // 各环境默认地址（可按需调整）
      const DEFAULT_RELEASE = 'https://bimai.xyz'
      const DEFAULT_TRIAL = DEFAULT_RELEASE
      // 开发环境建议填写你本机在局域网的 IP 与端口
      const DEFAULT_DEVELOP = 'http://192.168.0.102:5075'

      if (envVersion === 'release') {
        this.globalData.baseUrl = DEFAULT_RELEASE
      } else if (envVersion === 'trial') {
        this.globalData.baseUrl = DEFAULT_TRIAL
      } else {
        this.globalData.baseUrl = DEFAULT_DEVELOP
      }

      console.log('环境:', envVersion, 'API 地址:', this.globalData.baseUrl)
    } catch (e) {
      console.warn('初始化 API 地址失败，使用内置默认值:', e)
      // 保持 globalData.baseUrl 的默认值
    }
  },

  hashString(s) {
    const str = String(s)
    let h1 = 0xdeadbeef ^ str.length
    let h2 = 0x41c6ce57 ^ str.length
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = (h1 ^ Math.imul(h2, 1566083941)) >>> 0
    h2 = (h2 ^ Math.imul(h1, 1859775393)) >>> 0
    const toHex = (n) => ('00000000' + n.toString(16)).slice(-8)
    return toHex(h1) + toHex(h2)
  },

  ensureImageCacheDir() {
    try {
      const fs = wx.getFileSystemManager()
      const base = wx.env.USER_DATA_PATH + '/image-cache'
      try { fs.accessSync(base) } catch (_) { try { fs.mkdirSync(base, true) } catch (_) {} }
      return base
    } catch (_) {
      return ''
    }
  },

  getImageCacheIndex() {
    try { return wx.getStorageSync('image_cache_index') || {} } catch (_) { return {} }
  },

  setImageCacheIndex(idx) {
    try { wx.setStorageSync('image_cache_index', idx || {}) } catch (_) {}
  },

  getCachedLocalPath(url) {
    try {
      const idx = this.getImageCacheIndex()
      const key = this.hashString(url)
      const rec = idx[key]
      if (!rec) return ''
      const ttl = this.globalData.imageCacheTTL || 604800000
      const valid = typeof rec.ts === 'number' && (Date.now() - rec.ts) < ttl
      if (!valid) return ''
      const fs = wx.getFileSystemManager()
      try { fs.accessSync(rec.path) } catch (_) { return '' }
      return rec.path || ''
    } catch (_) {
      return ''
    }
  },

  cacheImageAsync(url) {
    try {
      this._imageCachingSet = this._imageCachingSet || new Set()
      if (this._imageCachingSet.has(url)) return
      this._imageCachingSet.add(url)
      const dir = this.ensureImageCacheDir()
      if (!dir) { this._imageCachingSet.delete(url); return }
      const key = this.hashString(url)
      wx.downloadFile({
        url,
        success: (res) => {
          const tf = res.tempFilePath
          if (!tf) { this._imageCachingSet.delete(url); return }
          const fs = wx.getFileSystemManager()
          const target = `${dir}/${key}.img`
          try {
            fs.saveFile({ tempFilePath: tf, filePath: target, success: (r) => {
              const saved = r.savedFilePath || target
              const idx = this.getImageCacheIndex()
              idx[key] = { url, path: saved, ts: Date.now() }
              this.setImageCacheIndex(idx)
              this._imageCachingSet.delete(url)
            }, fail: () => { this._imageCachingSet.delete(url) } })
          } catch (_) { this._imageCachingSet.delete(url) }
        },
        fail: () => { this._imageCachingSet.delete(url) }
      })
    } catch (_) {}
  },

  // 未读反馈状态更新（同步到底部导航红点）
  setFeedbackUnread(flag) {
    try {
      this.globalData.hasUnreadFeedback = !!flag
      const cb = this.globalData.feedbackBadgeUpdateCallback
      if (typeof cb === 'function') cb()
    } catch (_) {}
  },


  // 解析后端上传图片的URL：支持相对路径与完整URL
  resolveUploadUrl(path) {
    if (!path) return ''
    const str = String(path)
    if (/^https?:\/\//.test(str)) {
      if (/^https?:\/\/([^.]*\.)?bimai\.xyz\//.test(str)) {
        const cached = this.getCachedLocalPath(str)
        if (cached) return cached
        this.cacheImageAsync(str)
        return str
      }
      const m = str.match(/\/uploads\/(.+)$/)
      if (m && m[1]) {
        const suffix = m[1].replace(/^images\/?/, '')
        const finalUrl = this.globalData.baseUrl + '/uploads/' + suffix
        const cached = this.getCachedLocalPath(finalUrl)
        if (cached) return cached
        this.cacheImageAsync(finalUrl)
        return finalUrl
      }
      return str
    }
    if (/^\/?images\//.test(str)) {
      return str.startsWith('/') ? str : '/' + str
    }
    const normalized = str
      .replace(/^\/?uploads\/?images\/?/, '')
      .replace(/^\/?uploads\/?/, '')
    const finalUrl = this.globalData.baseUrl + '/uploads/' + normalized
    const cached = this.getCachedLocalPath(finalUrl)
    if (cached) return cached
    this.cacheImageAsync(finalUrl)
    return finalUrl
  },

  getThumbnailUrl(url, size) {
    if (!url) return ''
    const s = Number(size) || 0
    const str = String(url)
    try {
      // 本地缓存文件不做缩略图转换
      if (/^(wxfile|ttfile):\/\//.test(str)) {
        return str
      }
      // 仅处理 uploads 路径
      const mThumb = str.match(/\/(uploads\/thumbs)\/(\d+)\/(.+)$/)
      if (mThumb) {
        const rel = mThumb[3]
        const sz = s > 0 ? s : Number(mThumb[2]) || 0
        if (sz > 0) {
          return str.replace(/\/uploads\/thumbs\/\d+\//, `/uploads/thumbs/${sz}/`)
        }
        return str
      }
      const m = str.match(/\/(uploads)\/(.+)$/)
      if (!m) {
        return str
      }
      // 去掉 images/ 前缀，统一为 uploads/thumbs/{size}/{relative}
      let rel = m[2].replace(/^images\//, '')
      const sz = s > 0 ? s : 128
      const base = str.split('/uploads/')[0]
      return `${base}/uploads/thumbs/${sz}/${rel}`
    } catch (_) {
      return str
    }
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
                    
                    // 如果返回的消息中包含签到信息，显示提示
                    if (response.message && response.message.includes('签到积分')) {
                      setTimeout(() => {
                        wx.showToast({
                          title: response.message,
                          icon: 'success',
                          duration: 2000
                        })
                      }, 500)
                    }
                    
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
    try { this.setFeedbackUnread(false) } catch(_) {}
    
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
          const errMsg = (err && err.errMsg) ? String(err.errMsg) : ''
          const isNetworkErr = !this.globalData.networkConnected || /fail|timeout|network/i.test(errMsg)
          const isWriteOp = ['POST', 'PUT', 'DELETE'].includes(String(method).toUpperCase())
          if (isNetworkErr && isWriteOp) {
            this.enqueueRequest({ url, method, data, header })
            wx.showToast({ title: '已缓存，网络恢复后自动重试', icon: 'none' })
            resolve({ success: false, offlineQueued: true, message: '已加入离线重试队列' })
          } else {
            wx.showToast({ title: '网络错误', icon: 'none' })
            reject(err)
          }
        }
      })
    })
  },

  // 加入离线重试队列
  enqueueRequest(req) {
    try {
      const item = { ...req, tryCount: 0 }
      const list = this.globalData.pendingRequests || []
      list.push(item)
      this.globalData.pendingRequests = list
      wx.setStorageSync('pending_requests', list)
    } catch (_) {}
  },

  // 处理离线队列
  async processPendingRequests() {
    const queue = this.globalData.pendingRequests || []
    if (!this.globalData.networkConnected || !queue.length) return
    while (queue.length && this.globalData.networkConnected) {
      const item = queue[0]
      const { url, method, data, header } = item
      try {
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: (this.globalData.baseUrl || '') + url,
            method,
            data,
            header: { 'Content-Type': 'application/json', ...(header || {}) },
            success: r => resolve(r),
            fail: e => reject(e)
          })
        })
        if (res.statusCode === 200) {
          queue.shift()
          wx.setStorageSync('pending_requests', queue)
          try {
            const nm = this.globalData.notificationManager
            if (nm) nm.addLocalNotification('离线提交', '网络恢复后已成功提交一条记录')
          } catch (_) {}
        } else {
          queue.shift()
          wx.setStorageSync('pending_requests', queue)
        }
      } catch (e) {
        item.tryCount = (item.tryCount || 0) + 1
        await this.retryDelay(item.tryCount)
        if (!this.globalData.networkConnected) break
      }
    }
  },

  // 指数退避延迟
  retryDelay(tryCount) {
    const base = 500
    const cap = 8000
    const ms = Math.min(cap, base * Math.pow(2, Math.max(0, tryCount - 1)))
    return new Promise((r) => setTimeout(r, ms))
  },

  // 入队：表单记录（含本地照片路径），网络恢复后自动上传照片并提交
  enqueueFormRecord(form) {
    try {
      const item = { ...form, tryCount: 0 }
      const list = this.globalData.pendingForms || []
      list.push(item)
      this.globalData.pendingForms = list
      wx.setStorageSync('pending_forms', list)
    } catch (_) {}
  },

  // 处理待提交的表单记录（支持上传本地照片）
  async processPendingForms() {
    const queue = this.globalData.pendingForms || []
    if (!this.globalData.networkConnected || !queue.length) return
    while (queue.length && this.globalData.networkConnected) {
      const item = queue[0]
      const { url, method, data, localPhotos = [], category = 'records/others', header = {} } = item
      try {
        // 先上传本地照片（若有）
        const photoUrls = []
        for (const p of (localPhotos || [])) {
          const isFull = typeof p === 'string' && (p.startsWith('http') || p.includes('/uploads/'))
          if (isFull) { photoUrls.push(p); continue }
          const uploadRes = await new Promise((resolve, reject) => {
            wx.uploadFile({
              url: (this.globalData.baseUrl || '') + '/api/upload/image',
              filePath: p,
              name: 'file',
              formData: { category },
              header: { 'X-OpenID': this.globalData.openid },
              success: resolve,
              fail: reject
            })
          })
          const dataU = JSON.parse(uploadRes.data)
          if (dataU && dataU.success && dataU.data && dataU.data.url) {
            const fullUrl = (this.globalData.baseUrl || '') + '/uploads/' + dataU.data.url
            photoUrls.push(fullUrl)
          } else {
            throw new Error((dataU && dataU.message) || '图片上传失败')
          }
        }
        const payload = { ...(data || {}), photos: photoUrls }
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: (this.globalData.baseUrl || '') + url,
            method,
            data: payload,
            header: { 'Content-Type': 'application/json', ...(header || {}) },
            success: r => resolve(r),
            fail: e => reject(e)
          })
        })
        if (res.statusCode === 200) {
          queue.shift()
          wx.setStorageSync('pending_forms', queue)
        } else {
          queue.shift()
          wx.setStorageSync('pending_forms', queue)
        }
      } catch (e) {
        item.tryCount = (item.tryCount || 0) + 1
        await this.retryDelay(item.tryCount)
        if (!this.globalData.networkConnected) break
      }
    }
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
    let d = new Date(date)
    if (isNaN(d.getTime())) {
      const s = String(date)
      d = new Date(s.replace(/-/g, '/').replace('T', ' '))
    }
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
    let d = new Date(date)
    if (isNaN(d.getTime())) {
      const s = String(date)
      d = new Date(s.replace(/-/g, '/').replace('T', ' '))
    }
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
