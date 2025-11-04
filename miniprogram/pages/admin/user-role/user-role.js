// pages/admin/user-role/user-role.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    users: [],
    q: '',
    roles: ['user', 'admin', 'super_admin'],
    roleDisplay: ['普通用户', '管理员', '超级管理员'],
    roleLabelMap: { user: '普通用户', admin: '管理员', super_admin: '超级管理员' },
    totalCount: 0,
    adminCount: 0,
    userCount: 0,
    // 分页相关
    page: 1,
    perPage: 50,
    hasMore: true,
    loadingMore: false,
    // 排序相关
    sortOptions: ['默认', '鹦鹉数量', '总支出', '积分'],
    sortIndex: 0,
    sortBy: '默认',
    sortOrder: 'desc' // 'asc' | 'desc'
  },

  onLoad() {
    try {
      const user = (app.globalData && app.globalData.userInfo) || {}
      this.setData({ isSuperAdmin: user.role === 'super_admin' })
    } catch (_) {}
  },

  onShow() {
    if (this.data.isSuperAdmin) {
      this.loadUsers()
    }
  },

  async loadUsers() {
    this.setData({ loading: true })
    try {
      const res = await app.request({
        url: '/api/admin/users',
        method: 'GET',
        data: { q: this.data.q, page: 1, per_page: this.data.perPage }
      })
      if (res && res.success) {
        const users = (res.data.users || []).map(u => {
          const canonical = String(u.role || 'user').toLowerCase()
          const idx = this.data.roles.indexOf(canonical)
          const selectedIndex = idx >= 0 ? idx : 0
          const selectedRole = this.data.roles[selectedIndex]
          const displayRole = this.data.roleLabelMap[selectedRole] || selectedRole
          return {
            ...u,
            selectedRole,
            selectedIndex,
            displayRole
          }
        })
        const totalCount = (res.data && (res.data.total || users.length)) || users.length
        const hasMore = users.length < totalCount
        this.setData({ users, totalCount, page: 1, hasMore })
        // 应用当前排序设置
        this.applySort()
        // 计算角色数量（按当前搜索条件全量统计）
        this.computeRoleCounts()
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 触底加载更多
  async loadMore() {
    const { loadingMore, hasMore, page, perPage } = this.data
    if (loadingMore || !hasMore) return
    this.setData({ loadingMore: true })
    try {
      const nextPage = page + 1
      const res = await app.request({
        url: '/api/admin/users',
        method: 'GET',
        data: { q: this.data.q, page: nextPage, per_page: perPage }
      })
      if (res && res.success) {
        const incoming = (res.data.users || []).map(u => {
          const canonical = String(u.role || 'user').toLowerCase()
          const idx = this.data.roles.indexOf(canonical)
          const selectedIndex = idx >= 0 ? idx : 0
          const selectedRole = this.data.roles[selectedIndex]
          const displayRole = this.data.roleLabelMap[selectedRole] || selectedRole
          return { ...u, selectedRole, selectedIndex, displayRole }
        })
        const total = (res.data && (res.data.total || incoming.length)) || incoming.length
        const merged = [...this.data.users, ...incoming]
        const hasMore = merged.length < total
        this.setData({ users: merged, page: nextPage, totalCount: total, hasMore })
        // 维持当前排序
        this.applySort()
      } else {
        wx.showToast({ title: res && res.message ? res.message : '加载失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  // 页面触底事件
  onReachBottom() {
    this.loadMore()
  },

  // 应用排序到用户列表
  applySort() {
    try {
      const { users, sortBy, sortOrder } = this.data
      if (!Array.isArray(users) || users.length === 0) return

      // 默认采用后端 created_at 降序；如需要，仍本地稳定排序
      if (sortBy === '默认') {
        const sorted = [...users].sort((a, b) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0
          return bt - at
        })
        this.setData({ users: sorted })
        return
      }

      const keyMap = {
        '鹦鹉数量': 'parrot_count',
        '总支出': 'total_expense',
        '积分': 'points'
      }
      const key = keyMap[sortBy]
      if (!key) return

      const sorted = [...users].sort((a, b) => {
        const avRaw = a[key]
        const bvRaw = b[key]
        const av = typeof avRaw === 'number' ? avRaw : parseFloat(avRaw || '0') || 0
        const bv = typeof bvRaw === 'number' ? bvRaw : parseFloat(bvRaw || '0') || 0
        return sortOrder === 'desc' ? (bv - av) : (av - bv)
      })
      this.setData({ users: sorted })
    } catch (err) {
      console.warn('排序失败', err)
    }
  },

  // 选择排序字段
  onSortChange(e) {
    const sortIndex = e.detail.value
    const sortBy = this.data.sortOptions[sortIndex] || '默认'
    this.setData({ sortIndex, sortBy })
    this.applySort()
  },

  // 切换升降序
  toggleSortOrder() {
    const next = this.data.sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({ sortOrder: next })
    this.applySort()
  },

  async computeRoleCounts() {
    try {
      const perPage = 100
      let adminCount = 0
      let userCount = 0
      let total = 0

      // 先获取第一页以拿到总数
      const first = await app.request({
        url: '/api/admin/users',
        method: 'GET',
        data: { q: this.data.q, page: 1, per_page: perPage }
      })
      if (!first || !first.success) return
      const firstUsers = (first.data && first.data.users) || []
      total = (first.data && first.data.total) || firstUsers.length
      const pages = Math.ceil(total / perPage)

      // 统计第一页
      firstUsers.forEach(u => {
        if (u.role === 'admin') adminCount++
        else if (u.role === 'user') userCount++
      })

      // 拉取剩余页并累加
      for (let p = 2; p <= pages; p++) {
        const resp = await app.request({
          url: '/api/admin/users',
          method: 'GET',
          data: { q: this.data.q, page: p, per_page: perPage }
        })
        if (resp && resp.success) {
          const users = (resp.data && resp.data.users) || []
          users.forEach(u => {
            if (u.role === 'admin') adminCount++
            else if (u.role === 'user') userCount++
          })
        }
      }

      this.setData({ totalCount: total, adminCount, userCount })
    } catch (err) {
      // 统计失败不影响列表展示
      console.warn('统计用户角色数量失败', err)
    }
  },

  onSearchInput(e) {
    this.setData({ q: e.detail.value })
  },

  doSearch() {
    // 重置分页并加载
    this.setData({ page: 1, hasMore: true })
    this.loadUsers()
  },

  clearSearch() {
    this.setData({ q: '', page: 1, hasMore: true })
    this.loadUsers()
  },

  async changeRole(e) {
    const index = e.currentTarget.dataset.index
    const valueIndex = e.detail.value
    const role = this.data.roles[valueIndex]
    const user = this.data.users[index]
    if (!user) return
    try {
      app.showLoading('更新中...')
      const res = await app.request({
        url: `/api/admin/users/${user.id}/role`,
        method: 'PUT',
        data: { role }
      })
      if (res && res.success) {
        const roleLabel = this.data.roleLabelMap[role] || role
        this.setData({
          [`users[${index}].selectedRole`]: role,
          [`users[${index}].selectedIndex`]: valueIndex,
          [`users[${index}].displayRole`]: roleLabel
        })
        wx.showToast({ title: '已更新', icon: 'none' })
      } else {
        wx.showToast({ title: res && res.message ? res.message : '更新失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      app.hideLoading()
    }
  }
})
