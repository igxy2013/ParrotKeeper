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
    modeOptions: ['全部模式', '个人模式', '团队模式'],
    modeValues: ['all', 'personal', 'team'],
    modeIndex: 0,
    sortBy: 'created_at',
    sortOptions: ['按注册时间', '按鹦鹉数量', '按用户名称', '按积分数量'],
    sortValues: ['created_at', 'parrot_count', 'nickname', 'points'],
    sortIndex: 0,
    sortOrder: 'desc',
    selectedPeriod: '本月',
    selectedMonth: '',
    selectedYear: '',
    chartPeriod: 'day',
    userTrendData: []
  },

  onLoad() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    this.setData({ selectedMonth: `${y}-${m}`, selectedYear: String(y), userTrendData: [] })
  },
  onShow() { this.initAccessAndLoad() },
  onPullDownRefresh() { Promise.all([this.reloadStats(), this.reloadList(true)]).finally(() => wx.stopPullDownRefresh()) },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.reloadStats()
    this.reloadList(true)
    this.loadUserTrendData()
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
        const processed = items.map(it => {
          const display = this.formatLocalTime(it && it.created_at)
          return Object.assign({}, it, { created_at_display: display })
        })
        const total = res.data.pagination && typeof res.data.pagination.total === 'number' ? res.data.pagination.total : items.length
        const merged = reset ? processed : (this.data.users.concat(processed))
        const hasMore = merged.length < total
        this.setData({ users: merged, total, page: page, hasMore })
      }
    } catch (_) {
    } finally {
      this.setData({ listLoading: false })
    }
  }
  ,
  // 加载用户趋势数据（按天）
  async loadUserTrendData() {
    try {
      const p = this.data.selectedPeriod
      let params = {}
      let chartPeriod = 'day'
      const tz = -new Date().getTimezoneOffset()
      
      if (this.data.selectedStartDate && this.data.selectedEndDate) {
          // If component provided specific range, use it
          // period could be 'week', '本月', '本年' but dates are authoritative
          params = { 
            start_date: this.data.selectedStartDate, 
            end_date: this.data.selectedEndDate, 
            period: (p === '本年' || p === 'all') ? 'month' : 'day' 
          }
          chartPeriod = (p === '本年' || p === 'all') ? 'month' : 'day'
      } else if (p === 'week' || p === '本周') {
        const { start_date, end_date } = this._getLastNDaysRange(7)
        params = { start_date, end_date, period: 'day' }
        chartPeriod = 'day'
      } else if (p === '本月') {
        const ym = this.data.selectedMonth || this._getYearMonth(new Date())
        const { s, e } = this._getMonthRange(ym)
        params = { start_date: s, end_date: e, period: 'day' }
        chartPeriod = 'day'
      } else if (p === '本年') {
        const y = this.data.selectedYear || String(new Date().getFullYear())
        const { s, e } = this._getYearRange(y)
        params = { start_date: s, end_date: e, period: 'month' }
        chartPeriod = 'month'
      } else { // 全部
        params = { period: 'month' }
        chartPeriod = 'month'
      }

      params.tz_offset_minutes = tz

      const res = await app.request({ url: '/api/admin/users/trend', method: 'GET', data: params })
      const raw = (res && res.success && Array.isArray(res.data)) ? res.data : []
      // 后端已返回连续日期；兜底保证结构
      const data = raw.map(it => ({
        date: String(it.date || '').slice(0,10),
        new_users: Number(it.new_users || 0),
        total_users: Number(it.total_users || 0)
      }))
      this.setData({ userTrendData: data, chartPeriod })
    } catch (e) {
      this.setData({ userTrendData: [] })
    }
  }
  ,
  handleFilterChange(e) {
    const { period, year, month, startDate, endDate } = e.detail
    this.setData({
      selectedPeriod: period,
      selectedYear: year,
      selectedMonth: month,
      selectedStartDate: startDate,
      selectedEndDate: endDate
    })
    this.loadUserTrendData()
  }
  ,
  _getLastNDaysRange(n) {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - Math.max(1, n - 1))
    const fmt = d => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return { start_date: fmt(start), end_date: fmt(end) }
  }
  ,
  _getYearMonth(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  ,
  _getMonthRange(ym) {
    const m = String(ym || '')
    const parts = m.split('-')
    let y = new Date().getFullYear(), mo = new Date().getMonth() + 1
    if (parts.length >= 2) { y = parseInt(parts[0], 10); mo = parseInt(parts[1], 10) }
    const s = `${y}-${String(mo).padStart(2, '0')}-01`
    const d = new Date(y, mo, 1)
    const eDate = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const e = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}-01`
    return { s, e }
  }
  ,
  _getYearRange(ystr) {
    const y = parseInt(String(ystr || '').trim() || String(new Date().getFullYear()), 10)
    const s = `${y}-01-01`
    const e = `${y + 1}-01-01`
    return { s, e }
  }
  ,
  // 将服务端时间安全解析为本地时间显示（YYYY-MM-DD HH:mm:ss）
  formatLocalTime(t) {
    try {
      if (!t) return ''
      if (t instanceof Date) return app.formatDateTime(t, 'YYYY-MM-DD HH:mm:ss')
      if (typeof t === 'number') {
        const dNum = new Date(t)
        return isNaN(dNum.getTime()) ? '' : app.formatDateTime(dNum, 'YYYY-MM-DD HH:mm:ss')
      }
      const s0 = String(t).trim()
      if (!s0) return ''
      // 纯 ISO 且不含时区：按 UTC 解释再转本地
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s0)) {
        const dUtc = new Date(s0 + 'Z')
        if (!isNaN(dUtc.getTime())) return app.formatDateTime(dUtc, 'YYYY-MM-DD HH:mm:ss')
      }
      // 已含时区（Z 或 +08:00 等）
      if (/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s0)) {
        let s = s0
        if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
        s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
        const d = new Date(s)
        return isNaN(d.getTime()) ? s0 : app.formatDateTime(d, 'YYYY-MM-DD HH:mm:ss')
      }
      // "YYYY-MM-DD HH:mm[:ss]" iOS 兼容解析
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s0)) {
        // 该格式一般也来源于后端的 UTC 无时区输出，优先按 UTC 解释
        let isoUtc = s0.replace(' ', 'T')
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoUtc)) isoUtc += ':00'
        const dUtc2 = new Date(isoUtc + 'Z')
        if (!isNaN(dUtc2.getTime())) return app.formatDateTime(dUtc2, 'YYYY-MM-DD HH:mm:ss')
        let fixed = s0.replace(/-/g, '/')
        if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(fixed)) fixed += ':00'
        const d1 = new Date(fixed)
        if (!isNaN(d1.getTime())) return app.formatDateTime(d1, 'YYYY-MM-DD HH:mm:ss')
        let iso = s0.replace(' ', 'T')
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) iso += ':00'
        const d2 = new Date(iso)
        if (!isNaN(d2.getTime())) return app.formatDateTime(d2, 'YYYY-MM-DD HH:mm:ss')
      }
      // 其他：尽量按本地解析
      let iso2 = s0.includes(' ') ? s0.replace(' ', 'T') : s0
      if (/([+\-]\d{2})(\d{2})$/.test(iso2)) iso2 = iso2.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso2)) iso2 += ':00'
      const dAny = new Date(iso2)
      return isNaN(dAny.getTime()) ? s0 : app.formatDateTime(dAny, 'YYYY-MM-DD HH:mm:ss')
    } catch (_) {
      return String(t || '')
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
  onModeChange(e) {
    const idx = e.detail.value
    const mode = this.data.modeValues[idx]
    this.setData({ modeIndex: idx, modeFilter: mode })
    this.reloadList(true)
  }
  ,
  onSortChange(e) {
    const idx = e.detail.value
    const sortBy = this.data.sortValues[idx]
    let sortOrder = 'desc'
    if (sortBy === 'nickname') sortOrder = 'asc'
    this.setData({ sortIndex: idx, sortBy, sortOrder, page: 1 })
    this.reloadList(true)
  }
  ,
  onReachBottom() {
    this.loadMore()
  }
  ,
  loadMore() {
    if (this.data.listLoading || !this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.reloadList(false)
  }
})
