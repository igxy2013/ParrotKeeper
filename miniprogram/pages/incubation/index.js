const app = getApp()

Page({
  data: {
    loading: false,
    eggs: [],
    showAddEgg: false,
    form: { label: '', laid_date: '', incubator_start_date: '', species_id: '' },
    editMode: false,
    currentEggId: null,
    hasOperationPermission: false,
    speciesList: [],
    speciesNames: [],
    selectedSpeciesIndex: -1
  },

  onShow() {
    try {
      const hasOperationPermission = app.hasOperationPermission && app.hasOperationPermission()
      this.setData({ hasOperationPermission: !!hasOperationPermission })
    } catch(_) {}
    this.fetchEggs()
  },

  async fetchEggs() {
    try {
      this.setData({ loading: true })
      const resp = await app.request({ url: '/api/incubation/eggs', method: 'GET' })
      const items = (resp && resp.data && resp.data.items) || []
      const mapped = items.map(it => {
        const ds = (typeof it.day_since_start === 'number' ? it.day_since_start : this.computeDaySinceStart(it && it.incubator_start_date))
        const dsText = (ds === null || ds === undefined || isNaN(ds)) ? '--' : String(ds)
        const speciesName = (it && it.species && it.species.name) ? it.species.name : (it && it.species_name) || ''
        const hatchText = this.formatDate(it && it.hatch_date)
        return {
          ...it,
          status_text: hatchText ? '已出雏' : this.mapStatusToCN(it && it.status),
          day_since_start: ds,
          day_since_start_text: dsText,
          incubator_start_date_text: this.formatDate(it && it.incubator_start_date),
          species_name: speciesName,
          hatch_date_text: hatchText
        }
      })
      this.setData({ eggs: mapped })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  openAddEggModal() {
    if (!this.data.speciesList || this.data.speciesList.length === 0) {
      this.loadSpeciesList().finally(() => this.setData({ showAddEgg: true }))
    } else {
      this.setData({ showAddEgg: true })
    }
  },
  closeAddEggModal() { this.setData({ showAddEgg: false, editMode: false, currentEggId: null }) },
  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const form = Object.assign({}, this.data.form)
    form[field] = val
    this.setData({ form })
  },
  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const form = Object.assign({}, this.data.form)
    form[field] = val
    this.setData({ form })
  },
  async loadSpeciesList(){
    try{
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res && res.success){
        const list = res.data || []
        const names = list.map(s => s.name)
        this.setData({ speciesList: list, speciesNames: names })
        return list
      }
      return []
    }catch(_){ return [] }
  },
  onSpeciesChange(e){
    try{
      const idx = parseInt(e.detail.value)
      if (isNaN(idx)) return
      const list = this.data.speciesList || []
      const item = list[idx]
      const form = Object.assign({}, this.data.form)
      form.species_id = item ? item.id : ''
      this.setData({ selectedSpeciesIndex: idx, form })
    }catch(_){ }
  },
  formatDate(d) { return d ? String(d).slice(0, 10) : '' },

  async submitEgg() {
    try {
      const payload = Object.assign({}, this.data.form)
      let resp
      if (this.data.editMode && this.data.currentEggId) {
        resp = await app.request({ url: `/api/incubation/eggs/${this.data.currentEggId}` , method: 'PUT', data: payload })
      } else {
        resp = await app.request({ url: '/api/incubation/eggs', method: 'POST', data: payload })
      }
      if (resp && resp.success) {
        wx.showToast({ title: this.data.editMode ? '更新成功' : '创建成功', icon: 'success' })
        this.setData({ showAddEgg: false, editMode: false, currentEggId: null, form: { label: '', laid_date: '', incubator_start_date: '', species_id: '' }, selectedSpeciesIndex: -1 })
        this.fetchEggs()
      } else {
        wx.showToast({ title: resp.message || (this.data.editMode ? '更新失败' : '创建失败'), icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: e.message || (this.data.editMode ? '更新失败' : '创建失败'), icon: 'none' })
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/incubation/detail/detail?id=${id}` })
  },
  mapStatusToCN(s){
    const map = { incubating: '孵化中', hatched: '已出雏', failed: '失败', stopped: '已停止' }
    return map[s] || (s || '')
  }
  ,
  computeDaySinceStart(dStr){
    try{
      if(!dStr) return null
      const s = String(dStr)
      let dt
      if(s.includes('T')){
        dt = new Date(s)
      } else {
        dt = new Date(`${s}T00:00:00`)
      }
      if(isNaN(dt.getTime())) return null
      const today = new Date()
      const ms = today.setHours(0,0,0,0) - dt.setHours(0,0,0,0)
      return Math.floor(ms / 86400000)
    }catch(_){ return null }
  }
  ,
  async openEditEgg(e){
    try{
      const id = e.currentTarget.dataset.id
      const item = (this.data.eggs || []).find(x => String(x.id) === String(id))
      if (!item){ wx.showToast({ title: '记录不存在', icon: 'none' }); return }
      if (!this.data.speciesList || !this.data.speciesList.length){ await this.loadSpeciesList() }
      const speciesName = (item && item.species && item.species.name) ? item.species.name : (item && item.species_name) || ''
      const list = this.data.speciesList || []
      let speciesIdx = -1
      if (list && list.length){
        speciesIdx = list.findIndex(s => s.name === speciesName || String(s.id) === String(item && (item.species_id || (item.species && item.species.id))))
      }
      const form = {
        label: (item && item.label) || '',
        laid_date: this.formatDate(item && item.laid_date),
        incubator_start_date: this.formatDate(item && item.incubator_start_date),
        species_id: (item && (item.species_id || (item.species && item.species.id))) || ''
      }
      this.setData({
        showAddEgg: true,
        editMode: true,
        currentEggId: id,
        form,
        selectedSpeciesIndex: speciesIdx
      })
    }catch(_){ wx.showToast({ title: '无法编辑', icon: 'none' }) }
  },
  deleteEgg(e){
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除该蛋及其孵化日志？',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) { this.performDeleteEgg(id) }
      }
    })
  },
  async performDeleteEgg(id){
    try{
      wx.showLoading({ title: '删除中...' })
      const resp = await app.request({ url: `/api/incubation/eggs/${id}`, method: 'DELETE' })
      wx.hideLoading()
      if (resp && resp.success){
        wx.showToast({ title: '删除成功', icon: 'success' })
        this.fetchEggs()
      } else {
        wx.showToast({ title: (resp && resp.message) || '删除失败', icon: 'none' })
      }
    }catch(err){
      wx.hideLoading()
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})
