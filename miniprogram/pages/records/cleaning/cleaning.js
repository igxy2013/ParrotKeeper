// pages/records/cleaning/cleaning.js
const app = getApp()

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

    menuRightPadding: 0
  },

  // 解析服务端时间字符串，兼容无时区/ISO/空格分隔格式
  parseServerTime(value) {
    if (!value) return null
    try {
      if (value instanceof Date) return value
      if (typeof value === 'number') {
        const dNum = new Date(value)
        return isNaN(dNum.getTime()) ? null : dNum
      }
      if (typeof value === 'string') {
        const s = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return new Date(`${s}T00:00:00`)
        }
        if (s.includes('T')) {
          if (/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
            const d = new Date(s)
            return isNaN(d.getTime()) ? null : d
          }
          const dUtc = new Date(s + 'Z')
          if (!isNaN(dUtc.getTime())) return dUtc
          const dLocal = new Date(s)
          return isNaN(dLocal.getTime()) ? null : dLocal
        }
        const isoLocal = s.replace(' ', 'T')
        let d = new Date(isoLocal + 'Z')
        if (!isNaN(d.getTime())) return d
        d = new Date(isoLocal)
        if (!isNaN(d.getTime())) return d
        d = new Date(s.replace(/-/g, '/'))
        return isNaN(d.getTime()) ? null : d
      }
      return null
    } catch (e) {
      return null
    }
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
      try {
        await this.loadParrotsList()
      } catch (e) {
        console.warn('加载鹦鹉列表失败（忽略继续）:', e)
      }
      this.loadCleaningRecords(true)
    } else {
      this.setData({ cleaningRecords: [], displayRecords: [], stats: { weeklyCount: 0, uniqueTypes: 0, lastTimeText: '' } })
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
      const dt = this.parseServerTime(record.cleaning_time)
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
        let pavatar = record.parrot.photo_url || record.parrot.avatar_url
        if (!pavatar && pid) {
          const p = allParrots.find(x => x.id === pid || (record.parrot.name && x.name === record.parrot.name))
          pavatar = p ? (p.photo_url || p.avatar_url) : null
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
        if (item.parrot_avatar_map[pid]) return item.parrot_avatar_map[pid]
        const p = allParrots.find(x => x.id === pid)
        return p ? (p.photo_url || p.avatar_url) : null
      }).filter(Boolean)
      const firstAvatar = parrot_avatars.length ? parrot_avatars[0] : null
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
      const da = this.parseServerTime(b.timeValue || b.cleaning_time)
      const db = this.parseServerTime(a.timeValue || a.cleaning_time)
      const ma = da ? da.getTime() : 0
      const mb = db ? db.getTime() : 0
      return ma - mb
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
      const d = this.parseServerTime(r.timeValue || r.cleaning_time)
      return d && d >= weekAgo
    }).length
    const uniqueTypes = this.buildFilterOptions(records).length - 1
    const lastTimeText = records[0] ? (() => {
      const d = this.parseServerTime(records[0].timeValue || records[0].cleaning_time)
      return d ? app.formatRelativeTime(d) : app.formatRelativeTime(records[0].cleaning_time)
    })() : ''
    return { weeklyCount, uniqueTypes, lastTimeText }
  },

  applyFilter(filter) {
    const { cleaningRecords } = this.data
    let display = cleaningRecords
    if (filter && filter !== '全部') {
      display = cleaningRecords.filter(r => {
        const types = (r.cleaning_type_text || '').split('、')
        return types.includes(filter)
      })
    }
    this.setData({ selectedFilter: filter, displayRecords: display })
  },

  selectFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.applyFilter(filter)
  },

  addCleaningRecord() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    wx.navigateTo({ url: '/pages/records/add-record/add-record?type=cleaning' })
  },

  // 编辑记录
  editRecord(e) {
    const { id, ids, parrotIds, cleaningTypeIds } = e.currentTarget.dataset;
    const parts = [];
    const joinValue = (v) => Array.isArray(v) ? v.join(',') : String(v);
    parts.push('mode=edit');
    parts.push('type=cleaning');
    if (id !== undefined && id !== null && String(id).length) {
      parts.push('id=' + encodeURIComponent(String(id)));
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
