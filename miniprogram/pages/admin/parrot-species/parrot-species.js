const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    speciesList: [],
    showModal: false,
    modalTitle: '新增品种',
    editingId: null,
    form: { name: '', description: '', avg_lifespan_min: '', avg_lifespan_max: '', avg_size_min_cm: '', avg_size_max_cm: '', care_level: 'medium', reference_weight_g: '', reference_weight_min_g: '', reference_weight_max_g: '' },
    careLevels: ['容易', '一般', '困难'],
    careLevelIndex: 1
  },

  onShow() { this.initAccessAndLoad() },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) { this.setData({ loading: false }); return }
    this.loadSpecies()
  },

  async loadSpecies() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res && res.success) {
        const list = (res.data || []).map(it => {
          let summary = '未配置'
          try {
            const j = it.plumage_json ? JSON.parse(it.plumage_json) : null
            if (j && Array.isArray(j.colors)) {
              const names = j.colors.map(c => c.name).filter(Boolean)
              summary = names.length ? names.join('、') : '已配置'
            }
          } catch (_) {}
          const lsMin = it.avg_lifespan_min != null ? String(it.avg_lifespan_min) : '?'
          const lsMax = it.avg_lifespan_max != null ? String(it.avg_lifespan_max) : '?'
          const szMin = it.avg_size_min_cm != null ? String(it.avg_size_min_cm) : '?'
          const szMax = it.avg_size_max_cm != null ? String(it.avg_size_max_cm) : '?'
          const wMin = it.reference_weight_min_g != null ? String(it.reference_weight_min_g) : null
          const wMax = it.reference_weight_max_g != null ? String(it.reference_weight_max_g) : null
          const wAvg = it.reference_weight_g != null ? String(it.reference_weight_g) : null
          const weightRange = (wMin && wMax) ? `${wMin}-${wMax} g` : (wAvg ? `${wAvg} g` : '未配置')
          return {
            ...it,
            plumage_summary: summary,
            lifespan_range: `${lsMin}-${lsMax} 年`,
            size_range: `${szMin}-${szMax} cm`,
            weight_range: weightRange
          }
        })
        this.setData({ speciesList: list })
      } else {
        wx.showToast({ title: (res && res.message) || '获取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  openCreateModal() {
    this.setData({
      showModal: true,
      modalTitle: '新增品种',
      editingId: null,
      form: { name: '', description: '', avg_lifespan_min: '', avg_lifespan_max: '', avg_size_min_cm: '', avg_size_max_cm: '', care_level: 'medium', reference_weight_g: '', reference_weight_min_g: '', reference_weight_max_g: '' },
      careLevelIndex: 1
    })
  },

  openEditModal(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.speciesList || []).find(s => String(s.id) === String(id))
    if (!item) return
    const careMap = { 'easy': 0, 'medium': 1, 'hard': 2 }
    this.setData({
      showModal: true,
      modalTitle: '编辑品种',
      editingId: id,
      form: {
        name: item.name || '',
        description: item.description || '',
        avg_lifespan_min: item.avg_lifespan_min != null ? String(item.avg_lifespan_min) : '',
        avg_lifespan_max: item.avg_lifespan_max != null ? String(item.avg_lifespan_max) : '',
        avg_size_min_cm: item.avg_size_min_cm != null ? String(item.avg_size_min_cm) : '',
        avg_size_max_cm: item.avg_size_max_cm != null ? String(item.avg_size_max_cm) : '',
        care_level: item.care_level || 'medium',
        reference_weight_g: (item.reference_weight_g != null ? String(item.reference_weight_g) : ''),
        reference_weight_min_g: item.reference_weight_min_g != null ? String(item.reference_weight_min_g) : '',
        reference_weight_max_g: item.reference_weight_max_g != null ? String(item.reference_weight_max_g) : ''
      },
      careLevelIndex: careMap[item.care_level || 'medium']
    })
  },

  closeModal() { this.setData({ showModal: false }) },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const form = { ...this.data.form }
    form[field] = value
    this.setData({ form })
  },

  onCareLevelChange(e) {
    const idx = Number(e.detail.value || 1)
    const level = idx === 0 ? 'easy' : (idx === 2 ? 'hard' : 'medium')
    const form = { ...this.data.form, care_level: level }
    this.setData({ careLevelIndex: idx, form })
  },

  async submitForm() {
    const f = this.data.form || {}
    if (!f.name || !f.name.trim()) { wx.showToast({ title: '请填写品种名称', icon: 'none' }); return }
    const payload = {
      name: f.name.trim(),
      description: (f.description || '').trim(),
      avg_lifespan_min: f.avg_lifespan_min ? Number(f.avg_lifespan_min) : null,
      avg_lifespan_max: f.avg_lifespan_max ? Number(f.avg_lifespan_max) : null,
      avg_size_min_cm: f.avg_size_min_cm ? Number(f.avg_size_min_cm) : null,
      avg_size_max_cm: f.avg_size_max_cm ? Number(f.avg_size_max_cm) : null,
      care_level: f.care_level || 'medium',
      reference_weight_g: f.reference_weight_g ? Number(f.reference_weight_g) : null,
      reference_weight_min_g: f.reference_weight_min_g ? Number(f.reference_weight_min_g) : null,
      reference_weight_max_g: f.reference_weight_max_g ? Number(f.reference_weight_max_g) : null
    }
    try {
      let res
      if (this.data.editingId) {
        res = await app.request({ url: `/api/parrots/species/${this.data.editingId}`, method: 'PUT', data: payload })
      } else {
        res = await app.request({ url: '/api/parrots/species', method: 'POST', data: payload })
      }
      if (res && res.success) {
        wx.showToast({ title: '已保存', icon: 'none' })
        this.setData({ showModal: false })
        this.loadSpecies()
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  async deleteSpecies(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除确认',
      content: '删除后无法恢复，确定要删除该品种吗？',
      confirmText: '删除',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const resp = await app.request({ url: `/api/parrots/species/${id}`, method: 'DELETE' })
          if (resp && resp.success) {
            wx.showToast({ title: '已删除', icon: 'none' })
            this.loadSpecies()
          } else {
            wx.showToast({ title: (resp && resp.message) || '删除失败', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    })
  },

  noop() {}
})
