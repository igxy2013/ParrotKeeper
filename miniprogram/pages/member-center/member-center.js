const app = getApp()

Page({
  data: {
    isPro: false,
    isInactive: false,
    expireDate: '',
    code: '',
    userInfo: null,
    showApplyModal: false,
    membershipName: '',
    membershipTag: '',
    tierClass: '',
    hasMembership: false
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
      const effectiveTierRaw = app.getEffectiveTier()
      const curTeam = (app.globalData && app.globalData.currentTeam) || wx.getStorageSync('currentTeam') || {}
      const effectiveTier = this._computeAdjustedTier(effectiveTierRaw, userInfo, curTeam)
      let isPro = effectiveTier === 'pro' || effectiveTier === 'team'
      const expireStr = userInfo.subscription_expire_at || ''
      const durationDays = Number(userInfo.membership_duration_days || 0)
      let membershipName = ''
      let membershipTag = ''
      let tierClass = ''
      let hasMembership = false
      let isExpired = false
      if (isPro) {
        if (effectiveTier === 'team') {
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
        if (effectiveTier !== 'team') {
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
              if (exp <= now) isExpired = true
            } catch (_) {
              membershipName = '高级会员'
            }
          } else {
            membershipName = '高级会员'
          }
        }
      }

      try {
        const cur = (app.globalData && app.globalData.currentTeam) || wx.getStorageSync('currentTeam') || {}
        const hasTeam = !!(cur && cur.id)
        const teamExp = hasTeam && (cur.subscription_expire_at || cur.expire_at)
        const teamCycle = hasTeam && (cur.subscription_cycle || cur.plan || cur.subscription_plan)
        if (!isPro && hasTeam && (teamExp || teamCycle)) {
          const now = Date.now()
          let validTeamSub = false
          if (teamExp) {
            try {
              const t = new Date(String(teamExp).replace(' ', 'T')).getTime()
              validTeamSub = isFinite(t) && t > now
            } catch(_) { validTeamSub = false }
          }
          // 仅在订阅未过期时按团队展示
          if (validTeamSub) {
            isPro = true
            tierClass = 'team'
            const lv = this._normalizeTeamLevel(cur && cur.subscription_level)
            if (lv === 'advanced') membershipTag = '团队-高级版'
            else if (lv === 'basic') membershipTag = '团队-基础版'
            try {
              const t = new Date(String(teamExp).replace(' ', 'T')).getTime()
              const d = Math.round((t - now) / (24 * 60 * 60 * 1000))
              if (d >= 360) membershipName = '年卡会员'
              else if (d >= 25) membershipName = '月卡会员'
            } catch(_) {}
          }
        }
      } catch(_) {}

      hasMembership = isPro || !!expireStr || durationDays > 0
      const isInactive = (!isPro) || !!isExpired
      this.setData({
          userInfo: userInfo,
          isPro,
          isInactive,
          expireDate: (() => {
            if (effectiveTier === 'team') {
              try {
                const cur = (app.globalData && app.globalData.currentTeam) || wx.getStorageSync('currentTeam') || {}
                if (cur && cur.id) {
                  const exp = cur.subscription_expire_at || cur.expire_at || expireStr || ''
                  return exp ? String(exp).substring(0, 10) : ''
                }
              } catch(_) { return '' }
            }
            return expireStr ? expireStr.substring(0, 10) : ''
          })(),
          membershipName,
          membershipTag,
          tierClass,
          hasMembership
      });
      if (isPro && effectiveTier === 'team') {
        if (!membershipTag || membershipTag === '团队') {
          this.ensureTeamLevelTag()
        }
        this.ensureTeamPlanAndExpire()
      }
  },

  _computeAdjustedTier(rawTier, userInfo, currentTeam) {
    try {
      const now = Date.now()
      const t = String(rawTier || '').toLowerCase()
      if (t === 'pro') {
        const expStr = userInfo && userInfo.subscription_expire_at
        if (!expStr) return 'free'
        const ts = new Date(String(expStr).replace(' ', 'T')).getTime()
        return (isFinite(ts) && ts > now) ? 'pro' : 'free'
      }
      if (t === 'team') {
        const hasTeam = !!(currentTeam && currentTeam.id)
        if (!hasTeam) return 'free'
        const expStr = currentTeam.subscription_expire_at || currentTeam.expire_at || ''
        if (!expStr) return 'free'
        const ts = new Date(String(expStr).replace(' ', 'T')).getTime()
        return (isFinite(ts) && ts > now) ? 'team' : 'free'
      }
      return 'free'
    } catch(_) { return 'free' }
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
        try {
          const ctId = merged && merged.current_team_id
          if (!ctId) {
            wx.removeStorageSync('currentTeam')
            if (app && app.globalData) { app.globalData.currentTeam = null; app.globalData.effectivePermissions = null }
            wx.removeStorageSync('effectivePermissions')
          }
        } catch(_) {}
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
  async ensureTeamPlanAndExpire() {
    try {
      let cur = app.globalData && app.globalData.currentTeam
      if (!cur) {
        const res = await app.request({ url: '/api/teams/current', method: 'GET' })
        if (res && res.success && res.data) {
          cur = res.data
          try { wx.setStorageSync('currentTeam', cur) } catch(_) {}
          if (app && app.globalData) { app.globalData.currentTeam = cur }
        }
      }
      if (!cur || !cur.id) return
      const exp = cur.subscription_expire_at || cur.expire_at || ''
      let name = this.data.membershipName || ''
      if (exp) {
        try {
          const now = Date.now()
          const t = new Date(String(exp).replace(' ', 'T')).getTime()
          const days = Math.round((t - now) / (24 * 60 * 60 * 1000))
          if (days >= 360) name = '年卡会员'
          else if (days >= 25) name = '月卡会员'
          else name = '高级会员'
        } catch(_) {}
      }
      if (!name) {
        const s = String(cur.subscription_cycle || cur.plan || cur.subscription_plan || '').toLowerCase()
        if (s) {
          if (s.indexOf('year') >= 0 || s.indexOf('年') >= 0) name = '年卡会员'
          else if (s.indexOf('month') >= 0 || s.indexOf('月') >= 0) name = '月卡会员'
        }
      }
      if (!name) name = '团队会员'
      const expireDate = exp ? String(exp).substring(0, 10) : (this.data.expireDate || '—')
      this.setData({ membershipName: name, expireDate })
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
