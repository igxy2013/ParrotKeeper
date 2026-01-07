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
    this.refreshProfile()
  },
  
  updateStatusFromUserInfo(userInfo) {
      const mode = app.globalData.userMode || wx.getStorageSync('userMode') || 'personal'
      const effectiveTier = app.getEffectiveTier()
      const isPro = effectiveTier === 'pro' || effectiveTier === 'team'
      const expireStr = userInfo.subscription_expire_at || ''
      const durationDays = Number(userInfo.membership_duration_days || 0)
      let membershipName = ''
      let membershipTag = ''
      let tierClass = ''
      if (isPro) {
        if (effectiveTier === 'team' && mode === 'team') {
          const teamLevel = this._getUserTeamLevel(userInfo)
          if (teamLevel === 'advanced') {
            membershipTag = '团队-高级版'
          } else if (teamLevel === 'basic') {
            membershipTag = '团队-基础版'
          } else {
            membershipTag = '团队'
          }
          tierClass = 'team'
        } else if (effectiveTier === 'pro' && mode === 'personal') {
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
      if (isPro && effectiveTier === 'team' && mode === 'team' && (!membershipTag || membershipTag === '团队')) {
        this.ensureTeamLevelTag()
      }
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
           const tier = res.data.tier || newUserInfo.subscription_tier
           const expireAt = res.data.expire_at || newUserInfo.subscription_expire_at
           const teamLevel = res.data.team_level || newUserInfo.membership_team_level || newUserInfo.team_subscription_level
           newUserInfo = { ...newUserInfo, subscription_tier: tier, subscription_expire_at: expireAt };
           if (res.data.plan_label) newUserInfo.membership_label = res.data.plan_label;
           if (typeof res.data.duration_days === 'number') newUserInfo.membership_duration_days = res.data.duration_days;
           if (teamLevel) { newUserInfo.membership_team_level = teamLevel; newUserInfo.team_level = teamLevel }
        }
        try {
          const profileRes = await app.request({ url: '/api/auth/profile', method: 'GET' });
          if (profileRes && profileRes.success && profileRes.data) {
            const serverUser = profileRes.data || {};
            const merged = { ...newUserInfo, ...serverUser };
            if (newUserInfo.membership_team_level && !merged.membership_team_level) merged.membership_team_level = newUserInfo.membership_team_level;
            if (newUserInfo.team_level && !merged.team_level) merged.team_level = newUserInfo.team_level;
            newUserInfo = merged;
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
  _normalizeTeamLevel(v) {
    try {
      const s = String(v || '').trim().toLowerCase()
      if (!s) return ''
      if (s === 'advanced' || s === 'premium' || s === 'plus' || s === '高级' || s === '高级版') return 'advanced'
      if (s === 'basic' || s === '基础' || s === '基础版') return 'basic'
      return ''
    } catch (_) { return '' }
  },
  _getUserTeamLevel(u) {
    try {
      const fields = [u.membership_team_level, u.team_subscription_level, u.team_level, u.subscription_level, u.teamLevel]
      for (const f of fields) {
        const n = this._normalizeTeamLevel(f)
        if (n) return n
      }
      if (u.is_team_advanced === true) return 'advanced'
      if (u.is_team_basic === true) return 'basic'
      return ''
    } catch (_) { return '' }
  },
  async refreshProfile() {
    try {
      const res = await app.request({ url: '/api/auth/profile', method: 'GET' })
      if (res && res.success && res.data) {
        const old = wx.getStorageSync('userInfo') || {}
        let merged = { ...old, ...res.data }
        if (old.membership_team_level && !merged.membership_team_level) merged.membership_team_level = old.membership_team_level
        if (old.team_level && !merged.team_level) merged.team_level = old.team_level
        if (old.team_subscription_level && !merged.team_subscription_level) merged.team_subscription_level = old.team_subscription_level
        try { wx.setStorageSync('userInfo', merged) } catch(_) {}
        if (app && app.globalData) { app.globalData.userInfo = merged }
        this.updateStatusFromUserInfo(merged)
      }
    } catch(_) {}
  },
  async ensureTeamLevelTag() {
    try {
      const stored = wx.getStorageSync('userInfo') || {}
      let level = ''
      try { level = String(app.getTeamLevel && app.getTeamLevel()).toLowerCase() } catch(_) { level = '' }
      if (level !== 'basic' && level !== 'advanced') { level = this._getUserTeamLevel(stored) }
      if (level !== 'basic' && level !== 'advanced') {
        const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
        if (cur && cur.success && cur.data) {
          level = this._normalizeTeamLevel(cur.data.subscription_level)
          try { wx.setStorageSync('currentTeam', cur.data) } catch(_) {}
          if (app && app.globalData) { app.globalData.currentTeam = cur.data }
        }
      }
      if (level === 'basic') { this.setData({ membershipTag: '团队-基础版', tierClass: 'team' }) }
      else if (level === 'advanced') { this.setData({ membershipTag: '团队-高级版', tierClass: 'team' }) }
    } catch(_) {}
  },
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
