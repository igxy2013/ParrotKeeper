// pages/teams/create/create.js
Page({
  data: {
    teamName: '',
    teamDescription: '',
    isCreating: false
  },

  onLoad(options) {
    // 页面加载时的初始化
  },

  onShow() {
    // 页面显示时重置表单
    this.setData({
      teamName: '',
      teamDescription: '',
      isCreating: false
    });
  },

  /**
   * 团队名称输入处理
   */
  onTeamNameInput(e) {
    this.setData({
      teamName: e.detail.value.trim()
    });
  },

  /**
   * 团队描述输入处理
   */
  onTeamDescriptionInput(e) {
    this.setData({
      teamDescription: e.detail.value.trim()
    });
  },

  /**
   * 创建团队
   */
  async createTeam() {
    const { teamName, teamDescription, isCreating } = this.data;
    
    // 防止重复提交
    if (isCreating) return;
    
    // 验证团队名称
    if (!teamName || teamName.length === 0) {
      wx.showToast({
        title: '请输入团队名称',
        icon: 'none'
      });
      return;
    }

    if (teamName.length > 20) {
      wx.showToast({
        title: '团队名称不能超过20个字符',
        icon: 'none'
      });
      return;
    }

    // 验证团队描述长度
    if (teamDescription.length > 100) {
      wx.showToast({
        title: '团队描述不能超过100个字符',
        icon: 'none'
      });
      return;
    }

    this.setData({ isCreating: true });

    try {
      // 调用创建团队API
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.baseUrl}/api/teams/create`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: teamName,
            description: teamDescription || ''
          },
          success: resolve,
          fail: reject
        });
      });

      if (response.statusCode === 200 && response.data.success) {
        wx.showToast({
          title: '团队创建成功',
          icon: 'success'
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          // 跳转到团队管理页面
          wx.navigateTo({
            url: '/pages/teams/teams'
          });
        }, 1500);

      } else {
        throw new Error(response.data.message || '创建团队失败');
      }

    } catch (error) {
      console.error('创建团队失败:', error);
      
      let errorMessage = '创建团队失败';
      if (error.data && error.data.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isCreating: false });
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});