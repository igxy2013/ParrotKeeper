// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    userInfo: {},
    joinDate: '',
    tempAvatarUrl: '', // 临时头像URL
    tempNickname: '',   // 临时昵称
    isEditingNickname: false, // 是否正在编辑昵称
    editNickname: '' // 编辑中的昵称
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus();
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
        joinDate: this.formatJoinDate(userInfo.created_at || userInfo.createTime)
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
            url: 'https://bimai.xyz/api/auth/login',
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
                
                // 直接使用后端返回的用户信息
                const userInfo = {
                  nickname: responseUserInfo.nickname,
                  avatar_url: responseUserInfo.avatar_url,
                  openid: responseUserInfo.openid,
                  created_at: responseUserInfo.created_at
                };
                
                // 存储用户信息和openid
                wx.setStorageSync('userInfo', userInfo);
                wx.setStorageSync('openid', responseUserInfo.openid);
                
                // 更新全局状态
                app.globalData.userInfo = userInfo;
                app.globalData.openid = responseUserInfo.openid;
                app.globalData.isLogin = true;
                
                this.setData({
                  isLogin: true,
                  userInfo: userInfo,
                  joinDate: this.formatJoinDate(responseUserInfo.created_at || Date.now()),
                  tempAvatarUrl: '', // 清空临时数据
                  tempNickname: ''
                });
                
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
      // 先设置临时头像
      this.setData({
        tempAvatarUrl: avatarUrl
      });
      
      // 如果用户已登录，直接上传头像
      if (this.data.isLogin) {
        this.uploadAvatar(avatarUrl);
      } else {
        wx.showToast({
          title: '头像已选择',
          icon: 'success',
          duration: 1000
        });
      }
    } else {
      wx.showToast({
        title: '头像选择失败',
        icon: 'none'
      });
    }
  },

  // 上传头像
  async uploadAvatar(avatarUrl) {
    wx.showLoading({
      title: '上传头像中...'
    });

    try {
      // 上传头像文件
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://bimai.xyz/api/upload/image',
          filePath: avatarUrl,
          name: 'file',
          header: {
            'X-OpenID': this.data.userInfo.openid
          },
          success: resolve,
          fail: reject
        });
      });

      const result = JSON.parse(uploadRes.data);
      if (result.success) {
        // 更新用户头像
        await this.updateUserAvatar(result.data.url);
      } else {
        throw new Error(result.message || '头像上传失败');
      }
    } catch (error) {
      console.error('头像上传失败:', error);
      wx.showToast({
        title: error.message || '头像上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 更新用户头像
  async updateUserAvatar(avatarUrl) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://bimai.xyz/api/auth/profile',
        method: 'PUT',
        data: {
          avatar_url: avatarUrl
        },
        header: {
          'content-type': 'application/json',
          'X-OpenID': this.data.userInfo.openid
        },
        success: (res) => {
          if (res.data.success) {
            // 更新本地存储和页面数据
            const updatedUserInfo = {
              ...this.data.userInfo,
              avatar_url: avatarUrl
            };
            
            wx.setStorageSync('userInfo', updatedUserInfo);
            app.globalData.userInfo = updatedUserInfo;
            
            this.setData({
              userInfo: updatedUserInfo,
              tempAvatarUrl: ''
            });
            
            wx.showToast({
              title: '头像更新成功',
              icon: 'success'
            });
            resolve(res.data);
          } else {
            reject(new Error(res.data.message || '头像更新失败'));
          }
        },
        fail: (err) => {
          console.error('更新头像失败', err);
          reject(new Error('网络错误，请重试'));
        }
      });
    });
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
  },

  // 切换昵称编辑状态
  toggleNicknameEdit() {
    const currentNickname = this.data.userInfo.nickname || '';
    this.setData({
      isEditingNickname: !this.data.isEditingNickname,
      editNickname: currentNickname
    });
  },

  // 昵称编辑输入
  onEditNicknameInput(e) {
    this.setData({
      editNickname: e.detail.value
    });
  },

  // 保存昵称
  saveNickname() {
    const newNickname = this.data.editNickname.trim();
    if (!newNickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      });
      return;
    }

    // 调用后端API更新昵称
    wx.request({
      url: 'https://bimai.xyz/api/auth/profile',
      method: 'PUT',
      data: {
        nickname: newNickname
      },
      header: {
        'content-type': 'application/json',
        'X-OpenID': this.data.userInfo.openid
      },
      success: (res) => {
        if (res.data.success) {
          // 更新本地存储和页面数据
          const updatedUserInfo = {
            ...this.data.userInfo,
            nickname: newNickname
          };
          
          wx.setStorageSync('userInfo', updatedUserInfo);
          app.globalData.userInfo = updatedUserInfo;
          
          this.setData({
            userInfo: updatedUserInfo,
            isEditingNickname: false,
            editNickname: ''
          });
          
          wx.showToast({
            title: '昵称更新成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '更新失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新昵称失败', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 取消昵称编辑
  cancelNicknameEdit() {
    this.setData({
      isEditingNickname: false,
      editNickname: ''
    });
  }
})