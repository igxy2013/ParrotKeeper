const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    speciesList: [],
    showModal: false,
    modalTitle: '新增品种',
    editingId: null,
    form: { name: '', description: '', avg_lifespan: '', avg_size: '', care_level: 'medium' },
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
        this.setData({ speciesList: res.data || [] })
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
      form: { name: '', description: '', avg_lifespan: '', avg_size: '', care_level: 'medium' },
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
        avg_lifespan: item.avg_lifespan || '',
        avg_size: item.avg_size || '',
        care_level: item.care_level || 'medium'
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
      avg_lifespan: f.avg_lifespan ? Number(f.avg_lifespan) : null,
      avg_size: (f.avg_size || '').trim(),
      care_level: f.care_level || 'medium'
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
