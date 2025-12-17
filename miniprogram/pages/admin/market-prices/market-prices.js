const app = getApp()
const { SPECIES_LIST, getColorsBySpeciesName } = require('../../../utils/species-config')

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    prices: [],
    speciesList: [],
    speciesNames: ['全部'],
    colorNames: [],
    speciesIndex: 0,
    showAddModal: false,
    addForm: { species: '', color_name: '', reference_price: '', source: '', currency: 'CNY' },
    formSpeciesIndex: 0,
    formColorIndex: 0,
    genderOptions: ['不区分', '雄性', '雌性'],
    formGenderIndex: 0,
    editingIndex: null
  },

  onShow() {
    this.init()
  },

  init() {
    const userInfo = (app.globalData && app.globalData.userInfo) || {}
    const isSuperAdmin = String(userInfo.role || '') === 'super_admin'
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadSpecies()
  },

  loadSpecies() {
    const names = ['全部'].concat(SPECIES_LIST)
    this.setData({ speciesList: [], speciesNames: names, speciesIndex: 0, formSpeciesIndex: 0 }, () => {
      const initialColors = getColorsBySpeciesName(this.data.speciesNames[this.data.formSpeciesIndex] || '')
      this.setData({ colorNames: initialColors })
      this.loadPrices()
    })
  },

  loadPrices() {
    const idx = Number(this.data.speciesIndex || 0)
    const species = idx > 0 ? this.data.speciesNames[idx] : ''
    this.setData({ loading: true })
    app.request({ url: '/api/market/prices', method: 'GET', data: { species } })
      .then(res => {
        const prices = (res && res.data && res.data.prices) || []
        const mapped = prices.map(p => ({
          ...p,
          gender_text: p.gender === 'male' ? '雄性' : (p.gender === 'female' ? '雌性' : '不区分')
        }))
        this.setData({ prices: mapped, loading: false })
      })
      .catch(() => {
        this.setData({ prices: [], loading: false })
      })
  },

  onSpeciesPickerChange(e) {
    const speciesIndex = Number(e.detail.value || 0)
    const species = speciesIndex > 0 ? this.data.speciesNames[speciesIndex] : ''
    const colors = getColorsBySpeciesName(species)
    this.setData({ speciesIndex, colorNames: colors }, () => this.loadPrices())
  },

  openAddModal() {
    const names = this.data.speciesNames || []
    const defaultName = '和尚鹦鹉'
    const fi = Math.max(0, names.indexOf(defaultName))
    const species = fi > 0 ? names[fi] : ''
    const colors = getColorsBySpeciesName(species)
    const defaultColor = colors && colors.length ? colors[0] : ''
    this.setData({
      showAddModal: true,
      editingIndex: null,
      addForm: { species, color_name: defaultColor, reference_price: '', source: '', currency: 'CNY', gender: '' },
      formSpeciesIndex: fi,
      colorNames: colors,
      formColorIndex: 0,
      formGenderIndex: 0
    })
  },
  closeAddModal() { this.setData({ showAddModal: false }) },
  noop() {},

  onFormSpeciesChange(e) {
    const formSpeciesIndex = Number(e.detail.value || 0)
    const names = this.data.speciesNames
    const species = formSpeciesIndex > 0 ? names[formSpeciesIndex] : ''
    const addForm = { ...this.data.addForm, species }
    const colors = getColorsBySpeciesName(species)
    const defaultColor = colors && colors.length ? colors[0] : ''
    this.setData({ formSpeciesIndex, addForm: { ...addForm, color_name: defaultColor }, colorNames: colors, formColorIndex: 0 })
  },

  onFormColorChange(e) {
    const formColorIndex = Number(e.detail.value || 0)
    const colorNames = this.data.colorNames || []
    const color = colorNames[formColorIndex] || ''
    const addForm = { ...this.data.addForm, color_name: color }
    this.setData({ formColorIndex, addForm })
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const addForm = { ...this.data.addForm, [key]: value }
    this.setData({ addForm })
  },

  onFormGenderChange(e) {
    const formGenderIndex = Number(e.detail.value || 0)
    const genderOptions = this.data.genderOptions
    const val = genderOptions[formGenderIndex]
    const gender = val === '雄性' ? 'male' : (val === '雌性' ? 'female' : '')
    const addForm = { ...this.data.addForm, gender }
    this.setData({ formGenderIndex, addForm })
  },

  submitForm() {
    const idx = this.data.editingIndex
    const form = this.data.addForm
    const color_name = String(form.color_name || (this.data.colorNames || [])[this.data.formColorIndex] || '').trim()
    const payload = {
      species: form.species || (this.data.formSpeciesIndex > 0 ? this.data.speciesNames[this.data.formSpeciesIndex] : ''),
      color_name,
      reference_price: Number(form.reference_price || 0),
      currency: 'CNY',
      source: String(form.source || '').trim()
    }
    if (form.gender) payload.gender = form.gender
    if (!payload.species || !payload.color_name || !payload.reference_price) {
      wx.showToast({ title: '请完整填写', icon: 'none' })
      return
    }
    if (idx === null) {
      app.request({ url: '/api/market/prices', method: 'POST', data: payload })
        .then(res => {
          wx.showToast({ title: '创建成功' })
          this.closeAddModal()
          this.loadPrices()
        })
        .catch(() => wx.showToast({ title: '创建失败', icon: 'none' }))
    } else {
      const item = this.data.prices[idx]
      app.request({ url: `/api/market/prices/${item.id}`, method: 'PUT', data: payload })
        .then(res => {
          wx.showToast({ title: '更新成功' })
          this.closeAddModal()
          this.loadPrices()
        })
        .catch(() => wx.showToast({ title: '更新失败', icon: 'none' }))
    }
  },

  openEditModal(e) {
    const idx = Number(e.currentTarget.dataset.index || 0)
    const item = this.data.prices[idx]
    const names = this.data.speciesNames
    const fi = Math.max(0, names.indexOf(item.species))
    const colors = getColorsBySpeciesName(item.species)
    const ci = Math.max(0, colors.indexOf(item.color_name))
    const genderOptions = this.data.genderOptions
    const gi = item.gender === 'male' ? 1 : (item.gender === 'female' ? 2 : 0)
    this.setData({
      showAddModal: true,
      editingIndex: idx,
      addForm: { species: item.species, color_name: item.color_name, reference_price: String(item.reference_price || ''), source: item.source || '', currency: item.currency || 'CNY', gender: item.gender || '' },
      formSpeciesIndex: fi,
      colorNames: colors,
      formColorIndex: ci,
      formGenderIndex: gi
    })
  },

  deleteItem(e) {
    const idx = Number(e.currentTarget.dataset.index || 0)
    const item = this.data.prices[idx]
    wx.showModal({
      title: '确认删除',
      content: `删除 ${item.species} - ${item.color_name} 的参考价？`,
      success: (r) => {
        if (r.confirm) {
          app.request({ url: `/api/market/prices/${item.id}`, method: 'DELETE' })
            .then(() => { wx.showToast({ title: '已删除' }); this.loadPrices() })
            .catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
        }
      }
    })
  }
})
