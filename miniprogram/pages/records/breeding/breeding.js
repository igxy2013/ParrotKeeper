// pages/breeding/breeding.js
const app = getApp()
const { parseServerTime } = require('../../../utils/time')

Page({
  data: {
    isLogin: false,
    loading: false,
    
    // 统计数据
    stats: {
      totalPairs: 0,
      successfulHatching: 0
    },
    
    // 筛选状态
    statusOptions: ['全部', '配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成'],
    selectedStatus: '全部',
    
    // 繁殖记录数据
    breedingRecords: [],
    filteredRecords: [],

    // 搜索/日期筛选与虚拟列表窗口
    searchQuery: '',
    startDate: '',
    endDate: '',
    virtualChunkIndex: 0,
    virtualChunkSize: 25,
    virtualDisplayRecords: [],
    
    // 鹦鹉选项
    parrotOptions: [],
    
    // 繁殖状态选项
    breedingStatusOptions: ['配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成']
  },

  onLoad(options) {
    this.checkLoginStatus()
    try {
      const tier = String(app.getEffectiveTier() || '').toLowerCase()
      const isPro = tier === 'pro' || tier === 'team'
      if (!isPro) {
        wx.showModal({
          title: '高级功能限制',
          content: '繁殖记录为高级会员功能，请升级会员后使用。',
          confirmText: '去会员中心',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/member-center/member-center' })
            } else {
              wx.navigateBack({ delta: 1 })
            }
          }
        })
      }
    } catch(_) {}
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLogin) {
      this.loadParrotOptions()
      this.loadBreedingRecords()
    }
  },

  onPullDownRefresh() {
    if (this.data.isLogin) {
      this.loadBreedingRecords()
    }
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    // 可以在这里实现分页加载
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.globalData.isLogin
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ isLogin, hasOperationPermission })
    
    if (!isLogin) {
      this.setData({
        breedingRecords: [],
        filteredRecords: [],
        stats: {
          totalPairs: 0,
          successfulHatching: 0
        }
      })
    }
  },

  // 加载鹦鹉选项
  async loadParrotOptions() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      if (res && res.success) {
        const parrots = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.parrots))
            ? res.data.parrots
            : (res.data && Array.isArray(res.data.items))
              ? res.data.items
              : []
        this.setData({ parrotOptions: parrots })
      }
    } catch (err) {
      console.error('加载鹦鹉列表失败:', err)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载繁殖记录
  async loadBreedingRecords() {
    this.setData({ loading: true })
    try {
      const res = await app.request({
        url: '/api/records/breeding',
        method: 'GET'
      })
      if (res && res.success) {
        const items = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.items))
            ? res.data.items
            : []
        const records = this.processBreedingRecords(items)
        this.setData({
          breedingRecords: records,
          loading: false
        })
        this.filterRecords()
        this.updateStats()
      } else {
        app.showError((res && res.message) || '加载繁殖记录失败')
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载繁殖记录失败:', err)
      app.showError('网络错误，请稍后重试')
      this.setData({ loading: false })
    }
  },

  // 处理繁殖记录数据
  processBreedingRecords(records) {
    return records.map(record => {
      // 构建鹦鹉配对名称
      const maleParrotName = record.male_parrot ? record.male_parrot.name : '未知'
      const femaleParrotName = record.female_parrot ? record.female_parrot.name : '未知'
      const parrotPair = `${maleParrotName} × ${femaleParrotName}`
      
      // 计算孵化率
      let hatchingRate = '-'
      if (record.egg_count > 0) {
        hatchingRate = `${record.chick_count || 0}/${record.egg_count}`
      }
      
      // 根据日期和数据推断状态
      let status = '配对中'
      let statusClass = 'status-pairing'
      
      if (record.hatching_date && record.chick_count > 0) {
        status = '育雏中'
        statusClass = 'status-brooding'
      } else if (record.hatching_date) {
        status = '孵化中'
        statusClass = 'status-hatching'
      } else if (record.egg_laying_date && record.egg_count > 0) {
        status = '产蛋中'
        statusClass = 'status-laying'
      } else if (record.mating_date) {
        status = '筑巢中'
        statusClass = 'status-nesting'
      }
      
      // 记录时间：优先后端 record_time（最后添加/编辑时间），其次 created_at，再回退节点日期
      const rawTime = record.record_time || record.created_at || record.mating_date || record.egg_laying_date || record.hatching_date || ''
      const parsedTime = parseServerTime(rawTime)
      const recordTime = parsedTime
        ? app.formatDateTime(parsedTime, 'YYYY-MM-DD HH:mm')
        : this.normalizeDisplayTime(rawTime)

      return {
        id: record.id,
        parrotPair,
        maleParrot: maleParrotName,
        femaleParrot: femaleParrotName,
        nestingDate: record.mating_date || '',
        layingDate: record.egg_laying_date || '',
        hatchingDate: record.hatching_date || '',
        eggCount: record.egg_count || 0,
        hatchedCount: record.chick_count || 0,
        hatchingRate,
        status,
        statusClass,
        notes: record.notes || '',
        createdAt: this.formatDate(record.created_at),
        recordTime,
        rawData: record
      }
    })
  },

  // 更新统计数据
  updateStats() {
    const records = this.data.breedingRecords
    const totalPairs = records.length
    const successfulHatching = records.filter(record => record.hatchedCount > 0).length
    
    this.setData({
      stats: {
        totalPairs,
        successfulHatching
      }
    })
  },

  // 筛选记录
  filterRecords() {
    const { breedingRecords, selectedStatus, searchQuery, startDate, endDate, virtualChunkSize } = this.data
    let filtered = breedingRecords

    // 1) 状态筛选
    if (selectedStatus !== '全部') {
      filtered = filtered.filter(record => record.status === selectedStatus)
    }

    // 2) 关键字搜索（配对名称/两只名字/状态/备注）
    const q = String(searchQuery || '').trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(r => {
        const pair = String(r.parrotPair || '').toLowerCase()
        const male = String(r.maleParrot || '').toLowerCase()
        const female = String(r.femaleParrot || '').toLowerCase()
        const status = String(r.status || '').toLowerCase()
        const notes = String(r.notes || '').toLowerCase()
        return (
          pair.includes(q) || male.includes(q) || female.includes(q) || status.includes(q) || notes.includes(q)
        )
      })
    }

    // 3) 日期范围（基于 record.rawData 的记录时间/节点时间）
    const hasStart = !!startDate
    const hasEnd = !!endDate
    if (hasStart || hasEnd) {
      const startTs = hasStart ? parseServerTime(startDate)?.getTime() || 0 : null
      const endBase = hasEnd ? (parseServerTime(endDate)?.getTime() || 0) : null
      const endTs = endBase != null ? (endBase + 24 * 60 * 60 * 1000 - 1) : null

      filtered = filtered.filter(r => {
        const ts = this.getBreedingRecordTs(r)
        if (startTs != null && ts < startTs) return false
        if (endTs != null && ts > endTs) return false
        return true
      })
    }

    filtered = filtered.slice().sort((a, b) => this.getBreedingRecordTs(b) - this.getBreedingRecordTs(a))
    this.setData({ filteredRecords: filtered })
    this.setData({ virtualChunkIndex: 0, virtualDisplayRecords: filtered.slice(0, virtualChunkSize) })
  },

  // 选择状态筛选
  selectStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ selectedStatus: status })
    this.filterRecords()
  },

  // 显示添加表单
  async showAddForm() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }

    const mode = app.globalData.userMode || wx.getStorageSync('userMode') || 'personal'
    if (mode === 'team') {
      const hasOp = !!(app && typeof app.hasOperationPermission === 'function' && app.hasOperationPermission())
      if (!hasOp) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); return }
      try {
        const cur = await app.request({ url: '/api/teams/current', method: 'GET' })
        const teamId = cur && cur.success && cur.data && cur.data.id
        const userId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
        if (teamId && userId) {
          const membersRes = await app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
          if (membersRes && membersRes.success && Array.isArray(membersRes.data)) {
            const me = membersRes.data.find(m => String(m.user_id || m.id) === String(userId))
            const groupId = me && (typeof me.group_id !== 'undefined' ? me.group_id : null)
            if (!groupId) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); return }
          }
        }
      } catch (_) { wx.showToast({ title: '权限校验失败，请稍后重试', icon: 'none', duration: 3000 }) ; return }
    }

    wx.navigateTo({ url: '/pages/records/add-record/add-record?type=breeding' })
  },

  // 查看记录详情（跳转统一详情页）
  viewRecordDetail(e) {
    const ds = e.currentTarget?.dataset || {}
    const id = ds.id || (ds.record && ds.record.id) || ''
    const ids = ds.ids || ''
    const derivedId = id || (ids ? String(ids).split(',').filter(Boolean)[0] : '')
    const query = ['type=breeding']
    if (derivedId) query.push(`id=${derivedId}`)
    if (ids) query.push(`record_ids=${ids}`)
    wx.navigateTo({ url: `/pages/records/detail/detail?${query.join('&')}` })
  },

  // 搜索输入
  onSearchInput(e) {
    const v = String((e && e.detail && e.detail.value) || '').trim()
    this.setData({ searchQuery: v })
    this.filterRecords()
  },

  // 日期选择与清空
  onStartDateChange(e) {
    const v = (e && e.detail && e.detail.value) || ''
    this.setData({ startDate: v })
    this.filterRecords()
  },
  onEndDateChange(e) {
    const v = (e && e.detail && e.detail.value) || ''
    this.setData({ endDate: v })
    this.filterRecords()
  },
  clearDateFilter() {
    this.setData({ startDate: '', endDate: '' })
    this.filterRecords()
  },

  // 虚拟列表窗口控制
  resetVirtualWindow() {
    const size = this.data.virtualChunkSize
    const list = this.data.filteredRecords || []
    this.setData({ virtualChunkIndex: 0, virtualDisplayRecords: list.slice(0, size) })
  },
  onListScrollLower() {
    const { virtualChunkIndex, virtualChunkSize } = this.data
    const list = this.data.filteredRecords || []
    const nextIndex = virtualChunkIndex + 1
    const start = nextIndex * virtualChunkSize
    if (start >= list.length) return
    const nextChunk = list.slice(start, start + virtualChunkSize)
    this.setData({
      virtualChunkIndex: nextIndex,
      virtualDisplayRecords: (this.data.virtualDisplayRecords || []).concat(nextChunk)
    })
  },

  // 取得记录的参考时间戳（优先 record_time，其次 created_at/节点日期，最后回退显示时间）
  getBreedingRecordTs(rec) {
    const raw = rec && rec.rawData || {}
    const cand = raw.record_time || raw.created_at || raw.mating_date || raw.egg_laying_date || raw.hatching_date || rec.recordTime || ''
    const d = parseServerTime(cand)
    return d ? d.getTime() : 0
  },

  // 编辑记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const url = `/pages/records/add-record/add-record?mode=edit&type=breeding&id=${encodeURIComponent(id)}`;
    wx.navigateTo({ url });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条繁殖记录吗？删除后无法恢复。',
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
        url: `/api/records/breeding/${id}`,
        method: 'DELETE'
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadBreedingRecords();
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

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const d = parseServerTime(dateString)
    if (d) {
      return app.formatDateTime(d, 'YYYY-MM-DD')
    }
    // 兜底：按字符串规则归一化
    const s = String(dateString).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    if (s.includes('T')) {
      const x = s.split('T')[0]
      return x
    }
    if (s.includes(' ')) {
      return s.split(' ')[0]
    }
    return s
  },

  // 归一化显示时间为 YYYY-MM-DD HH:mm（字符串兜底）
  normalizeDisplayTime(input) {
    if (!input) return ''
    let s = String(input).trim()
    if (s.includes('T')) {
      let x = s.replace('T', ' ')
      x = x.replace('Z', '')
      x = x.replace(/([+\-]\d{2}:?\d{2})$/, '')
      if (x.includes('.')) x = x.split('.')[0]
      return x.substring(0, 16)
    }
    if (s.includes(' ')) {
      const parts = s.split(' ')
      const d0 = parts[0]
      let t0 = (parts[1] || '00:00')
      if (t0.length > 5) t0 = t0.substring(0, 5)
      return `${d0} ${t0}`
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00`
    return s
  }
})
