// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    userInfo: {},
    joinDate: '',
    tempAvatarUrl: '', // 临时头像URL
    tempNickname: ''   // 临时昵称
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh()
  },

  // 检查登录状态
  checkLoginStatus() {
    const openid = wx.getStorageSync('openid')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (openid && userInfo) {
      this.setData({
        isLogin: true,
        userInfo: userInfo,
        joinDate: this.formatJoinDate(userInfo.createTime)
      })
    } else {
      this.setData({
        isLogin: false
      })
    }
  },

  // 格式化加入时间
  formatJoinDate(createTime) {
    if (!createTime) return '未知'
    const date = new Date(createTime)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },



  // 处理登录
  handleLogin() {
    // 检查是否输入了昵称
    if (!this.data.tempNickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    // 先获取微信登录code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 准备用户信息
          const userInfo = {
            nickName: this.data.tempNickname.trim(),
            avatarUrl: this.data.tempAvatarUrl || '/images/default-avatar.svg'
          };
          
          // 调用后端登录接口
          wx.request({
            url: 'http://127.0.0.1:5085/api/auth/login',
            method: 'POST',
            data: {
              code: loginRes.code,
              userInfo: userInfo
            },
            header: {
              'content-type': 'application/json'
            },
            success: (res) => {
              console.log('登录接口响应', res);
              if (res.data.success) {
                const responseUserInfo = res.data.data.user;
                
                // 存储用户信息和openid
                wx.setStorageSync('userInfo', responseUserInfo);
                wx.setStorageSync('openid', responseUserInfo.openid);
                
                // 更新全局状态
                app.globalData.userInfo = responseUserInfo;
                app.globalData.openid = responseUserInfo.openid;
                app.globalData.isLogin = true;
                
                this.setData({
                  isLogin: true,
                  userInfo: responseUserInfo,
                  joinDate: this.formatJoinDate(responseUserInfo.created_at || Date.now()),
                  tempAvatarUrl: '', // 清空临时数据
                  tempNickname: ''
                });
                
                this.loadUserStats();
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: res.data.message || '登录失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('登录接口调用失败', err);
              wx.showToast({
                title: '网络错误，请检查网络连接',
                icon: 'none'
              });
            }
          });
        } else {
          wx.showToast({
            title: '获取登录凭证失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('微信登录失败', err);
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择头像:', avatarUrl);
    
    if (avatarUrl) {
      this.setData({
        tempAvatarUrl: avatarUrl
      });
      wx.showToast({
        title: '头像已选择',
        icon: 'success',
        duration: 1000
      });
    } else {
      wx.showToast({
        title: '头像选择失败',
        icon: 'none'
      });
    }
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('openid')
          wx.removeStorageSync('userInfo')
          
          // 清理全局状态
          app.globalData.userInfo = null
          app.globalData.openid = null
          app.globalData.isLogin = false
          
          this.setData({
            isLogin: false,
            userInfo: {},
            stats: {
              totalParrots: 0,
              totalRecords: 0,
              totalDays: 0,
              totalExpense: 0
            }
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },



  // 显示设置
  showSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于应用',
      content: '鹦鹉管家 v1.0\n专业的鹦鹉饲养管理工具\n帮助您更好地照顾您的鹦鹉朋友',
      showCancel: false
    })
  },

  // 显示帮助
  showHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '如有问题或建议，请联系开发者\n邮箱：support@parrotkeeper.com',
      showCancel: false
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？这不会影响您的数据。',
      success: (res) => {
        if (res.confirm) {
          // 清除非关键缓存数据
          wx.clearStorage({
            success: () => {
              // 重新设置登录信息
              if (this.data.isLogin) {
                wx.setStorageSync('openid', wx.getStorageSync('openid'))
                wx.setStorageSync('userInfo', this.data.userInfo)
              }
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  }
})