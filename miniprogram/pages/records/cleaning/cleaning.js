// pages/records/cleaning/cleaning.js
const app = getApp()
const { parseServerTime } = require('../../../utils/time')

Page({
  data: {
    isLogin: false,
    isTeamMode: false,
    hasOperationPermission: false,
    loading: false,

    cleaningRecords: [],
    displayRecords: [],

    parrotsList: [],

    selectedFilter: '全部',
    filterOptions: ['全部'],

    stats: {
      weeklyCount: 0,
      uniqueTypes: 0,
      lastTimeText: ''
    },

    // 搜索与时间筛选
    searchQuery: '',
    startDate: '',
    endDate: '',

    // 虚拟化渲染（分块追加）
    virtualChunkIndex: 0,
    virtualChunkSize: 25,
    virtualDisplayRecords: [],

    menuRightPadding: 0,
    canViewRecords: true
  },


  // 分钟/小时/天 相对时间格式（超过24小时显示天）
  formatMinutesHoursOnly(value) {
    const dt = parseServerTime(value)
    if (!dt) return ''
    const now = new Date()
    const diffMs = now.getTime() - dt.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前`
  },

  onShow() {
    this.computeMenuRightPadding()
    this.checkLoginAndLoad()
  },

  async checkLoginAndLoad() {
    const isLogin = app.globalData.isLogin
    const userMode = app.globalData.userMode || 'personal'
    const isTeamMode = userMode === 'team'
    const hasOperationPermission = app.hasOperationPermission()

    this.setData({ isLogin, isTeamMode, hasOperationPermission })

    if (isLogin) {
      if (isTeamMode) {
        try {
          const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
          const teamId = cur && cur.success && cur.data && cur.data.id
          const userId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
          if (teamId && userId) {
            const membersRes = await app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
            if (membersRes && membersRes.success && Array.isArray(membersRes.data)) {
              const me = membersRes.data.find(m => String(m.user_id || m.id) === String(userId))
              const groupId = me && (typeof me.group_id !== 'undefined' ? me.group_id : null)
              const canView = !!groupId
              this.setData({ canViewRecords: canView })
              if (!canView) { this.setData({ cleaningRecords: [], displayRecords: [], virtualDisplayRecords: [], stats: { weeklyCount: 0, uniqueTypes: 0, lastTimeText: '' } }); return }
            }
          }
        } catch(_) { this.setData({ canViewRecords: false }); return }
      } else {
        this.setData({ canViewRecords: true })
      }
      try {
        await this.loadParrotsList()
      } catch (e) {
        console.warn('加载鹦鹉列表失败（忽略继续）:', e)
      }
      this.loadCleaningRecords(true)
    } else {
      this.setData({ cleaningRecords: [], displayRecords: [], stats: { weeklyCount: 0, uniqueTypes: 0, lastTimeText: '' }, canViewRecords: true })
    }
  },

  async loadParrotsList() {
    const res = await app.request({
      url: '/api/parrots',
      method: 'GET',
      data: { limit: 100 }
    })
    if (res && res.success && res.data && Array.isArray(res.data.parrots)) {
      this.setData({ parrotsList: res.data.parrots })
    }
  },

  async loadCleaningRecords(refresh = false) {
    if (this.data.loading && !refresh) return
    this.setData({ loading: true })
    try {
      const res = await app.request({
        url: '/api/records/cleaning',
        method: 'GET',
        data: { page: 1, per_page: 50 }
      })
      if (res && res.success) {
        const raw = (res.data.items || res.data || [])
        const aggregated = this.aggregateCleaningRecords(raw)
        const filterOptions = this.buildFilterOptions(aggregated)
        const stats = this.computeStats(aggregated)
        this.setData({ cleaningRecords: aggregated, filterOptions, stats })
        this.applyFilter(this.data.selectedFilter)
      }
    } catch (e) {
      console.error('加载清洁记录失败:', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  aggregateCleaningRecords(records) {
    const allParrots = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
    const grouped = {}
    records.forEach(record => {
      const key = `${record.cleaning_time}_${record.notes || ''}_${record.description || ''}`
      const dt = parseServerTime(record.cleaning_time)
      if (!grouped[key]) {
        grouped[key] = {
          ...record,
          timeValue: dt ? dt.toISOString() : record.cleaning_time,
          cleaning_time_formatted: dt ? app.formatDateTime(dt) : app.formatDateTime(record.cleaning_time),
          parrot_names: [],
          cleaning_type_names: [],
          parrot_ids: [],
          cleaning_type_ids: [],
          record_ids: [],
          parrot_avatar_map: {}
        }
      }
      if (record.parrot && record.parrot.name) {
        if (!grouped[key].parrot_names.includes(record.parrot.name)) {
          grouped[key].parrot_names.push(record.parrot.name)
          grouped[key].parrot_ids.push(record.parrot.id)
        }
        // 收集头像
        const pid = record.parrot.id
        let pavatar = (function(){
          const resolvedPhoto = record.parrot.photo_url ? app.resolveUploadUrl(record.parrot.photo_url) : ''
          const resolvedAvatar = record.parrot.avatar_url ? app.resolveUploadUrl(record.parrot.avatar_url) : ''
          return resolvedPhoto || resolvedAvatar
        })()
        if (!pavatar && pid) {
          const p = allParrots.find(x => x.id === pid || (record.parrot.name && x.name === record.parrot.name))
          if (p) {
            const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
            const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
            pavatar = resolvedPhoto || resolvedAvatar
            if (!pavatar) {
              const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
              pavatar = app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
            }
          }
        }
        if (!pavatar) {
          // 兜底彩色头像
          pavatar = app.getDefaultAvatarForParrot({ name: record.parrot.name }) || '/images/parrot-avatar-green.svg'
        }
        if (pid && pavatar && !grouped[key].parrot_avatar_map[pid]) {
          grouped[key].parrot_avatar_map[pid] = pavatar
        }
      }
      if (record.cleaning_type_text || record.cleaning_type) {
        const name = record.cleaning_type_text || record.cleaning_type
        if (!grouped[key].cleaning_type_names.includes(name)) {
          grouped[key].cleaning_type_names.push(name)
          if (record.cleaning_type) grouped[key].cleaning_type_ids.push(record.cleaning_type)
        }
      }
      if (record.id && !grouped[key].record_ids.includes(record.id)) {
        grouped[key].record_ids.push(record.id)
      }
    })
    const result = Object.values(grouped).map(item => {
      const parrot_avatars = (item.parrot_ids || []).map(pid => {
        if (item.parrot_avatar_map[pid]) {
          // parrot_avatar_map 中的值已经是经过 resolveUploadUrl 处理过的（可能是 http 也可能是 wxfile），
          // 不需要再次调用 resolveUploadUrl，否则会导致 wxfile 路径被错误地拼接 baseUrl
          const u = item.parrot_avatar_map[pid]
          return app.getThumbnailUrl(u, 128)
        }
        const p = allParrots.find(x => x.id === pid)
        if (p) {
          const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
          const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
          const url = resolvedPhoto || resolvedAvatar
          if (url) return app.getThumbnailUrl(url, 128)
          const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
          return app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
        }
        return '/images/parrot-avatar-green.svg'
      }).filter(Boolean)
      const firstAvatar = parrot_avatars.length ? parrot_avatars[0] : '/images/parrot-avatar-green.svg'
      return {
        ...item,
        parrot_name: item.parrot_names.join('、'),
        cleaning_type_text: item.cleaning_type_names.join('、'),
        parrot_avatars,
        parrot_avatar: firstAvatar,
        parrot_count: item.parrot_ids.length
      }
    })
    result.sort((a, b) => {
      const ta = parseServerTime(a.timeValue || a.cleaning_time)
      const tb = parseServerTime(b.timeValue || b.cleaning_time)
      const ma = ta ? ta.getTime() : 0
      const mb = tb ? tb.getTime() : 0
      // 按时间倒序，最近的在前
      return mb - ma
    })
    return result
  },

  buildFilterOptions(records) {
    const set = new Set()
    records.forEach(r => {
      const types = (r.cleaning_type_text || '').split('、').filter(Boolean)
      types.forEach(t => set.add(t))
    })
    return ['全部', ...Array.from(set)]
  },

  computeStats(records) {
    const now = new Date()
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    const weeklyCount = records.filter(r => {
      const d = parseServerTime(r.timeValue || r.cleaning_time)
      return d && d >= weekAgo
    }).length
    const uniqueTypes = this.buildFilterOptions(records).length - 1
    const lastTimeText = records[0] ? this.formatMinutesHoursOnly(records[0].timeValue || records[0].cleaning_time) : ''
    return { weeklyCount, uniqueTypes, lastTimeText }
  },

  applyFilter(filter) {
    const { cleaningRecords, searchQuery, startDate, endDate } = this.data
    let display = cleaningRecords

    // 类型筛选
    if (filter && filter !== '全部') {
      display = display.filter(r => {
        const types = (r.cleaning_type_text || '').split('、')
        return types.includes(filter)
      })
    }

    // 关键词搜索（鹦鹉名/类型/备注/描述/创建者）
    const q = (searchQuery || '').trim()
    if (q) {
      const lowerQ = q.toLowerCase()
      display = display.filter(r => {
        const fields = [
          r.parrot_name || '',
          r.cleaning_type_text || r.cleaning_type || '',
          r.description || '',
          r.notes || '',
          r.created_by_username || ''
        ].map(x => String(x).toLowerCase())
        return fields.some(f => f.includes(lowerQ))
      })
    }

    // 时间范围筛选（包含端点）
    if (startDate || endDate) {
      const startTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity
      const endTs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity
      display = display.filter(r => {
        const d = parseServerTime(r.timeValue || r.cleaning_time)
        const ts = d ? d.getTime() : 0
        return ts >= startTs && ts <= endTs
      })
    }

    // 更新展示与统计
    this.setData({ selectedFilter: filter, displayRecords: display, stats: this.computeStats(display) })
    this.resetVirtualWindow()
  },

  selectFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.applyFilter(filter)
  },

  onSearchInput(e) {
    const val = (e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ searchQuery: val })
    this.applyFilter(this.data.selectedFilter)
  },

  onStartDateChange(e) {
    const val = (e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ startDate: val })
    this.applyFilter(this.data.selectedFilter)
  },

  onEndDateChange(e) {
    const val = (e.detail && e.detail.value) ? e.detail.value : ''
    this.setData({ endDate: val })
    this.applyFilter(this.data.selectedFilter)
  },

  clearDateFilter() {
    this.setData({ startDate: '', endDate: '' })
    this.applyFilter(this.data.selectedFilter)
  },

  resetVirtualWindow() {
    const size = this.data.virtualChunkSize || 25
    const list = Array.isArray(this.data.displayRecords) ? this.data.displayRecords : []
    const initial = list.slice(0, size)
    this.setData({ virtualChunkIndex: 0, virtualDisplayRecords: initial })
  },

  onListScrollLower() {
    const { displayRecords, virtualDisplayRecords, virtualChunkIndex, virtualChunkSize } = this.data
    if (!Array.isArray(displayRecords) || !Array.isArray(virtualDisplayRecords)) return
    const size = virtualChunkSize || 25
    const nextIndex = virtualChunkIndex + 1
    const start = nextIndex * size
    if (start >= displayRecords.length) return
    const nextChunk = displayRecords.slice(start, start + size)
    this.setData({
      virtualChunkIndex: nextIndex,
      virtualDisplayRecords: virtualDisplayRecords.concat(nextChunk)
    })
  },

  addCleaningRecord() {
    if (!this.data.isLogin) {
      app.showError('请先登录后再添加记录')
      return
    }
    if (this.data.isTeamMode && !this.data.hasOperationPermission) {
      wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 })
      return
    }
    wx.navigateTo({ url: '/pages/records/add-record/add-record?type=cleaning' })
  },

  // 查看记录详情（支持单条与聚合记录）
  viewRecordDetail(e) {
    const ds = e.currentTarget?.dataset || {}
    const id = ds.id || ''
    const ids = ds.ids || ''
    const derivedId = id || (ids ? String(ids).split(',').filter(Boolean)[0] : '')
    const query = ['type=cleaning']
    if (derivedId) query.push(`id=${derivedId}`)
    if (ids) query.push(`record_ids=${ids}`)
    wx.navigateTo({ url: `/pages/records/detail/detail?${query.join('&')}` })
  },

  // 编辑记录
  editRecord(e) {
    const { id, ids, parrotIds, cleaningTypeIds } = e.currentTarget.dataset;
    // 兜底：如果没有单个 id，但有记录ID集合，则取首个
    let derivedId = id
    if ((derivedId === undefined || derivedId === null || !String(derivedId).length) && ids !== undefined && ids !== null) {
      if (Array.isArray(ids) && ids.length) {
        derivedId = ids[0]
      } else {
        const s = String(ids)
        if (s.length) {
          derivedId = s.split(',')[0]
        }
      }
    }
    const parts = [];
    const joinValue = (v) => Array.isArray(v) ? v.join(',') : String(v);
    parts.push('mode=edit');
    parts.push('type=cleaning');
    if (derivedId !== undefined && derivedId !== null && String(derivedId).length) {
      parts.push('id=' + encodeURIComponent(String(derivedId)));
    }
    if (ids !== undefined && ids !== null && String(joinValue(ids)).length) {
      parts.push('record_ids=' + encodeURIComponent(joinValue(ids)));
    }
    if (parrotIds !== undefined && parrotIds !== null && String(joinValue(parrotIds)).length) {
      parts.push('parrot_ids=' + encodeURIComponent(joinValue(parrotIds)));
    }
    if (cleaningTypeIds !== undefined && cleaningTypeIds !== null && String(joinValue(cleaningTypeIds)).length) {
      parts.push('cleaning_type_ids=' + encodeURIComponent(joinValue(cleaningTypeIds)));
    }
    const url = `/pages/records/add-record/add-record?${parts.join('&')}`;
    wx.navigateTo({ url });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条清洁记录吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id);
        }
      }
    });
  },

  // 执行删除操作
  async performDelete(id) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const res = await app.request({
        url: `/api/records/cleaning/${id}`,
        method: 'DELETE'
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadCleaningRecords();
      } else {
        wx.showToast({
          title: res.message || '删除失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      if (wx.switchTab) {
        wx.switchTab({ url: '/pages/index/index' })
      } else {
        wx.redirectTo({ url: '/pages/index/index' })
      }
    }
  },

  computeMenuRightPadding() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
      const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (win && rect && typeof win.windowWidth === 'number') {
        const rightGap = win.windowWidth - rect.right
        const menuRightPadding = rightGap + rect.width + 8
        this.setData({ menuRightPadding })
      }
    } catch (e) {
      this.setData({ menuRightPadding: 0 })
    }
  },

  onPullDownRefresh() {
    this.loadCleaningRecords(true).finally(() => wx.stopPullDownRefresh())
  }
})
