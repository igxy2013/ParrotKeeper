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
    showEditModal: false,
    groups: [],
    showGroupEdit: false,
    groupEditId: null,
    groupEditName: '',
    groupEditDesc: '',
    groupEditPermission: 'group',
    permissionOptions: ['查看/编辑本组所有信息', '查看/编辑团队所有信息'],
    permissionIndex: 0,
    // 分组成员选择
    selectedGroupMembers: [],
    showMemberDropdown: false,
    groupMemberSearchKeyword: '',
    filteredMemberOptions: [],
    originalGroupMemberIds: []
    ,
    // 分组权限清单
    permissionCatalog: [],
    permissionSelections: {},
    permissionCollapsed: {}
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
          await this.loadGroups()
          await this.loadMembersWithGroup()
        }
      }
    } catch (err) {
      console.warn('加载团队信息失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMembersWithGroup() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return
    try {
      const res = await app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
      if (res && res.success) {
        const members = (res.data || []).map(m => ({
          ...m,
          role_display: m.role === 'owner' ? '创建者' : (m.role === 'admin' ? '管理员' : '成员')
        }))
        this.setData({ members })
      }
    } catch (e) {
      console.warn('加载成员(含分组)失败:', e)
    }
  },

  async loadGroups() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return
    try {
      const res = await app.request({ url: `/api/teams/${teamId}/groups`, method: 'GET' })
      if (res && res.success) {
        this.setData({ groups: res.data || [] })
      }
    } catch (e) {
      console.warn('加载分组失败:', e)
    }
  },

  async showGroupPermissions(e) {
    if (!this.data.isTeamOwner && !this.data.isTeamAdmin) return
    const gid = e.currentTarget.dataset.groupId
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!gid || !teamId) return
    try {
      const catalogRes = await app.request({ url: `/api/teams/${teamId}/permissions/catalog`, method: 'GET' })
      const groupsRes = await app.request({ url: `/api/teams/${teamId}/groups`, method: 'GET' })
      let catalog = []
      if (catalogRes && catalogRes.success) catalog = catalogRes.data || []
      const g = (groupsRes && groupsRes.success ? (groupsRes.data || []).find(x => String(x.id) === String(gid)) : null)
      const current = (g && g.permissions) || {}
      this.setData({ showPermissionEdit: true, permissionCatalog: catalog, permissionEditGroupId: gid, permissionSelections: current || {} })
    } catch (_) {
      wx.showToast({ title: '加载权限失败', icon: 'none' })
    }
  },

  hidePermissionEdit() { this.setData({ showPermissionEdit: false, permissionEditGroupId: null }) },

  togglePermissionItem(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    const selections = { ...(this.data.permissionSelections || {}) }
    selections[key] = !selections[key]
    this.setData({ permissionSelections: selections })
  },

  async submitPermissionEdit() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    const gid = this.data.permissionEditGroupId
    if (!teamId || !gid) return wx.showToast({ title: '无法识别分组', icon: 'none' })
    try {
      const res = await app.request({ url: `/api/teams/${teamId}/groups/${gid}`, method: 'PUT', data: { permissions: this.data.permissionSelections || {} } })
      if (res && res.success) {
        wx.showToast({ title: '权限已保存', icon: 'none' })
        this.setData({ showPermissionEdit: false })
        await this.loadGroups()
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  showCreateGroup() {
    if (!this.data.isTeamOwner && !this.data.isTeamAdmin) return wx.showToast({ title: '仅创建者或管理员可操作', icon: 'none' })
    this.setData({ showGroupEdit: true, groupEditId: null, groupEditName: '', groupEditDesc: '', groupEditPermission: 'group', permissionIndex: 0, selectedGroupMembers: [], originalGroupMemberIds: [], groupMemberSearchKeyword: '', filteredMemberOptions: [] })
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (teamId) {
      app.request({ url: `/api/teams/${teamId}/permissions/catalog`, method: 'GET' }).then(res => {
        let catalog = []
        if (res && res.success) {
          catalog = res.data || []
        }
        if (!catalog || !catalog.length) {
          catalog = this.getFallbackCatalog()
        }
        const defaults = this.buildDefaultGroupPermissions(catalog)
        const collapsed = this.buildDefaultCollapsed(catalog)
        this.setData({ permissionCatalog: catalog, permissionSelections: defaults, permissionCollapsed: collapsed })
      }).catch(() => {
        const catalog = this.getFallbackCatalog()
        const defaults = this.buildDefaultGroupPermissions(catalog)
        const collapsed = this.buildDefaultCollapsed(catalog)
        this.setData({ permissionCatalog: catalog, permissionSelections: defaults, permissionCollapsed: collapsed })
      })
    }
  },

  showEditGroup(e) {
    if (!this.data.isTeamOwner && !this.data.isTeamAdmin) return
    const gid = e.currentTarget.dataset.groupId
    const g = (this.data.groups || []).find(x => String(x.id) === String(gid))
    if (!g) return
    const scope = g.permission_scope || 'group'
    // 预填该分组已有成员
    const selected = (this.data.members || []).filter(m => m.group_id && String(m.group_id) === String(g.id))
    this.setData({
      showGroupEdit: true,
      groupEditId: g.id,
      groupEditName: g.name || '',
      groupEditDesc: g.description || '',
      groupEditPermission: scope,
      permissionIndex: scope === 'team' ? 1 : 0,
      selectedGroupMembers: selected,
      originalGroupMemberIds: selected.map(x => x.user_id),
      groupMemberSearchKeyword: '',
      filteredMemberOptions: []
    })
    // 加载权限清单并预填当前分组权限
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (teamId) {
      app.request({ url: `/api/teams/${teamId}/permissions/catalog`, method: 'GET' }).then(res => {
        let catalog = (res && res.success) ? (res.data || []) : []
        if (!catalog || !catalog.length) catalog = this.getFallbackCatalog()
        const current = g.permissions || {}
        const defaults = this.buildDefaultGroupPermissions(catalog)
        const selections = (current && Object.keys(current).length) ? current : defaults
        const collapsed = this.buildDefaultCollapsed(catalog)
        this.setData({ permissionCatalog: catalog, permissionSelections: selections, permissionCollapsed: collapsed })
      }).catch(() => {
        const catalog = this.getFallbackCatalog()
        const current = g.permissions || {}
        const defaults = this.buildDefaultGroupPermissions(catalog)
        const selections = (current && Object.keys(current).length) ? current : defaults
        const collapsed = this.buildDefaultCollapsed(catalog)
        this.setData({ permissionCatalog: catalog, permissionSelections: selections, permissionCollapsed: collapsed })
      })
    }
  },

  hideGroupEdit() { this.setData({ showGroupEdit: false }) },
  onGroupNameInput(e) { this.setData({ groupEditName: (e.detail.value || '').trim() }) },
  onGroupDescInput(e) { this.setData({ groupEditDesc: e.detail.value || '' }) },
  onPermissionChange(e) {
    const idx = Number(e.detail.value)
    const scope = idx === 1 ? 'team' : 'group'
    this.setData({ permissionIndex: idx, groupEditPermission: scope })
  },

  // 勾选分组权限清单项
  togglePermissionItem(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    const cur = { ...(this.data.permissionSelections || {}) }
    cur[key] = !cur[key]
    this.setData({ permissionSelections: cur })
  },

  buildDefaultGroupPermissions(catalog) {
    const result = {}
    const list = Array.isArray(catalog) ? catalog : []
    list.forEach(group => {
      const isTeam = String(group.key) === 'team'
      const children = group.children || []
      children.forEach(ch => {
        const k = ch && ch.key
        if (!k) return
        result[k] = !isTeam
      })
    })
    return result
  },

  buildDefaultCollapsed(catalog) {
    const map = {}
    const list = Array.isArray(catalog) ? catalog : []
    list.forEach(grp => {
      const key = grp && grp.key
      if (!key) return
      map[key] = true
    })
    return map
  },

  togglePermissionGroup(e) {
    const key = e.currentTarget.dataset.groupKey
    if (!key) return
    const collapsed = { ...(this.data.permissionCollapsed || {}) }
    collapsed[key] = !collapsed[key]
    this.setData({ permissionCollapsed: collapsed })
  },

  getFallbackCatalog() {
    return [
      { key: 'team', label: '团队管理', children: [
        { key: 'team.update', label: '修改团队信息' },
        { key: 'team.invite', label: '邀请成员加入' },
        { key: 'team.remove_member', label: '移除成员' },
        { key: 'team.group.manage', label: '管理分组' }
      ]},
      { key: 'parrot', label: '鹦鹉', children: [
        { key: 'parrot.view', label: '查看鹦鹉' },
        { key: 'parrot.create', label: '新增鹦鹉' },
        { key: 'parrot.edit', label: '编辑鹦鹉' },
        { key: 'parrot.delete', label: '删除鹦鹉' },
        { key: 'parrot.share', label: '分享到团队' }
      ]},
      { key: 'record', label: '记录', children: [
        { key: 'record.view', label: '查看记录' },
        { key: 'record.create', label: '新增记录' },
        { key: 'record.edit', label: '编辑记录' },
        { key: 'record.delete', label: '删除记录' }
      ]},
      { key: 'stats', label: '统计', children: [
        { key: 'stats.view', label: '查看统计' }
      ]},
      { key: 'finance', label: '收支', children: [
        { key: 'finance.view', label: '查看收支' },
        { key: 'finance.create', label: '新增收支' },
        { key: 'finance.edit', label: '编辑收支' },
        { key: 'finance.delete', label: '删除收支' },
        { key: 'finance.category.manage', label: '管理收支类别' }
      ]}
    ]
  },

  // 分组成员选择下拉
  toggleMemberDropdown() {
    // 计算可选成员：未分组成员（或编辑当前分组时允许其已在本组的成员在已选列表展示，不在下拉）
    const base = (this.data.members || []).filter(m => !m.group_id)
    const selectedIds = (this.data.selectedGroupMembers || []).map(x => x.user_id)
    const list = base.map(m => ({ ...m, selected: selectedIds.includes(m.user_id) }))
    this.setData({ showMemberDropdown: !this.data.showMemberDropdown, filteredMemberOptions: list, groupMemberSearchKeyword: '' })
  },

  onMemberSearchInput(e) {
    const keyword = (e.detail.value || '').trim()
    const base = (this.data.members || []).filter(m => !m.group_id)
    const selectedIds = (this.data.selectedGroupMembers || []).map(x => x.user_id)
    const filtered = base
      .filter(m => !keyword || String(m.nickname || '').includes(keyword))
      .map(m => ({ ...m, selected: selectedIds.includes(m.user_id) }))
    this.setData({ groupMemberSearchKeyword: keyword, filteredMemberOptions: filtered })
  },

  clearMemberSearch() {
    const base = (this.data.members || []).filter(m => !m.group_id)
    const selectedIds = (this.data.selectedGroupMembers || []).map(x => x.user_id)
    const list = base.map(m => ({ ...m, selected: selectedIds.includes(m.user_id) }))
    this.setData({ groupMemberSearchKeyword: '', filteredMemberOptions: list })
  },

  addMemberFromDropdown(e) {
    const uid = e.currentTarget.dataset.userId
    const exist = (this.data.selectedGroupMembers || []).some(x => String(x.user_id) === String(uid))
    if (exist) return
    const m = (this.data.members || []).find(x => String(x.user_id) === String(uid))
    if (!m) return
    const sel = (this.data.selectedGroupMembers || []).concat([m])
    this.setData({ selectedGroupMembers: sel, showMemberDropdown: false, groupMemberSearchKeyword: '' })
  },

  removeSelectedMember(e) {
    const uid = e.currentTarget.dataset.userId
    const sel = (this.data.selectedGroupMembers || []).filter(x => String(x.user_id) !== String(uid))
    this.setData({ selectedGroupMembers: sel })
  },

  // 不在 WXML 中直接调用函数，selected 状态已在 filteredMemberOptions 中预置

  async submitGroupEdit() {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId) return wx.showToast({ title: '无法识别当前团队', icon: 'none' })
    const name = this.data.groupEditName
    const description = this.data.groupEditDesc
    const permission_scope = this.data.groupEditPermission
    if (!name) return wx.showToast({ title: '名称不能为空', icon: 'none' })
    try {
      let res
      if (this.data.groupEditId) {
        res = await app.request({ url: `/api/teams/${teamId}/groups/${this.data.groupEditId}`, method: 'PUT', data: { name, description, permission_scope, permissions: this.data.permissionSelections || {} } })
      } else {
        res = await app.request({ url: `/api/teams/${teamId}/groups`, method: 'POST', data: { name, description, permission_scope, permissions: this.data.permissionSelections || {} } })
      }
      if (res && res.success) {
        const newGroupId = this.data.groupEditId || (res.data && res.data.id)
        // 保存成员分配：仅将选中成员分配到该组；若编辑模式，移除未选成员
        await this.syncGroupMembers(newGroupId)
        wx.showToast({ title: '已保存', icon: 'none' })
        this.setData({ showGroupEdit: false })
        await this.loadGroups()
        await this.loadMembersWithGroup()
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async syncGroupMembers(groupId) {
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!teamId || !groupId) return
    const selectedIds = (this.data.selectedGroupMembers || []).map(x => x.user_id)
    // 新增：将选中成员分配到该组（仅处理未分组成员）
    for (const uid of selectedIds) {
      try {
        await app.request({ url: `/api/teams/${teamId}/members/${uid}/group`, method: 'PUT', data: { group_id: groupId } })
      } catch (e) { console.warn('分配成员失败', uid, e) }
    }
    // 编辑模式：移除原有但未选中的成员（置为未分组）
    if (this.data.groupEditId) {
      const toRemove = (this.data.originalGroupMemberIds || []).filter(uid => !selectedIds.includes(uid))
      for (const uid of toRemove) {
        try {
          await app.request({ url: `/api/teams/${teamId}/members/${uid}/group`, method: 'PUT', data: { group_id: null } })
        } catch (e) { console.warn('移除成员失败', uid, e) }
      }
    }
  },

  async deleteGroup(e) {
    if (!this.data.isTeamOwner && !this.data.isTeamAdmin) return
    const gid = e.currentTarget.dataset.groupId
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    if (!gid || !teamId) return
    wx.showModal({
      title: '删除分组',
      content: '确认删除该分组？',
      confirmColor: '#ef4444',
      success: async (d) => {
        if (!d.confirm) return
        try {
          const res = await app.request({ url: `/api/teams/${teamId}/groups/${gid}`, method: 'DELETE' })
          if (res && res.success) {
            wx.showToast({ title: '已删除', icon: 'none' })
            await this.loadGroups()
            await this.init()
          } else {
            wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
          }
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
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

  async assignMemberGroup(e) {
    if (!this.data.isTeamOwner && !this.data.isTeamAdmin) return
    const userId = e.currentTarget.dataset.userId
    const teamId = this.data.teamInfo && this.data.teamInfo.id
    const groupOptions = ['未分组'].concat((this.data.groups || []).map(g => g.name))
    wx.showActionSheet({
      itemList: groupOptions,
      success: async (res) => {
        const idx = res.tapIndex
        const gid = idx === 0 ? null : (this.data.groups[idx - 1] && this.data.groups[idx - 1].id)
        try {
          const r = await app.request({ url: `/api/teams/${teamId}/members/${userId}/group`, method: 'PUT', data: { group_id: gid } })
          if (r && r.success) {
            wx.showToast({ title: '分组已更新', icon: 'none' })
            await this.init()
          } else {
            wx.showToast({ title: (r && r.message) || '更新失败', icon: 'none' })
          }
        } catch (err) {
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
  , stopPropagation() {}
})
