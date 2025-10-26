// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    userInfo: {},
    joinDate: '',
    isEditingNickname: false, // 是否正在编辑昵称
    editNickname: '', // 编辑中的昵称
    userMode: 'personal', // 用户模式
    showModeDialog: false, // 是否显示模式切换弹窗
    selectedMode: 'personal', // 弹窗中选择的模式
    currentTeamName: '', // 当前团队名称
    isTeamAdmin: false, // 是否是团队管理员
    showTeamInfoModal: false, // 是否显示团队信息弹窗
    teamInfo: {}, // 团队详细信息
    showJoinTeamModal: false, // 是否显示加入团队弹窗
    inviteCode: '', // 邀请码输入
    showCreateTeamModal: false, // 是否显示创建团队弹窗
    teamName: '', // 团队名称输入
    teamDescription: '', // 团队描述输入
    // 头像选择相关
    showAvatarModal: false, // 是否显示头像选择弹窗
    avatarOptions: [ // 预设头像选项
      '/images/default-avatar.png',
      '/images/parrot-avatar-blue.svg',
      '/images/parrot-avatar-green.svg',
      '/images/parrot-avatar-orange.svg',
      '/images/parrot-avatar-purple.svg',
      '/images/parrot-avatar-red.svg',
      '/images/parrot-avatar-yellow.svg'
    ],
    selectedAvatar: '' // 当前选择的头像
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus();
    this.loadUserMode(); // 加载用户模式
    this.loadCurrentTeam(); // 加载当前团队信息
    
    // 检查是否需要刷新数据（加入团队或模式切换后）
    if (app.globalData.needRefresh) {
      console.log('Profile页面检测到needRefresh标志，刷新数据');
      app.globalData.needRefresh = false; // 重置标志
      // 重新加载用户模式和团队信息
      this.loadUserMode();
      this.loadCurrentTeam();
      // 如果需要，也可以重新检查登录状态
      this.checkLoginStatus();
    }
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
    // 检查是否支持微信快速登录
    if (wx.getUserProfile) {
      // 支持新版本的微信快速登录
      this.quickWechatLogin()
    } else {
      // 跳转到登录页面
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }
  },

  // 微信快速登录
  quickWechatLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        // 获取用户信息成功，继续获取登录凭证
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 调用后端登录接口
              wx.request({
                url: 'https://bimai.xyz/api/auth/login',
                method: 'POST',
                data: {
                  code: loginRes.code,
                  userInfo: profileRes.userInfo
                },
                header: {
                  'content-type': 'application/json'
                },
                success: (res) => {
                  console.log('快速登录接口响应', res);
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
                      joinDate: this.formatJoinDate(responseUserInfo.created_at || Date.now())
                    });
                    
                    // 登录成功后加载数据
                    
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
      fail: (err) => {
        console.error('获取用户信息失败', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 选择头像
  // 选择头像（已登录用户）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择头像:', avatarUrl);
    
    if (avatarUrl && this.data.isLogin) {
      // 直接上传头像
      this.uploadAvatar(avatarUrl);
    } else if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
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
              userInfo: updatedUserInfo
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
    let envText = ''
    try {
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo?.miniProgram?.envVersion
      const map = { develop: '开发版', trial: '体验版', release: '正式版' }
      envText = map[envVersion] ? `（${map[envVersion]}）` : ''
    } catch (e) {
      // 忽略环境信息错误
    }

    const appVersion = app.globalData.appVersion || '未设置'

    wx.showModal({
      title: '关于应用',
      content: `鹦鹉管家\n版本：${appVersion}${envText}`,
      showCancel: false
    })
  },

  // 显示帮助
  showHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '如有问题或建议，请联系开发者\n微信：15982036295',
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
  },

  // 跳转到团队管理页面
  goToTeams() {
    wx.navigateTo({
      url: '/pages/teams/teams'
    });
  },

  // 跳转到当前团队页面
  goToCurrentTeam() {
    if (!this.data.currentTeamName) {
      wx.showToast({
        title: '请先加入或创建团队',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/teams/teams'
    });
  },

  // 跳转到加入团队页面
  // 显示加入团队弹窗
  goToJoinTeam() {
    this.setData({
      showJoinTeamModal: true,
      inviteCode: ''
    });
  },

  // 显示创建团队弹窗
  goToCreateTeam() {
    this.setData({
      showCreateTeamModal: true,
      teamName: '',
      teamDescription: ''
    });
  },

  // 加载当前团队信息
  loadCurrentTeam() {
    if (!this.data.isLogin) return;
    
    const that = this;
    wx.request({
      url: `${app.globalData.baseUrl}/api/teams/current`,
      method: 'GET',
      header: {
        'X-OpenID': app.globalData.openid
      },
      success: function(res) {
        if (res.data.success && res.data.data) {
          const teamData = res.data.data;
          that.setData({
            currentTeamName: teamData.name,
            isTeamAdmin: teamData.role === 'owner' || teamData.role === 'admin'
          });
        } else {
          that.setData({
            currentTeamName: '',
            isTeamAdmin: false
          });
        }
      },
      fail: function(error) {
        console.error('获取当前团队信息失败:', error);
        that.setData({
          currentTeamName: '',
          isTeamAdmin: false
        });
      }
    });
  },

  // 加载用户模式
  loadUserMode() {
    const userMode = app.globalData.userMode || 'personal'
    this.setData({
      userMode: userMode,
      selectedMode: userMode
    })
  },

  // 防止模态窗口内容区域点击时关闭弹窗
  preventClose() {
    // 空函数，阻止事件冒泡
  },

  // 显示模式切换弹窗
  showModeSwitch() {
    this.setData({
      showModeDialog: true,
      selectedMode: this.data.userMode
    })
  },

  // 隐藏模式切换弹窗
  hideModeDialog() {
    this.setData({
      showModeDialog: false
    })
  },

  // 选择模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      selectedMode: mode
    })
  },

  // 确认模式切换
  confirmModeSwitch() {
    const newMode = this.data.selectedMode
    const that = this
    
    // 先调用后端API更新用户模式
    wx.request({
      url: `${app.globalData.baseUrl}/api/auth/profile`,
      method: 'PUT',
      header: {
        'X-OpenID': app.globalData.openid,
        'Content-Type': 'application/json'
      },
      data: {
        user_mode: newMode
      },
      success: function(res) {
        if (res.data.success) {
          // 后端更新成功，更新前端状态
          app.globalData.userMode = newMode
          wx.setStorageSync('userMode', newMode)
          
          // 更新页面数据
          that.setData({
            userMode: newMode,
            showModeDialog: false
          })
          
          // 显示切换成功提示
          wx.showToast({
            title: `已切换到${newMode === 'personal' ? '个人' : '团队'}模式`,
            icon: 'success'
          })
          
          // 设置需要刷新标志，让其他页面知道模式已切换
          app.globalData.needRefresh = true
          app.globalData.modeChangeTime = Date.now()
          
          console.log('模式切换成功:', newMode)
        } else {
          wx.showToast({
            title: res.data.message || '切换失败',
            icon: 'none'
          })
        }
      },
      fail: function(error) {
        console.error('切换模式失败:', error)
        wx.showToast({
          title: '网络错误，切换失败',
          icon: 'none'
        })
      }
    })
  },

  // 显示团队信息弹窗
  showTeamInfoModal() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!this.data.currentTeamName) {
      wx.showToast({
        title: '您还未加入任何团队',
        icon: 'none'
      })
      return
    }

    this.loadTeamDetailInfo()
  },

  // 加载团队详细信息
  loadTeamDetailInfo() {
    const that = this
    wx.showLoading({
      title: '加载中...'
    })

    wx.request({
      url: `${app.globalData.baseUrl}/api/teams/current`,
      method: 'GET',
      header: {
        'X-OpenID': wx.getStorageSync('openid'),
        'Content-Type': 'application/json'
      },
      success: function(res) {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data.success && res.data.data) {
          const teamData = res.data.data
          that.setData({
            teamInfo: {
              id: teamData.id, // 添加团队ID
              name: teamData.name || '未知团队',
              description: teamData.description || '暂无描述',
              memberCount: teamData.member_count || 0,
              createdAt: that.formatDate(teamData.created_at),
              myRole: that.getRoleDisplayName(teamData.role || 'member')
            },
            showTeamInfoModal: true
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取团队信息失败',
            icon: 'none'
          })
        }
      },
      fail: function(error) {
        wx.hideLoading()
        console.error('获取团队详细信息失败:', error)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 隐藏团队信息弹窗
  hideTeamInfoModal() {
    this.setData({
      showTeamInfoModal: false
    })
  },

  // 退出团队
  leaveTeam() {
    const that = this
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前团队吗？退出后将无法查看团队数据。',
      confirmText: '退出',
      confirmColor: '#ff4757',
      success: function(res) {
        if (res.confirm) {
          that.performLeaveTeam()
        }
      }
    })
  },

  // 执行退出团队操作
  performLeaveTeam() {
    const that = this
    const { teamInfo } = this.data
    
    if (!teamInfo.id) {
      wx.showToast({
        title: '团队信息错误',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '退出中...'
    })

    wx.request({
      url: `${app.globalData.baseUrl}/api/teams/${teamInfo.id}/leave`,
      method: 'POST',
      header: {
        'X-OpenID': wx.getStorageSync('openid'),
        'Content-Type': 'application/json'
      },
      success: function(res) {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '已退出团队',
            icon: 'success'
          })
          
          // 隐藏弹窗并刷新团队信息
          that.setData({
            showTeamInfoModal: false,
            currentTeamName: '',
            isTeamAdmin: false,
            teamInfo: {}
          })
          
          // 刷新当前团队信息
          that.loadCurrentTeam()
        } else {
          wx.showToast({
            title: res.data.message || '退出失败',
            icon: 'none'
          })
        }
      },
      fail: function(error) {
        wx.hideLoading()
        console.error('退出团队失败:', error)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '未知'
    const date = new Date(dateString)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  // 获取角色显示名称
  getRoleDisplayName(role) {
    const roleMap = {
      'owner': '创建者',
      'admin': '管理员', 
      'member': '成员'
    }
    return roleMap[role] || '成员'
  },

  // 隐藏加入团队弹窗
  hideJoinTeamModal() {
    this.setData({
      showJoinTeamModal: false,
      inviteCode: ''
    });
  },

  // 邀请码输入处理
  onInviteCodeInput(e) {
    this.setData({
      inviteCode: e.detail.value.trim().toUpperCase()
    });
  },

  // 确认加入团队
  confirmJoinTeam() {
    const { inviteCode } = this.data;
    
    if (!inviteCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    if (inviteCode.length !== 8) {
      wx.showToast({
        title: '邀请码格式不正确',
        icon: 'none'
      });
      return;
    }

    const that = this;
    wx.showLoading({
      title: '加入中...'
    });

    wx.request({
      url: `${app.globalData.baseUrl}/api/teams/join`,
      method: 'POST',
      header: {
        'X-OpenID': app.globalData.openid,
        'Content-Type': 'application/json'
      },
      data: {
        invite_code: inviteCode
      },
      success: function(res) {
        wx.hideLoading();
        if (res.data.success) {
          wx.showToast({
            title: '加入团队成功',
            icon: 'success'
          });
          
          // 隐藏弹窗
          that.hideJoinTeamModal();
          
          // 重新加载当前团队信息
          that.loadCurrentTeam();
        } else {
          wx.showToast({
            title: res.data.message || '加入团队失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        wx.hideLoading();
        console.error('加入团队失败:', error);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 隐藏创建团队弹窗
  hideCreateTeamModal() {
    this.setData({
      showCreateTeamModal: false,
      teamName: '',
      teamDescription: ''
    });
  },

  // 团队名称输入
  onTeamNameInput(e) {
    this.setData({
      teamName: e.detail.value
    });
  },

  // 团队描述输入
  onTeamDescriptionInput(e) {
    this.setData({
      teamDescription: e.detail.value
    });
  },

  // 确认创建团队
  confirmCreateTeam() {
    const { teamName, teamDescription } = this.data;
    
    if (!teamName.trim()) {
      wx.showToast({
        title: '请输入团队名称',
        icon: 'none'
      });
      return;
    }

    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: 'https://bimai.xyz/api/teams',
      method: 'POST',
      header: {
        'X-OpenID': openid,
        'Content-Type': 'application/json'
      },
      data: {
        name: teamName.trim(),
        description: teamDescription.trim()
      },
      success: (res) => {
        console.log('创建团队响应:', res);
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
          this.setData({
            showCreateTeamModal: false,
            teamName: '',
            teamDescription: ''
          });
          // 刷新团队列表
          this.loadCurrentTeam();
        } else {
          wx.showToast({
            title: res.data.message || '创建团队失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('创建团队失败:', err);
        wx.showToast({
          title: '创建团队失败',
          icon: 'none'
        });
      }
    });
  },

  // 头像选择相关方法
  // 切换头像编辑状态
  toggleAvatarEdit() {
    if (!this.data.isEditingNickname) {
      return; // 只有在编辑昵称状态下才能选择头像
    }
    this.setData({
      showAvatarModal: true,
      selectedAvatar: this.data.userInfo.avatar_url || '/images/default-avatar.png'
    });
  },

  // 隐藏头像选择弹窗
  hideAvatarModal() {
    this.setData({
      showAvatarModal: false,
      selectedAvatar: ''
    });
  },

  // 选择头像
  selectAvatar(e) {
    const avatar = e.currentTarget.dataset.avatar;
    this.setData({
      selectedAvatar: avatar
    });
  },

  // 确认头像更改
  confirmAvatarChange() {
    if (!this.data.selectedAvatar) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      });
      return;
    }

    // 调用后端API更新头像
    wx.request({
      url: 'https://bimai.xyz/api/auth/profile',
      method: 'PUT',
      data: {
        avatar_url: this.data.selectedAvatar
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
            avatar_url: this.data.selectedAvatar
          };
          
          wx.setStorageSync('userInfo', updatedUserInfo);
          app.globalData.userInfo = updatedUserInfo;
          
          this.setData({
            userInfo: updatedUserInfo,
            showAvatarModal: false,
            selectedAvatar: ''
          });
          
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '头像更新失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新头像失败', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 防止弹窗关闭
  preventClose() {
    // 空方法，防止点击弹窗内容区域时关闭弹窗
  }
})

