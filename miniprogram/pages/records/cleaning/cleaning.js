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

    selectedFilter: '全部',
    filterOptions: ['全部'],

    stats: {
      weeklyCount: 0,
      uniqueTypes: 0,
      lastTimeText: ''
    },

    menuRightPadding: 0
  },

  onShow() {
    this.computeMenuRightPadding()
    this.checkLoginAndLoad()
  },

  checkLoginAndLoad() {
    const isLogin = app.globalData.isLogin
    const userMode = app.globalData.userMode || 'personal'
    const isTeamMode = userMode === 'team'
    const hasOperationPermission = app.hasOperationPermission()

    this.setData({ isLogin, isTeamMode, hasOperationPermission })

    if (isLogin) {
      this.loadCleaningRecords(true)
    } else {
      this.setData({ cleaningRecords: [], displayRecords: [], stats: { weeklyCount: 0, uniqueTypes: 0, lastTimeText: '' } })
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
    const grouped = {}
    records.forEach(record => {
      const key = `${record.cleaning_time}_${record.notes || ''}_${record.description || ''}`
      if (!grouped[key]) {
        grouped[key] = {
          ...record,
          cleaning_time_formatted: app.formatDateTime(record.cleaning_time),
          parrot_names: [],
          cleaning_type_names: [],
          parrot_ids: [],
          cleaning_type_ids: [],
          record_ids: []
        }
      }
      if (record.parrot && record.parrot.name) {
        if (!grouped[key].parrot_names.includes(record.parrot.name)) {
          grouped[key].parrot_names.push(record.parrot.name)
          grouped[key].parrot_ids.push(record.parrot.id)
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
    const result = Object.values(grouped).map(item => ({
      ...item,
      parrot_name: item.parrot_names.join('、'),
      cleaning_type_text: item.cleaning_type_names.join('、')
    }))
    result.sort((a, b) => new Date(b.cleaning_time) - new Date(a.cleaning_time))
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
    const weeklyCount = records.filter(r => new Date(r.cleaning_time) >= weekAgo).length
    const uniqueTypes = this.buildFilterOptions(records).length - 1
    const lastTimeText = records[0] ? records[0].cleaning_time_formatted : ''
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
