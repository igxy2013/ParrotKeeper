// pages/admin/users-management/users-management.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    stats: {
      totalUsers: 0,
      teamUsers: 0,
      roleSuperAdmin: 0,
      roleAdmin: 0,
      roleUser: 0,
      teamCount: 0,
      avgMembers: 0
    },
    listLoading: false,
    users: [],
    page: 1,
    perPage: 20,
    total: 0,
    hasMore: false,
    keyword: '',
    modeFilter: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  },

  onShow() { this.initAccessAndLoad() },
  onPullDownRefresh() { Promise.all([this.reloadStats(), this.reloadList(true)]).finally(() => wx.stopPullDownRefresh()) },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.reloadStats()
    this.reloadList(true)
  },

  async reloadStats() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/admin/users/stats', method: 'GET' })
      if (res && res.success && res.data) {
        const d = res.data || {}
        const total = typeof d.total_users === 'number' ? d.total_users : (typeof d.total === 'number' ? d.total : 0)
        const team = typeof d.team_users === 'number' ? d.team_users : (typeof d.team === 'number' ? d.team : 0)
        const rc = d.role_counts || {}
        const ts = d.team_stats || {}
        this.setData({ stats: {
          totalUsers: total,
          teamUsers: team,
          roleSuperAdmin: typeof rc.super_admin === 'number' ? rc.super_admin : 0,
          roleAdmin: typeof rc.admin === 'number' ? rc.admin : 0,
          roleUser: typeof rc.user === 'number' ? rc.user : 0,
          teamCount: typeof ts.team_count === 'number' ? ts.team_count : 0,
          avgMembers: typeof ts.avg_members === 'number' ? ts.avg_members : 0
        } })
      } else {
        const fallback = await this._fallbackStats()
        this.setData({ stats: fallback })
        wx.showToast({ title: '统计接口不可用，已使用替代统计', icon: 'none' })
      }
    } catch (e) {
      const fallback = await this._fallbackStats()
      this.setData({ stats: fallback })
      wx.showToast({ title: '统计接口不可用，已使用替代统计', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
  ,
  async _fallbackStats() {
    let totalUsers = '—'
    let teamUsers = 0
    let roleSuperAdmin = 0
    let roleAdmin = 0
    let roleUser = 0
    let teamCount = 0
    let avgMembers = 0
    try {
      const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
      if (cur && cur.success && cur.data) {
        const d = cur.data || {}
        if (Array.isArray(d.members)) {
          teamUsers = d.members.length
        } else if (typeof d.member_count === 'number') {
          teamUsers = d.member_count
        } else if (d.team && Array.isArray(d.team.members)) {
          teamUsers = d.team.members.length
        }
      }
    } catch (_) {}
    try {
      const resp = await app.request({ url: '/api/admin/users', method: 'GET' })
      const arr = (resp && resp.success && resp.data && Array.isArray(resp.data.items)) ? resp.data.items : []
      if (Array.isArray(arr)) {
        totalUsers = arr.length
        roleSuperAdmin = arr.filter(it => it.role === 'super_admin').length
        roleAdmin = arr.filter(it => it.role === 'admin').length
        roleUser = arr.filter(it => it.role === 'user').length
      }
    } catch (_) {}
    return { totalUsers, teamUsers, roleSuperAdmin, roleAdmin, roleUser, teamCount, avgMembers }
  }
  ,
  async reloadList(reset) {
    const page = reset ? 1 : this.data.page
    const perPage = this.data.perPage
    const params = []
    if (this.data.keyword) params.push('keyword=' + encodeURIComponent(this.data.keyword))
    if (this.data.modeFilter && this.data.modeFilter !== 'all') params.push('user_mode=' + this.data.modeFilter)
    if (this.data.sortBy) params.push('sort_by=' + this.data.sortBy)
    if (this.data.sortOrder) params.push('sort_order=' + this.data.sortOrder)
    params.push('page=' + page)
    params.push('per_page=' + perPage)
    const qs = params.length ? ('?' + params.join('&')) : ''
    this.setData({ listLoading: true })
    try {
      const res = await app.request({ url: '/api/admin/users' + qs, method: 'GET' })
      if (res && res.success && res.data) {
        const items = Array.isArray(res.data.items) ? res.data.items : []
        const total = res.data.pagination && typeof res.data.pagination.total === 'number' ? res.data.pagination.total : items.length
        const merged = reset ? items : (this.data.users.concat(items))
        const hasMore = merged.length < total
        this.setData({ users: merged, total, page: page, hasMore })
      }
    } catch (_) {
    } finally {
      this.setData({ listLoading: false })
    }
  }
  ,
  onSearchInput(e) {
    const v = (e && e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ keyword: v })
    this.reloadList(true)
  }
  ,
  clearSearch() {
    this.setData({ keyword: '' })
    this.reloadList(true)
  }
  ,
  setModeFilter(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) ? e.currentTarget.dataset.mode : 'all'
    this.setData({ modeFilter: mode })
    this.reloadList(true)
  }
  ,
  setSortByParrotCount() {
    this.setData({ sortBy: 'parrot_count', sortOrder: 'desc', page: 1 })
    this.reloadList(true)
  }
  ,
  setSortByNickname() {
    this.setData({ sortBy: 'nickname', sortOrder: 'asc', page: 1 })
    this.reloadList(true)
  }
  ,
  loadMore() {
    if (this.data.listLoading || !this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.reloadList(false)
  }
})
