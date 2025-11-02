// pages/teams/manage/manage.js
const app = getApp()

Page({
  data: {
    loading: true,
    teamInfo: {},
    members: [],
    isTeamOwner: false,
    isTeamAdmin: false,
    currentRoleDisplay: '',
    editTeamName: '',
    editTeamDesc: '',
    showEditModal: false
  },

  onLoad() {
    this.init()
  },

  async init() {
    try {
      const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
      if (cur && cur.success && cur.data) {
        const role = cur.data.user_role || cur.data.role
        this.setData({
          teamInfo: cur.data,
          isTeamOwner: role === 'owner',
          isTeamAdmin: role === 'admin',
          currentRoleDisplay: role === 'owner' ? '创建者' : (role === 'admin' ? '管理员' : '成员'),
          editTeamName: cur.data.name || '',
          editTeamDesc: cur.data.description || ''
        })
      }

      const teamId = this.data.teamInfo && this.data.teamInfo.id
      if (teamId) {
        const detail = await app.request({ url: `/api/teams/${teamId}`, method: 'GET' })
        if (detail && detail.success && detail.data) {
          const d = detail.data
          const role = d.user_role || d.role
          const members = (d.members || []).map(m => ({
            ...m,
            role_display: m.role === 'owner' ? '创建者' : (m.role === 'admin' ? '管理员' : '成员')
          }))
          this.setData({
            teamInfo: d,
            members,
            isTeamOwner: role === 'owner',
            isTeamAdmin: role === 'admin',
            currentRoleDisplay: role === 'owner' ? '创建者' : (role === 'admin' ? '管理员' : '成员'),
            editTeamName: d.name || this.data.editTeamName,
            editTeamDesc: d.description || this.data.editTeamDesc
          })
        }
      }
    } catch (err) {
      console.warn('加载团队信息失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示编辑弹窗
  showEditModal() {
    this.setData({
      showEditModal: true
    })
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({
      showEditModal: false
    })
  },

  // 处理弹窗提交
  async handleEditSubmit(e) {
    const { name, description, avatar_url } = e.detail
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    
    if (!teamId) return wx.showToast({ title: '无法识别当前团队', icon: 'none' })
    if (!this.data.isTeamOwner) return wx.showToast({ title: '仅创建者可修改', icon: 'none' })
    
    try {
      const payload = { name, description, avatar_url }
      const res = await app.request({ url: `/api/teams/${teamId}`, method: 'PUT', data: payload })
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'none' })
        this.hideEditModal()
        this.init()
      } else {
        wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' })
      }
    } catch (err) {
      console.warn('更新团队失败:', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  onEditTeamNameInput(e) { this.setData({ editTeamName: (e.detail.value || '').trim() }) },
  onEditTeamDescInput(e) { this.setData({ editTeamDesc: e.detail.value || '' }) },

  async confirmUpdateTeam() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return wx.showToast({ title: '无法识别当前团队', icon: 'none' })
    if (!this.data.isTeamOwner) return wx.showToast({ title: '仅创建者可修改', icon: 'none' })
    try {
      const payload = { name: this.data.editTeamName, description: this.data.editTeamDesc }
      const res = await app.request({ url: `/api/teams/${teamId}`, method: 'PUT', data: payload })
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'none' })
        this.init()
      } else {
        wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' })
      }
    } catch (err) {
      console.warn('更新团队失败:', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  copyInviteCode() {
    const code = this.data.teamInfo && this.data.teamInfo.invite_code
    if (!code) return
    wx.setClipboardData({ data: String(code), success: () => wx.showToast({ title: '已复制', icon: 'none' }) })
  },

  async changeMemberRole(e) {
    if (!this.data.isTeamOwner) return
    const userId = e.currentTarget.dataset.userId
    const target = this.data.members.find(m => String(m.id) === String(userId))
    if (!target) return
    if (target.role === 'owner') return wx.showToast({ title: '无法修改创建者角色', icon: 'none' })
    // 选择角色
    wx.showActionSheet({
      itemList: ['管理员', '成员'],
      success: async (res) => {
        const pick = res.tapIndex
        const newRole = pick === 0 ? 'admin' : 'member'
        try {
          const teamId = this.data.teamInfo && this.data.teamInfo.id
          const r = await app.request({ url: `/api/teams/${teamId}/members/${userId}/role`, method: 'PUT', data: { role: newRole } })
          if (r && r.success) {
            wx.showToast({ title: '角色已更新', icon: 'none' })
            this.init()
          } else {
            wx.showToast({ title: (r && r.message) || '更新失败', icon: 'none' })
          }
        } catch (err) {
          console.warn('变更角色失败:', err)
          wx.showToast({ title: '更新失败', icon: 'none' })
        }
      }
    })
  },

  async removeMember(e) {
    if (!this.data.isTeamOwner) return
    const userId = e.currentTarget.dataset.userId
    wx.showModal({
      title: '移除成员',
      content: '确认移除此成员？',
      success: async (d) => {
        if (!d.confirm) return
        try {
          const teamId = this.data.teamInfo && this.data.teamInfo.id
          const res = await app.request({ url: `/api/teams/${teamId}/members/${userId}`, method: 'DELETE' })
          if (res && res.success) {
            wx.showToast({ title: '已移除', icon: 'none' })
            this.init()
          } else {
            wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
          }
        } catch (err) {
          console.warn('移除成员失败:', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  async confirmLeaveTeam() {
    // 如果是团队创建者，给出提示信息
    if (this.data.isTeamOwner) {
      wx.showToast({ title: '创建者无法离开团队，请先解散团队或转让创建者权限', icon: 'none' })
      return
    }
    
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return wx.showToast({ title: '无团队信息', icon: 'none' })
    
    wx.showModal({
      title: '离开团队',
      content: '确认离开当前团队？',
      success: async (d) => {
        if (!d.confirm) return
        try {
          const res = await app.request({ url: `/api/teams/${teamId}/leave`, method: 'POST' })
          if (res && res.success) {
            wx.showToast({ title: '已离开团队', icon: 'none' })
            setTimeout(() => { wx.navigateBack({ delta: 1 }) }, 800)
          } else {
            wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
          }
        } catch (err) {
          console.warn('离开团队失败:', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }

  , async confirmDissolveTeam() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return wx.showToast({ title: '无团队信息', icon: 'none' })
    if (!this.data.isTeamOwner) return wx.showToast({ title: '仅创建者可操作', icon: 'none' })
    wx.showModal({
      title: '解散团队',
      content: '解散后，团队成员将被移除且不可恢复，确认解散？',
      confirmColor: '#ef4444',
      success: async (d) => {
        if (!d.confirm) return
        try {
          const res = await app.request({ url: `/api/teams/${teamId}`, method: 'DELETE' })
          if (res && res.success) {
            wx.showToast({ title: '已解散团队', icon: 'none' })
            setTimeout(() => { wx.reLaunch({ url: '/pages/profile/profile' }) }, 800)
          } else {
            wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
          }
        } catch (err) {
          console.warn('解散团队失败:', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})