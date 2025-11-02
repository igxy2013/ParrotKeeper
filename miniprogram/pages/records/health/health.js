// pages/health/health.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    hasOperationPermission: false,

    // 筛选数据
    parrotsList: [],
    selectedParrotId: '',
    selectedParrotName: '全部',

    // 记录数据
    healthRecords: [],
    displayRecords: [],
    loading: false,

    // 概览统计
    overview: {
      healthyCount: 0,
      attentionCount: 0,
      checkCount: 0
    },

    // 概览筛选：'' | 'healthy' | 'attention'
    activeOverviewFilter: ''
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  onPullDownRefresh() {
    this.loadHealthRecords(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 供返回后主动刷新调用
  refreshData() {
    this.loadHealthRecords(true)
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.globalData.isLogin
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ isLogin, hasOperationPermission })
    
    if (isLogin) {
      this.loadParrotsList()
      this.loadHealthRecords()
    }
  },

  // 加载鹦鹉列表
  async loadParrotsList() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET'
      })
      if (res.success) {
        const list = Array.isArray(res.data?.parrots)
          ? res.data.parrots
          : (Array.isArray(res.data) ? res.data : [])
        this.setData({ parrotsList: list })
        // 依赖鹦鹉列表来补全头像，列表就绪后再刷新健康记录以补齐头像
        if (this.data.isLogin) {
          await this.loadHealthRecords(true)
        }
      }
    } catch (e) {
      console.error('加载鹦鹉列表失败:', e)
    }
  },

  // 加载健康记录
  async loadHealthRecords(refresh = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const params = {
        page: 1,
        per_page: 50
      }
      if (this.data.selectedParrotId) {
        params.parrot_id = this.data.selectedParrotId
      }

      const res = await app.request({
        url: '/api/records/health',
        method: 'GET',
        data: params
      })

      if (res.success) {
        const items = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : [])
        const list = Array.isArray(this.data.parrotsList) ? this.data.parrotsList : []
        const mappedBase = items.map(r => {
          const pid = r.parrot_id || (r.parrot && r.parrot.id)
          // 优先通过ID从鹦鹉列表获取名称，避免名称错配
          const byId = pid ? list.find(x => x.id === pid) : null
          const name = byId ? byId.name : (r.parrot_name || (r.parrot && r.parrot.name) || '')
          return {
            id: r.id,
            parrot_id: pid,
            parrot_name: name,
            parrot: r.parrot,
            record_date_formatted: app.formatDate(r.record_date),
            weight: r.weight,
            notes: r.notes,
            symptoms: r.symptoms,
            treatment: r.treatment,
            health_status: r.health_status,
            health_status_text: r.health_status_text,
            record_date_raw: r.record_date
          }
        })
        // 生成头像字段：优先使用记录内头像，其次严格按ID从 parrotsList 匹配
        const mapped = mappedBase.map(r => {
          const recordPhoto = (r.parrot && r.parrot.photo_url) ? app.resolveUploadUrl(r.parrot.photo_url) : ''
          const recordAvatar = (r.parrot && r.parrot.avatar_url) ? app.resolveUploadUrl(r.parrot.avatar_url) : ''
          let avatar = recordPhoto || recordAvatar || ''

          if (!avatar) {
            const p = r.parrot_id ? list.find(x => x.id === r.parrot_id) : null
            if (p) {
              const resolvedPhoto = p.photo_url ? app.resolveUploadUrl(p.photo_url) : ''
              const resolvedAvatar = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : ''
              const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
              avatar = resolvedPhoto || resolvedAvatar || app.getDefaultAvatarForParrot({ gender: p.gender, species_name: speciesName, name: p.name })
            }
          }

          if (!avatar) {
            avatar = '/images/parrot-avatar-green.svg'
          }

          return {
            ...r,
            parrot_avatar: avatar,
            parrot_avatars: avatar ? [avatar] : []
          }
        })
        this.setData({ healthRecords: mapped })
        // 更新概览与展示列表
        this.computeOverview(mapped)
        this.updateDisplayRecords()
      }
    } catch (e) {
      console.error('加载健康记录失败:', e)
      app.showError('加载健康记录失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算每只鹦鹉的最新健康状态映射
  computeLatestStatusMap(records) {
    const latestByParrot = {}
    const getKey = (r) => {
      if (r.parrot_id !== undefined && r.parrot_id !== null && r.parrot_id !== '') {
        return `id:${String(r.parrot_id)}`
      }
      const name = r.parrot_name || (r.parrot && r.parrot.name) || ''
      if (name) {
        return `name:${String(name).trim().toLowerCase()}`
      }
      return `u:${String(r.id)}`
    }

    records.forEach(record => {
      const key = getKey(record)
      const ts = record.record_date_raw ? new Date(record.record_date_raw).getTime() : 0
      const prev = latestByParrot[key]
      if (!prev || ts >= prev.ts) {
        latestByParrot[key] = { status: record.health_status, ts }
      }
    })
    return latestByParrot
  },

  // 计算概览统计
  computeOverview(records) {
    let healthyCount = 0
    let attentionCount = 0
    const checkCount = records.length

    const latestByParrot = this.computeLatestStatusMap(records)

    Object.values(latestByParrot).forEach(({ status }) => {
      if (status === 'healthy') {
        healthyCount++
      } else if (status === 'sick' || status === 'observation' || status === 'recovering') {
        attentionCount++
      }
    })

    this.setData({
      overview: {
        healthyCount,
        attentionCount,
        checkCount
      }
    })
  },

  // 概览点击筛选
  onOverviewTap(e) {
    const { filter } = e.currentTarget.dataset
    const current = this.data.activeOverviewFilter
    // 点击相同筛选则取消筛选
    const nextFilter = current === filter ? '' : filter
    this.setData({ activeOverviewFilter: nextFilter })
    this.updateDisplayRecords()
  },

  // 清除概览筛选
  clearOverviewFilter() {
    if (!this.data.activeOverviewFilter) return
    this.setData({ activeOverviewFilter: '' })
    this.updateDisplayRecords()
  },

  // 根据 activeOverviewFilter 更新展示列表
  updateDisplayRecords() {
    const { healthRecords, activeOverviewFilter } = this.data
    if (!activeOverviewFilter) {
      this.setData({ displayRecords: healthRecords })
      return
    }

    const latestMap = this.computeLatestStatusMap(healthRecords)
    // 收集满足筛选的鹦鹉键集合
    const allowedKeys = new Set(Object.keys(latestMap).filter(k => {
      const status = latestMap[k].status
      if (activeOverviewFilter === 'healthy') return status === 'healthy'
      if (activeOverviewFilter === 'attention') return status === 'sick' || status === 'observation' || status === 'recovering'
      return true
    }))

    const getKey = (r) => {
      if (r.parrot_id !== undefined && r.parrot_id !== null && r.parrot_id !== '') {
        return `id:${String(r.parrot_id)}`
      }
      const name = r.parrot_name || (r.parrot && r.parrot.name) || ''
      if (name) {
        return `name:${String(name).trim().toLowerCase()}`
      }
      return `u:${String(r.id)}`
    }

    const filtered = healthRecords.filter(r => allowedKeys.has(getKey(r)))

    this.setData({ displayRecords: filtered })
  },

  // 切换鹦鹉筛选
  switchParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      selectedParrotId: id,
      selectedParrotName: name
    })
    // 切换鹦鹉时清空概览筛选以避免误导
    this.setData({ activeOverviewFilter: '' })
    this.loadHealthRecords()
  },

  // 添加健康记录
  addHealthRecord() {
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=health'
    })
  },

  // 编辑记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const url = `/pages/records/add-record/add-record?mode=edit&type=health&id=${encodeURIComponent(id)}`;
    wx.navigateTo({ url });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条健康记录吗？删除后无法恢复。',
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
        url: `/api/records/health/${id}`,
        method: 'DELETE'
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadHealthRecords();
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
  }
})
