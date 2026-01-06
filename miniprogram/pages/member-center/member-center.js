const app = getApp()

Page({
  data: {
    isPro: false,
    expireDate: '',
    code: '',
    userInfo: null,
    showApplyModal: false,
    membershipName: '',
    membershipTag: '',
    tierClass: ''
  },

  onShow() {
    this.checkStatus()
  },

  checkStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
        this.updateStatusFromUserInfo(userInfo);
    }
  },
  
  updateStatusFromUserInfo(userInfo) {
      const isPro = userInfo.subscription_tier === 'pro' || userInfo.subscription_tier === 'team'
      const expireStr = userInfo.subscription_expire_at || ''
      const durationDays = Number(userInfo.membership_duration_days || 0)
      let membershipName = ''
      let membershipTag = ''
      let tierClass = ''
      if (isPro) {
        if (userInfo.subscription_tier === 'team') {
          membershipTag = '团队'
          tierClass = 'team'
        } else if (userInfo.subscription_tier === 'pro') {
          membershipTag = '个人'
          tierClass = 'pro'
        }
        if (userInfo.membership_label) {
          membershipName = userInfo.membership_label
        } else if (durationDays > 0) {
          if (durationDays >= 36500) membershipName = '永久会员'
          else if (durationDays >= 365) membershipName = '年卡会员'
          else if (durationDays >= 30) membershipName = '月卡会员'
          else membershipName = '高级会员'
        } else if (expireStr) {
          try {
            const now = Date.now()
            const exp = new Date(String(expireStr).replace(' ', 'T')).getTime()
            const days = Math.round((exp - now) / (24 * 60 * 60 * 1000))
            if (days >= 36500) membershipName = '永久会员'
            else if (days >= 360) membershipName = '年卡会员'
            else if (days >= 25) membershipName = '月卡会员'
            else membershipName = '高级会员'
          } catch (_) {
            membershipName = '高级会员'
          }
        } else {
          membershipName = '高级会员'
        }
      }
      this.setData({
          userInfo: userInfo,
          isPro,
          expireDate: expireStr ? expireStr.substring(0, 10) : '',
          membershipName,
          membershipTag,
          tierClass
      });
  },

  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    })
  },

  async handleRedeem() {
    if (!this.data.code) return;
    
    wx.showLoading({ title: '兑换中...' });
    
    try {
      const res = await app.request({
        url: '/api/redemption/redeem',
        method: 'POST',
        data: {
          code: this.data.code
        }
      });
      
      wx.hideLoading();
      
      if (res && res.success) {
        wx.showToast({
          title: '兑换成功',
          icon: 'success'
        });
        
        let newUserInfo = wx.getStorageSync('userInfo') || {};
        if (res.data) {
           newUserInfo = { ...newUserInfo, subscription_tier: res.data.tier, subscription_expire_at: res.data.expire_at };
           if (res.data.plan_label) newUserInfo.membership_label = res.data.plan_label;
           if (typeof res.data.duration_days === 'number') newUserInfo.membership_duration_days = res.data.duration_days;
        }
        try {
          const profileRes = await app.request({ url: '/api/auth/profile', method: 'GET' });
          if (profileRes && profileRes.success && profileRes.data) {
            newUserInfo = profileRes.data;
          }
        } catch (_) {}
        wx.setStorageSync('userInfo', newUserInfo);
        if (app.globalData) {
            app.globalData.userInfo = newUserInfo;
            app.globalData.needRefresh = true;
        }
        this.updateStatusFromUserInfo(newUserInfo);
        this.setData({ code: '' });
        
      } else {
        wx.showToast({
          title: res.message || '兑换失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      try {
        const msg = String((err && err.message) || '').trim();
        let hint = msg || '兑换失败';
        if (/过期/.test(msg)) {
          hint = '兑换码已过期，请申请新的兑换码';
        } else if (/已被使用/.test(msg)) {
          hint = '兑换码已使用，请更换其他兑换码';
        } else if (/无效/.test(msg)) {
          hint = '兑换码无效，请检查输入或申请新的兑换码';
        }
        wx.showToast({ title: hint, icon: 'none' });
      } catch(_) {
        wx.showToast({ title: '兑换失败', icon: 'none' });
      }
    }
  }
  ,
  openApplyModal() {
    this.setData({ showApplyModal: true })
  },
  closeApplyModal() {
    this.setData({ showApplyModal: false })
  },
  copyContact() {
    wx.setClipboardData({
      data: 'parrotkepper',
      success: () => {
        wx.showToast({ title: '已复制客服ID', icon: 'none' })
        this.setData({ showApplyModal: false })
      }
    })
  }
})
