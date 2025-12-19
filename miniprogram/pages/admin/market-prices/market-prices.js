const app = getApp()
const { SPECIES_CONFIG } = require('../../../utils/species-config')

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    prices: [],
    filteredPrices: [],
    speciesList: [],
    speciesRows: [],
    speciesNames: ['全部'],
    colorNames: [],
    speciesIndex: 0,
    showAddModal: false,
    addForm: { species: '', color_name: '', reference_price: '', source: '', currency: 'CNY' },
    formSpeciesIndex: 0,
    formColorIndex: 0,
    genderOptions: ['不区分', '雄性', '雌性'],
    formGenderIndex: 0,
    editingIndex: null,
    searchColorKeyword: ''
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

  async loadSpecies() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      const list = Array.isArray(res && res.data) ? res.data : []
      const withPlumage = list.filter(s => !!s.plumage_json)
      const names = ['全部'].concat(withPlumage.map(s => s.name))
      this.setData({ speciesRows: withPlumage, speciesNames: names, speciesIndex: 0, formSpeciesIndex: 0 })
      const initialColors = this.getColorsBySpeciesName(this.data.speciesNames[this.data.formSpeciesIndex] || '', withPlumage)
      this.setData({ colorNames: initialColors })
      this.loadPrices()
    } catch (_) {
      const fallbackNames = Object.keys(SPECIES_CONFIG)
      const rows = fallbackNames.map(n => ({ id: 0, name: n, plumage_json: JSON.stringify(SPECIES_CONFIG[n]) }))
      const names = ['全部'].concat(fallbackNames)
      this.setData({ speciesRows: rows, speciesNames: names, speciesIndex: 0, formSpeciesIndex: 0 })
      const initialColors = this.getColorsBySpeciesName(this.data.speciesNames[this.data.formSpeciesIndex] || '', rows)
      this.setData({ colorNames: initialColors })
      this.loadPrices()
    }
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
        const keyword = String(this.data.searchColorKeyword || '').trim()
        const filtered = this.filterPriceList(mapped, keyword)
        this.setData({ prices: mapped, filteredPrices: filtered, loading: false })
      })
      .catch(() => {
        this.setData({ prices: [], loading: false })
      })
  },

  onSpeciesPickerChange(e) {
    const speciesIndex = Number(e.detail.value || 0)
    const species = speciesIndex > 0 ? this.data.speciesNames[speciesIndex] : ''
    const colors = this.getColorsBySpeciesName(species, this.data.speciesRows)
    this.setData({ speciesIndex, colorNames: colors }, () => this.loadPrices())
  },

  openAddModal() {
    // 弹窗中不应包含“全部”选项，重新构建物种列表
    const fullNames = this.data.speciesNames || []
    // 过滤掉 '全部'，假设它总是第一个或就在列表中
    const formSpeciesNames = fullNames.filter(n => n !== '全部')
    
    const defaultName = '和尚鹦鹉'
    let fi = formSpeciesNames.indexOf(defaultName)
    if (fi < 0 && formSpeciesNames.length > 0) fi = 0
    
    const species = formSpeciesNames[fi] || ''
    const colors = this.getColorsBySpeciesName(species, this.data.speciesRows)
    const defaultColor = colors && colors.length ? colors[0] : ''
    
    this.setData({
      showAddModal: true,
      editingIndex: null,
      addForm: { species, color_name: defaultColor, reference_price: '', source: '', currency: 'CNY', gender: '' },
      formSpeciesNames: formSpeciesNames, // 新增：用于弹窗的物种列表
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
    const names = this.data.formSpeciesNames // 使用弹窗专用的物种列表
    const species = names[formSpeciesIndex] || ''
    
    const addForm = { ...this.data.addForm, species }
    const colors = this.getColorsBySpeciesName(species, this.data.speciesRows)
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

  filterPriceList(list, keyword) {
    const kw = String(keyword || '').trim().toLowerCase()
    if (!kw) return list || []
    const src = list || []
    return src.filter(p => String(p.color_name || '').toLowerCase().indexOf(kw) !== -1)
  },

  onSearchColorInput(e) {
    const value = e.detail && e.detail.value ? e.detail.value : ''
    const filtered = this.filterPriceList(this.data.prices, value)
    this.setData({ searchColorKeyword: value, filteredPrices: filtered })
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
      const list = this.data.prices || []
      const genderKey = String(payload.gender || '')
      const exists = list.some(item =>
        String(item.species || '') === String(payload.species || '') &&
        String(item.color_name || '') === String(payload.color_name || '') &&
        String(item.gender || '') === genderKey
      )
      if (exists) {
        wx.showToast({ title: '已存在相同参考价', icon: 'none' })
        return
      }
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
    const id = e.currentTarget.dataset.id
    const list = this.data.prices || []
    const idx = list.findIndex(p => String(p.id) === String(id))
    if (idx < 0) {
      wx.showToast({ title: '未找到记录', icon: 'none' })
      return
    }
    const item = list[idx]
    const names = this.data.speciesNames
    const fi = Math.max(0, names.indexOf(item.species))
    const colors = this.getColorsBySpeciesName(item.species, this.data.speciesRows)
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
    const id = e.currentTarget.dataset.id
    const list = this.data.prices || []
    const idx = list.findIndex(p => String(p.id) === String(id))
    if (idx < 0) {
      wx.showToast({ title: '未找到记录', icon: 'none' })
      return
    }
    const item = list[idx]
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
  },

  getColorsBySpeciesName(name, rows) {
    try {
      const r = (rows || []).find(x => x.name === name)
      if (r && r.plumage_json) {
        const cfg = JSON.parse(r.plumage_json)
        return (cfg.colors || []).map(c => c.name)
      }
    } catch (_){ }
    const fallback = SPECIES_CONFIG[name]
    return fallback ? fallback.colors.map(c => c.name) : []
  }
})
