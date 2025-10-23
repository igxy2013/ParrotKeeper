// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    baseUrl: 'https://bimai.xyz', // 后端API地址
    isLogin: false,
    userMode: 'personal' // 添加用户模式，默认为个人模式
  },

  onLaunch() {
    console.log('小程序启动')
    
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
      
      wx.request({
        url: this.globalData.baseUrl + url,
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
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading()
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
  }
})