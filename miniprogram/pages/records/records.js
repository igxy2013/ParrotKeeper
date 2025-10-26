// pages/records/records.js
const app = getApp()

Page({
  data: {
    activeTab: 'feeding',
    isLogin: false,
    isTeamMode: false, // 添加团队模式标识
    hasOperationPermission: false, // 添加操作权限标识
    
    // 记录数据
    feedingRecords: [],
    healthRecords: [],
    cleaningRecords: [],
    breedingRecords: [],
    
    // 筛选数据
    parrotsList: [],
    selectedParrot: '',
    selectedParrotId: '',
    dateRange: 'all',
    dateFilterText: '全部时间',
    
    // 弹窗状态
    showParrotModal: false,
    showDateModal: false,
    
    // 加载状态
    loading: false,
    
    // 分页
    page: 1,
    hasMore: true
  },

  // 页面显示时检查登录并加载
  onShow() {
    this.checkLoginAndLoad()
  },

  // 检查登录状态并加载数据
  checkLoginAndLoad() {
    const isLogin = app.globalData.isLogin
    const userMode = app.globalData.userMode || 'personal'
    const isTeamMode = userMode === 'team'
    const hasOperationPermission = app.hasOperationPermission()
    
    this.setData({ 
      isLogin,
      isTeamMode,
      hasOperationPermission
    })
    
    if (isLogin) {
      this.loadParrotsList()
      this.loadRecords()
    } else {
      // 游客模式显示提示信息
      this.setData({
        feedingRecords: [],
        healthRecords: [],
        cleaningRecords: [],
        breedingRecords: [],
        parrotsList: []
      })
    }
  },

  // 刷新数据
  refreshData() {
    this.loadRecords(true)
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      page: 1,
      hasMore: true
    })
    this.loadRecords(true)
  },

  // 加载鹦鹉列表
  async loadParrotsList() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      
      if (res.success) {
        this.setData({
          parrotsList: res.data.parrots
        })
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
    }
  },

  // 根据日期范围获取参数（统一为后端识别的 start_date / end_date）
  getDateRangeParams() {
    const { dateRange } = this.data
    const now = new Date()
    const formatDate = d => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    let start = null
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dateRange === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    } else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    }

    if (start) {
      return { start_date: formatDate(start), end_date: formatDate(end) }
    }
    return {}
  },

  // 加载记录
  async loadRecords(refresh = false) {
    if (this.data.loading && !refresh) return
    
    this.setData({ loading: true })
    
    try {
      let url = ''
      let dataKey = ''
      
      switch (this.data.activeTab) {
        case 'feeding':
          url = '/api/records/feeding'
          dataKey = 'feedingRecords'
          break
        case 'health':
          url = '/api/records/health'
          dataKey = 'healthRecords'
          break
        case 'cleaning':
          url = '/api/records/cleaning'
          dataKey = 'cleaningRecords'
          break
        case 'breeding':
          url = '/api/records/breeding'
          dataKey = 'breedingRecords'
          break
      }
      
      const currentPage = refresh ? 1 : this.data.page
      const params = {
        page: currentPage,
        per_page: 10,
        parrot_id: this.data.selectedParrotId,
        ...this.getDateRangeParams()
      }
      
      const res = await app.request({
        url,
        method: 'GET',
        data: params
      })
      
      if (res.success) {
        const newRecords = this.formatRecords(res.data.items || res.data)
        
        if (refresh) {
          // 刷新时重置所有数据和分页状态
          this.setData({
            [dataKey]: newRecords,
            page: ((res.data && res.data.current_page) || 1) + 1,
            hasMore: !!(res.data && res.data.has_next)
          })
        } else {
          // 加载更多时追加数据
          const merged = [...(this.data[dataKey] || []), ...newRecords]
          this.setData({
            [dataKey]: merged,
            page: ((res.data && res.data.current_page) || currentPage) + 1,
            hasMore: !!(res.data && res.data.has_next)
          })
        }
      }
    } catch (error) {
      console.error('加载记录失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 格式化记录数据
  formatRecords(records) {
    switch (this.data.activeTab) {
      case 'feeding':
        return this.aggregateFeedingRecords(records)
      case 'cleaning':
        return this.aggregateCleaningRecords(records)
      case 'health':
      case 'breeding':
        return records.map(r => ({
          ...r,
          feeding_time_formatted: r.feeding_time ? app.formatDateTime(r.feeding_time) : '',
          record_date_formatted: r.record_date ? app.formatDateTime(r.record_date) : '',
          cleaning_time_formatted: r.cleaning_time ? app.formatDateTime(r.cleaning_time) : '',
          mating_date_formatted: r.mating_date ? app.formatDateTime(r.mating_date) : '',
          egg_laying_date_formatted: r.egg_laying_date ? app.formatDateTime(r.egg_laying_date) : '',
          hatching_date_formatted: r.hatching_date ? app.formatDateTime(r.hatching_date) : ''
        }))
      default:
        return records
    }
  },

  // 聚合喂食记录以支持多选显示
  aggregateFeedingRecords(records) {
    const groupedRecords = {}
    
    // 按时间、备注、数量分组
    records.forEach((record) => {
      const key = `${record.feeding_time}_${record.notes || ''}_${record.amount || ''}`
      
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          ...record,
          feeding_time_formatted: app.formatDateTime(record.feeding_time),
          parrot_names: [],
          feed_type_names: [],
          parrot_ids: [],
          feed_type_ids: [],
          record_ids: []
        }
      }
      
      // 收集鹦鹉
      if (record.parrot && record.parrot.name) {
        if (!groupedRecords[key].parrot_names.includes(record.parrot.name)) {
          groupedRecords[key].parrot_names.push(record.parrot.name)
          groupedRecords[key].parrot_ids.push(record.parrot.id)
        }
      }
      
      // 收集食物类型
      if (record.feed_type && record.feed_type.name) {
        if (!groupedRecords[key].feed_type_names.includes(record.feed_type.name)) {
          groupedRecords[key].feed_type_names.push(record.feed_type.name)
          groupedRecords[key].feed_type_ids.push(record.feed_type.id)
        }
      }

      // 收集原始记录ID
      if (record.id && !groupedRecords[key].record_ids.includes(record.id)) {
        groupedRecords[key].record_ids.push(record.id)
      }
    })
    
    // 生成显示文本
    const result = Object.values(groupedRecords).map(item => ({
      ...item,
      parrot_name: item.parrot_names.join('、'),
      feed_type_names_text: item.feed_type_names.join('、')
    }))
    
    return result
  },

  // 聚合清洁记录以支持多选显示
  aggregateCleaningRecords(records) {
    const groupedRecords = {}
    
    // 按时间、备注、描述分组
    records.forEach((record) => {
      const key = `${record.cleaning_time}_${record.notes || ''}_${record.description || ''}`
      
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          ...record,
          cleaning_time_formatted: app.formatDateTime(record.cleaning_time),
          parrot_names: [],
          cleaning_type_names: [],
          parrot_ids: [],
          cleaning_type_ids: [],
          record_ids: []
        }
      }
      
      // 收集鹦鹉
      if (record.parrot && record.parrot.name) {
        if (!groupedRecords[key].parrot_names.includes(record.parrot.name)) {
          groupedRecords[key].parrot_names.push(record.parrot.name)
          groupedRecords[key].parrot_ids.push(record.parrot.id)
        }
      }
      
      // 收集清洁类型
      if (record.cleaning_type_text || record.cleaning_type) {
        const cleaningTypeName = record.cleaning_type_text || record.cleaning_type
        if (!groupedRecords[key].cleaning_type_names.includes(cleaningTypeName)) {
          groupedRecords[key].cleaning_type_names.push(cleaningTypeName)
          if (record.cleaning_type) {
            groupedRecords[key].cleaning_type_ids.push(record.cleaning_type)
          }
        }
      }

      // 收集原始记录ID
      if (record.id && !groupedRecords[key].record_ids.includes(record.id)) {
        groupedRecords[key].record_ids.push(record.id)
      }
    })
    
    // 生成显示文本
    const result = Object.values(groupedRecords).map(item => ({
      ...item,
      parrot_name: item.parrot_names.join('、'),
      cleaning_type_text: item.cleaning_type_names.join('、')
    }))
    
    // 保持与后端排序一致（按时间倒序）
    result.sort((a, b) => new Date(b.cleaning_time) - new Date(a.cleaning_time))
    
    return result
  },

  // 显示鹦鹉筛选
  showParrotFilter() {
    this.setData({ showParrotModal: true })
  },

  // 隐藏鹦鹉筛选
  hideParrotFilter() {
    this.setData({ showParrotModal: false })
  },

  // 选择鹦鹉
  selectParrot(e) {
    const { parrot, id } = e.currentTarget.dataset
    this.setData({
      selectedParrot: parrot || '',
      selectedParrotId: id || '',
      showParrotModal: false
    })
    this.refreshData()
  },

  // 显示日期筛选
  showDateFilter() {
    this.setData({ showDateModal: true })
  },

  // 隐藏日期筛选
  hideDateFilter() {
    this.setData({ showDateModal: false })
  },

  // 选择日期范围
  selectDateRange(e) {
    const range = e.currentTarget.dataset.range
    const rangeMap = {
      'all': '全部时间',
      'today': '今天',
      'week': '最近一周',
      'month': '最近一月'
    }
    
    this.setData({
      dateRange: range,
      dateFilterText: rangeMap[range],
      showDateModal: false
    })
    this.refreshData()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭模态框
  },

  // 添加记录
  addRecord() {
    const urlMap = {
      'feeding': '/pages/records/add-record/add-record?type=feeding',
      'health': '/pages/records/add-record/add-record?type=health',
      'cleaning': '/pages/records/add-record/add-record?type=cleaning',
      'breeding': '/pages/records/add-record/add-record?type=breeding'
    }
    
    wx.navigateTo({
      url: urlMap[this.data.activeTab]
    })
  },

  // 添加喂食记录
  addFeedingRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=feeding'
    })
  },

  // 添加健康记录
  addHealthRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=health'
    })
  },

  // 添加清洁记录
  addCleaningRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=cleaning'
    })
  },

  // 添加繁殖记录
  addBreedingRecord() {
    // 确保切换到繁殖记录标签页
    this.setData({
      activeTab: 'breeding'
    })
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=breeding'
    })
  },

  // 编辑记录（传递聚合的多选ID到编辑页）
  editRecord(e) {
    const { type, id, ids, parrotIds, feedTypeIds, cleaningTypeIds } = e.currentTarget.dataset
    
    let url = `/pages/records/add-record/add-record?type=${type}&id=${id}`
    if (type === 'feeding') {
      const pids = Array.isArray(parrotIds) ? parrotIds.join(',') : (parrotIds || '')
      const ftids = Array.isArray(feedTypeIds) ? feedTypeIds.join(',') : (feedTypeIds || '')
      const rids = Array.isArray(ids) ? ids.join(',') : (ids || '')
      if (pids) url += `&parrot_ids=${encodeURIComponent(pids)}`
      if (ftids) url += `&food_type_ids=${encodeURIComponent(ftids)}`
      if (rids) url += `&record_ids=${encodeURIComponent(rids)}`
    } else if (type === 'cleaning') {
      const pids = Array.isArray(parrotIds) ? parrotIds.join(',') : (parrotIds || '')
      const ctids = Array.isArray(cleaningTypeIds) ? cleaningTypeIds.join(',') : (cleaningTypeIds || '')
      const rids = Array.isArray(ids) ? ids.join(',') : (ids || '')
      if (pids) url += `&parrot_ids=${encodeURIComponent(pids)}`
      if (ctids) url += `&cleaning_type_ids=${encodeURIComponent(ctids)}`
      if (rids) url += `&record_ids=${encodeURIComponent(rids)}`
    }
    
    wx.navigateTo({ url })
  },

  // 删除记录
  async deleteRecord(e) {
    const { type, id } = e.currentTarget.dataset
    if (!id || !type) return
    
    const paths = {
      feeding: '/api/records/feeding',
      health: '/api/records/health',
      cleaning: '/api/records/cleaning',
      breeding: '/api/records/breeding'
    }
    const base = paths[type]
    if (!base) return

    try {
      const resModal = await new Promise((resolve) => {
        wx.showModal({
          title: '确认删除',
          content: '确认删除该记录？此操作不可恢复',
          confirmText: '删除',
          confirmColor: '#e74c3c',
          success: resolve,
          fail: () => resolve({ confirm: false })
        })
      })
      if (!resModal.confirm) return

      if (type === 'feeding' || type === 'cleaning') {
        const { ids } = e.currentTarget.dataset
        const idList = Array.isArray(ids) ? ids : (ids ? [ids] : [id])
        for (const rid of idList) {
          const res = await app.request({ url: `${base}/${rid}`, method: 'DELETE' })
          if (!res.success) throw new Error(res.message || `删除失败: ${rid}`)
        }
      } else {
        const res = await app.request({ url: `${base}/${id}`, method: 'DELETE' })
        if (!res.success) throw new Error(res.message || '删除失败')
      }

      wx.showToast({ title: '删除成功', icon: 'success' })
      this.refreshData()
    } catch (error) {
      console.error('删除记录失败:', error)
      app.showError('删除记录失败')
    }
  },

  // 页面上拉触底事件：加载下一页
  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return
    this.loadRecords(false)
  },

  // 页面下拉刷新事件：刷新到第一页
  onPullDownRefresh() {
    this.loadRecords(true)
      .finally(() => wx.stopPullDownRefresh())
  }
})