// pages/records/records.js
const app = getApp()
const { parseServerTime } = require('../../utils/time')

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
    showAddRecordModal: false, // 添加记录模态弹窗
    modalRecordType: 'feeding', // 模态弹窗中的记录类型
    
    // 加载状态
    loading: false,
    
    // 分页
    page: 1,
    hasMore: true,
    menuRightPadding: 0
  },
  
  // 查看记录详情（统一处理四类记录）
  viewRecordDetail(e) {
    const ds = e.currentTarget.dataset || {}
    const type = ds.type || this.data.activeTab || 'feeding'
    const id = ds.id || ''
    const ids = ds.ids || ''
    const derivedId = id || (ids ? String(ids).split(',').filter(Boolean)[0] : '')
    const query = [`type=${type}`]
    if (derivedId) query.push(`id=${derivedId}`)
    if (ids) query.push(`record_ids=${ids}`)
    wx.navigateTo({ url: `/pages/records/detail/detail?${query.join('&')}` })
  },

  // 页面显示时检查登录并加载
  onShow() {
    this.computeMenuRightPadding()
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
      case 'health': {
        const list = Array.isArray(records) ? records : []
        const allParrots = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
        const mapped = list.map(r => {
          const formatted = {
            ...r,
            feeding_time_formatted: r.feeding_time ? app.formatDateTime(r.feeding_time) : '',
            record_date_formatted: r.record_date ? app.formatDateTime(r.record_date) : '',
            cleaning_time_formatted: r.cleaning_time ? app.formatDateTime(r.cleaning_time) : '',
            mating_date_formatted: r.mating_date ? app.formatDateTime(r.mating_date) : '',
            egg_laying_date_formatted: r.egg_laying_date ? app.formatDateTime(r.egg_laying_date) : '',
            hatching_date_formatted: r.hatching_date ? app.formatDateTime(r.hatching_date) : ''
          }
          const pid = r.parrot_id || (r.parrot && r.parrot.id)
          const p = r.parrot || allParrots.find(x => (pid && x.id === pid) || (r.parrot_name && x.name === r.parrot_name))
          let avatar = null
          if (p) {
            const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
            const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
            const base = resolvedPhoto || resolvedAvatar
            avatar = base ? app.getThumbnailUrl(base, 128) : ''
            if (!avatar) {
              const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
              avatar = app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
            }
          } else {
            // 未找到鹦鹉对象时，以名称兜底彩色头像
            avatar = app.getDefaultAvatarForParrot({ name: r.parrot_name })
          }
          return {
            ...formatted,
            parrot_avatar: avatar,
            parrot_avatars: avatar ? [avatar] : []
          }
        })
        mapped.sort((a, b) => {
          const rdA = String(a.record_date || '').trim()
          const rtA0 = String(a.record_time || '').trim()
          const rdB = String(b.record_date || '').trim()
          const rtB0 = String(b.record_time || '').trim()
          let mA = ''
          let mB = ''
          if (rdA || rtA0) {
            if (rdA && rtA0) {
              let rt = rtA0
              if (rt.length === 5) rt = `${rt}:00`
              if (rt.length > 8) rt = rt.substring(0, 8)
              mA = `${rdA}T${rt}`
            } else {
              const s = rdA || rtA0
              mA = s.includes(' ') ? s.replace(' ', 'T') : s
            }
          }
          if (rdB || rtB0) {
            if (rdB && rtB0) {
              let rt = rtB0
              if (rt.length === 5) rt = `${rt}:00`
              if (rt.length > 8) rt = rt.substring(0, 8)
              mB = `${rdB}T${rt}`
            } else {
              const s = rdB || rtB0
              mB = s.includes(' ') ? s.replace(' ', 'T') : s
            }
          }
          const tA = (parseServerTime(mA) || parseServerTime(a.record_time || '') || parseServerTime(a.created_at || '') || new Date(0)).getTime()
          const tB = (parseServerTime(mB) || parseServerTime(b.record_time || '') || parseServerTime(b.created_at || '') || new Date(0)).getTime()
          return tB - tA
        })
        return mapped
      }
      case 'breeding': {
        const list = Array.isArray(records) ? records : []
        const allParrots = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
        const mapped = list.map(r => {
          const formatted = {
            ...r,
            created_at_formatted: r.created_at ? app.formatDateTime(r.created_at) : '',
            mating_date_formatted: r.mating_date ? app.formatDateTime(r.mating_date) : '',
            egg_laying_date_formatted: r.egg_laying_date ? app.formatDateTime(r.egg_laying_date) : '',
            hatching_date_formatted: r.hatching_date ? app.formatDateTime(r.hatching_date) : '',
            // 记录时间统一显示逻辑：优先后端 record_time（最后添加/编辑时间），其次 created_at，再回退节点日期
            record_time_formatted: (r.record_time
              ? app.formatDateTime(r.record_time)
              : (r.created_at
                ? app.formatDateTime(r.created_at)
                : (r.mating_date
                  ? app.formatDateTime(r.mating_date)
                  : (r.egg_laying_date
                    ? app.formatDateTime(r.egg_laying_date)
                    : (r.hatching_date
                      ? app.formatDateTime(r.hatching_date)
                      : '')))))
          }
          // 取公母两只鹦鹉头像
          const male = r.male_parrot || allParrots.find(x => (r.male_parrot_id && x.id === r.male_parrot_id) || (r.male_parrot_name && x.name === r.male_parrot_name))
          const female = r.female_parrot || allParrots.find(x => (r.female_parrot_id && x.id === r.female_parrot_id) || (r.female_parrot_name && x.name === r.female_parrot_name))
          const maleResolvedPhoto = male && male.photo_url ? app.resolveUploadUrl(male.photo_url) : ''
          const maleResolvedAvatar = male && male.avatar_url ? app.resolveUploadUrl(male.avatar_url) : ''
          const femaleResolvedPhoto = female && female.photo_url ? app.resolveUploadUrl(female.photo_url) : ''
          const femaleResolvedAvatar = female && female.avatar_url ? app.resolveUploadUrl(female.avatar_url) : ''
          const maleBase = maleResolvedPhoto || maleResolvedAvatar
          const femaleBase = femaleResolvedPhoto || femaleResolvedAvatar
          const maleThumb = maleBase ? app.getThumbnailUrl(maleBase, 128) : null
          const femaleThumb = femaleBase ? app.getThumbnailUrl(femaleBase, 128) : null
          const parrot_avatars = [maleThumb, femaleThumb].filter(Boolean)
          return {
            ...formatted,
            parrot_avatars,
            parrot_avatar: parrot_avatars[0] || null
          }
        })
        mapped.sort((a, b) => {
          const candA = a.record_time || a.created_at || a.mating_date || a.egg_laying_date || a.hatching_date || ''
          const candB = b.record_time || b.created_at || b.mating_date || b.egg_laying_date || b.hatching_date || ''
          const tA = (parseServerTime(candA) || new Date(0)).getTime()
          const tB = (parseServerTime(candB) || new Date(0)).getTime()
          return tB - tA
        })
        return mapped
      }
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
    result.sort((a, b) => {
      const tA = (parseServerTime(a.feeding_time) || new Date(0)).getTime()
      const tB = (parseServerTime(b.feeding_time) || new Date(0)).getTime()
      return tB - tA
    })
    return result
  },

  // 聚合清洁记录以支持多选显示
  aggregateCleaningRecords(records) {
    const groupedRecords = {}
    const allParrots = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
    
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
          record_ids: [],
          parrot_avatar_map: {}
        }
      }
      
      // 收集鹦鹉
      if (record.parrot && record.parrot.name) {
        if (!groupedRecords[key].parrot_names.includes(record.parrot.name)) {
          groupedRecords[key].parrot_names.push(record.parrot.name)
          groupedRecords[key].parrot_ids.push(record.parrot.id)
        }
        const pid = record.parrot.id
        let pavatar = (function(){
          const resolvedPhoto = record.parrot.photo_url ? app.resolveUploadUrl(record.parrot.photo_url) : ''
          const resolvedAvatar = record.parrot.avatar_url ? app.resolveUploadUrl(record.parrot.avatar_url) : ''
          const base = resolvedPhoto || resolvedAvatar
          return base ? app.getThumbnailUrl(base, 128) : ''
        })()
        if (!pavatar && pid) {
          const p = allParrots.find(x => x.id === pid || (record.parrot.name && x.name === record.parrot.name))
          if (p) {
            const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
            const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
            const base = resolvedPhoto || resolvedAvatar
            pavatar = base ? app.getThumbnailUrl(base, 128) : ''
            if (!pavatar) {
              const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
              pavatar = app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
            }
          }
        }
        if (pid && pavatar && !groupedRecords[key].parrot_avatar_map[pid]) {
          groupedRecords[key].parrot_avatar_map[pid] = pavatar
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
    const result = Object.values(groupedRecords).map(item => {
      const parrot_avatars = (item.parrot_ids || []).map(pid => {
        if (item.parrot_avatar_map[pid]) {
          const u = app.resolveUploadUrl(item.parrot_avatar_map[pid])
          return app.getThumbnailUrl(u || item.parrot_avatar_map[pid], 128)
        }
        const p = allParrots.find(x => x.id === pid)
        if (p) {
          const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
          const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
          const url = resolvedPhoto || resolvedAvatar
          if (url) return app.getThumbnailUrl(url, 128)
        }
        return null
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
    this.setData({
      showAddRecordModal: true,
      modalRecordType: this.data.activeTab
    })
  },

  // 顶部返回按钮：优先返回上一页，无历史时回首页
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

  // 添加喂食记录
  addFeedingRecord() {
    this.setData({
      showAddRecordModal: true,
      modalRecordType: 'feeding'
    })
  },

  // 添加健康记录
  addHealthRecord() {
    this.setData({
      showAddRecordModal: true,
      modalRecordType: 'health'
    })
  },

  // 添加清洁记录
  addCleaningRecord() {
    this.setData({
      showAddRecordModal: true,
      modalRecordType: 'cleaning'
    })
  },

  // 添加繁殖记录
  addBreedingRecord() {
    this.setData({
      showAddRecordModal: true,
      modalRecordType: 'breeding'
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
  },

  // 关闭添加记录模态弹窗
  hideAddRecordModal() {
    this.setData({
      showAddRecordModal: false,
      modalRecordType: ''
    });
  },

  // 阻止模态弹窗内容区域的点击事件冒泡
  stopModalPropagation() {
    // 阻止点击模态框内容时关闭模态框
  },

  // 从模态弹窗导航到添加记录页面
  navigateToAddRecord() {
    const type = this.data.modalRecordType;
    this.hideAddRecordModal();
    wx.navigateTo({
      url: `/pages/records/add-record/add-record?type=${type}`
    });
  },

  // 快速添加记录
  async quickAddRecord() {
    const type = this.data.modalRecordType;
    const currentTime = new Date();
    const dateStr = currentTime.toISOString().split('T')[0];
    const timeStr = currentTime.toTimeString().split(' ')[0].substring(0, 5);
    
    try {
      wx.showLoading({
        title: '添加中...',
        mask: true
      });

      // 构建快速记录数据
      const recordData = {
        record_type: type,
        record_date: dateStr,
        record_time: timeStr,
        parrot_ids: this.data.selectedParrotId ? [this.data.selectedParrotId] : [],
        notes: `快速${type === 'feeding' ? '喂食' : type === 'health' ? '健康检查' : type === 'cleaning' ? '清洁' : '繁殖'}记录`
      };

      // 根据记录类型添加默认字段
      if (type === 'feeding') {
        recordData.food_types = [];
        recordData.amount = '';
      } else if (type === 'cleaning') {
        recordData.cleaning_type = '';
        recordData.description = '常规清洁';
      } else if (type === 'health') {
        recordData.weight = '';
        recordData.health_status = 'healthy';
      } else if (type === 'breeding') {
        recordData.breeding_stage = '';
        recordData.egg_count = '';
      }

      const response = await wx.request({
        url: `${getApp().globalData.apiUrl}/api/records`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`,
          'Content-Type': 'application/json'
        },
        data: recordData
      });

      if (response.statusCode === 200 || response.statusCode === 201) {
        wx.hideLoading();
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        this.hideAddRecordModal();
        this.loadRecords(); // 刷新记录列表
      } else {
        throw new Error('添加失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
      console.error('快速添加记录失败:', error);
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
  }
})
