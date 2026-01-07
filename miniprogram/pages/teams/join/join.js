// pages/teams/join/join.js
const app = getApp();

Page({
  data: {
    inviteCode: '',
    isJoining: false
  },

  onLoad(options) {
    // 如果从其他页面传递了邀请码，自动填入
    if (options.code) {
      this.setData({
        inviteCode: options.code
      });
    }
  },

  // 邀请码输入处理
  onInviteCodeInput(e) {
    const value = e.detail.value.toUpperCase(); // 转换为大写
    this.setData({
      inviteCode: value
    });
  },

  // 清除邀请码
  clearInviteCode() {
    this.setData({
      inviteCode: ''
    });
  },

  // 加入团队
  joinTeam() {
    const { inviteCode, isJoining } = this.data;
    
    if (!inviteCode || inviteCode.length !== 8) {
      wx.showToast({
        title: '请输入8位邀请码',
        icon: 'none'
      });
      return;
    }

    if (isJoining) return;

    this.setData({ isJoining: true });

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
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: '加入团队成功',
            icon: 'success'
          });
          
          // 延迟跳转到团队页面
          setTimeout(() => {
            wx.navigateBack({
              delta: 1,
              success: () => {
                // 通知其他页面刷新团队信息
                app.globalData.needRefresh = true;
              }
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '加入失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('加入团队失败:', error);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ isJoining: false });
      }
    });
  },

  // 创建团队
  createTeam() {
    wx.showModal({
      title: '创建团队',
      editable: true,
      placeholderText: '请输入团队名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const teamName = res.content.trim();
          if (teamName) {
            this.doCreateTeam(teamName);
          } else {
            wx.showToast({
              title: '团队名称不能为空',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 执行创建团队
  doCreateTeam(teamName) {
    wx.showLoading({
      title: '创建中...'
    });

    wx.request({
      url: `${app.globalData.baseUrl}/api/teams`,
      method: 'POST',
      header: {
        'X-OpenID': app.globalData.openid,
        'Content-Type': 'application/json'
      },
      data: {
        name: teamName,
        description: ''
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          wx.showToast({
            title: '团队创建成功',
            icon: 'success'
          });
          
          // 延迟跳转到团队管理页面
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/teams/teams',
              success: () => {
                // 通知其他页面刷新团队信息
                app.globalData.needRefresh = true;
              }
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '创建失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('创建团队失败:', error);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  }
});
