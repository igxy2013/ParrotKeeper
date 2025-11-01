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
    userCount: 0
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
        data: { q: this.data.q, page: 1, per_page: 50 }
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
        this.setData({ users, totalCount })
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
    this.loadUsers()
  },

  clearSearch() {
    this.setData({ q: '' })
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
