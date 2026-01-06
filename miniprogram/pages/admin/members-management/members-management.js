const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    listLoading: false,
    items: [],
    page: 1,
    perPage: 100,
    total: 0,
    hasMore: false,
    keyword: '',
    tierOptions: ['全部会员', '专业版 Pro', '团队版 Team'],
    tierValues: ['all', 'pro', 'team'],
    tierIndex: 0,
    canWriteAdminUsers: false
  },

  onShow() { this.initAccessAndLoad() },
  onPullDownRefresh() { this.reloadList(true).finally(() => wx.stopPullDownRefresh()) },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin, canWriteAdminUsers: !!isSuperAdmin })
    if (!isSuperAdmin) return
    this.reloadList(true)
  },

  onSearchInput(e) {
    const v = (e && e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ keyword: v, page: 1 })
    this.reloadList(true)
  },

  onTierChange(e) {
    const idx = e.detail.value
    this.setData({ tierIndex: idx, page: 1 })
    this.reloadList(true)
  },

  async reloadList(reset) {
    const page = reset ? 1 : this.data.page
    const perPage = this.data.perPage
    const params = []
    if (this.data.keyword) params.push('keyword=' + encodeURIComponent(this.data.keyword))
    params.push('sort_by=created_at')
    params.push('sort_order=desc')
    params.push('page=' + page)
    params.push('per_page=' + perPage)
    const qs = params.length ? ('?' + params.join('&')) : ''
    this.setData({ listLoading: true })
    try {
      const res = await app.request({ url: '/api/admin/users' + qs, method: 'GET' })
      if (res && res.success && res.data) {
        const items = Array.isArray(res.data.items) ? res.data.items : []
        const tierValue = this.data.tierValues[this.data.tierIndex]
        let processed = items.map(it => {
          const tier = this._getTier(it)
          const expire = this._getExpire(it)
          const expired = this._isExpired(expire)
          return Object.assign({}, it, { _tier: tier, _expire: expire, _expired: expired })
        })

        // 将当前登录用户的会员信息注入列表（用于后端未返回会员字段的情况）
        try {
          const curUser = (app.globalData && app.globalData.userInfo) || wx.getStorageSync('userInfo') || {}
          const curTier = this._getTier(curUser)
          const curExpire = this._getExpire(curUser)
          const curOpenId = String(curUser.openid || '')
          const curId = curUser.id
          if (curTier || curExpire) {
            const idx = processed.findIndex(u => (String(u.openid || '') === curOpenId) || (curId && u.id === curId))
            if (idx >= 0) {
              processed[idx] = Object.assign({}, processed[idx], { _tier: curTier || processed[idx]._tier, _expire: curExpire || processed[idx]._expire })
            } else {
              processed.unshift({
                id: curId || curOpenId,
                openid: curOpenId,
                nickname: curUser.nickname || curUser.nickName || '未命名',
                created_at: curUser.created_at || curUser.registered_at || '',
                _tier: curTier,
                _expire: curExpire,
                _expired: this._isExpired(curExpire)
              })
            }
          }
        } catch (_) {}

        const filtered = processed.filter(it => {
          const hasMembership = !!(it._tier || it._expire)
          if (!hasMembership) return false
          if (tierValue === 'all') return true
          return it._tier === tierValue
        })
        const total = res.data.pagination && typeof res.data.pagination.total === 'number' ? res.data.pagination.total : filtered.length
        const merged = reset ? filtered : (this.data.items.concat(filtered))
        const hasMore = merged.length < total
        this.setData({ items: merged, total, page: page, hasMore })
      }
    } catch (_) {
    } finally {
      this.setData({ listLoading: false })
    }
  },

  onReachBottom() { this.loadMore() },
  loadMore() {
    if (this.data.listLoading || !this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.reloadList(false)
  },

  _getTier(u) {
    try {
      const t = String((u && (u.subscription_tier || u.tier || u.membership_tier || '')) || '').toLowerCase()
      if (t === 'pro' || t === 'team') return t
      if (u && (u.is_pro === true || u.vip === true)) return 'pro'
      if (u && (u.is_team === true)) return 'team'
      return ''
    } catch (_) { return '' }
  },

  _getExpire(u) {
    try {
      const e = (u && (u.subscription_expire_at || u.expire_at || u.membership_expire_at || '')) || ''
      return e
    } catch (_) { return '' }
  },

  _isExpired(s) {
    try {
      const str = String(s || '').trim()
      if (!str) return false
      const d = new Date(str.replace(' ', 'T'))
      if (isNaN(d.getTime())) return false
      return Date.now() > d.getTime()
    } catch (_) { return false }
  },

  formatDate(t) {
    try { return app.formatDate(t) } catch (_) { return (t || '').slice(0, 10) }
  },

  async setTier(e) {
    const id = e.currentTarget.dataset.id
    const tier = e.currentTarget.dataset.tier
    if (!id || !tier) return
    try {
      app.showLoading('更新中...')
      const res = await app.request({ url: `/api/admin/users/${id}`, method: 'PUT', data: { subscription_tier: tier } })
      app.hideLoading()
      if (res && res.success) {
        const updated = (this.data.items || []).map(it => it.id === id ? Object.assign({}, it, { subscription_tier: tier }) : it)
        this.setData({ items: updated })
        wx.showToast({ title: '已更新会员等级', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' })
      }
    } catch (_) {
      app.hideLoading()
      this._handleWriteError(e, '更新失败，后端暂不支持会员写操作')
    }
  },

  async extend(e) {
    const id = e.currentTarget.dataset.id
    const days = Number(e.currentTarget.dataset.days || 0)
    if (!id || !days) return
    try {
      app.showLoading('延长中...')
      const res = await app.request({ url: `/api/admin/users/${id}`, method: 'PUT', data: { subscription_extend_days: days } })
      app.hideLoading()
      if (res && res.success) {
        const expire = (res.data && (res.data.subscription_expire_at || res.data.expire_at)) || ''
        const updated = (this.data.items || []).map(it => it.id === id ? Object.assign({}, it, { subscription_expire_at: expire || it.subscription_expire_at }) : it)
        this.setData({ items: updated })
        wx.showToast({ title: '有效期已延长', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '延长失败', icon: 'none' })
      }
    } catch (_) {
      app.hideLoading()
      this._handleWriteError(e, '延长失败，后端暂不支持会员写操作')
    }
  },

  async cancel(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    try {
      app.showLoading('取消中...')
      const res = await app.request({ url: `/api/admin/users/${id}`, method: 'PUT', data: { subscription_cancel: true } })
      app.hideLoading()
      if (res && res.success) {
        const updated = (this.data.items || []).filter(it => it.id !== id)
        this.setData({ items: updated })
        wx.showToast({ title: '已取消会员', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '取消失败', icon: 'none' })
      }
    } catch (_) {
      app.hideLoading()
      this._handleWriteError(e, '取消失败，后端暂不支持会员写操作')
    }
  }
  ,
  _handleWriteError(e, defaultMsg) {
    try {
      this.setData({ canWriteAdminUsers: false })
      wx.showToast({ title: defaultMsg, icon: 'none' })
    } catch (_) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
