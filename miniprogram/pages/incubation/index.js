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
    selectedSpeciesIndex: -1,
    startDate: '',
    startTime: '00:00',
    formTouched: false
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
        const ds = this.computeDaySinceStart(it && it.incubator_start_date)
        const dsText = this.computeDaysHoursText(it && it.incubator_start_date)
        const speciesName = (it && it.species && it.species.name) ? it.species.name : (it && it.species_name) || ''
        const hatchText = this.formatDate(it && it.hatch_date)
        const startDateTimeText = app.formatDateTime(it && it.incubator_start_date, 'YYYY-MM-DD HH:mm')
        return {
          ...it,
          status_text: hatchText ? '已出雏' : this.mapStatusToCN(it && it.status),
          day_since_start: ds,
          day_since_start_text: dsText,
          incubator_start_date_text: this.formatDate(it && it.incubator_start_date),
          incubator_start_datetime_text: startDateTimeText,
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
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth()+1).padStart(2,'0')
    const d = String(today.getDate()).padStart(2,'0')
    const todayStr = `${y}-${m}-${d}`
    const initTime = this.data.startTime || '00:00'
    if (!this.data.speciesList || this.data.speciesList.length === 0) {
      this.loadSpeciesList().finally(() => {
        this.setData({ showAddEgg: true, startDate: todayStr, startTime: initTime, formTouched: false })
        this.updateStartDateTime()
      })
    } else {
      this.setData({ showAddEgg: true, startDate: todayStr, startTime: initTime, formTouched: false })
      this.updateStartDateTime()
    }
  },
  closeAddEggModal() { this.setData({ showAddEgg: false, editMode: false, currentEggId: null, startDate: '', startTime: '00:00', formTouched: false }) },
  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const form = Object.assign({}, this.data.form)
    form[field] = val
    this.setData({ form, formTouched: true })
  },
  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const form = Object.assign({}, this.data.form)
    form[field] = val
    this.setData({ form, formTouched: true })
  },
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value, formTouched: true })
    this.updateStartDateTime()
  },
  onStartTimeChange(e) {
    const v = e.detail.value
    if (!this.data.startDate){
      const t = new Date()
      const y = t.getFullYear()
      const m = String(t.getMonth()+1).padStart(2,'0')
      const d = String(t.getDate()).padStart(2,'0')
      this.setData({ startDate: `${y}-${m}-${d}` })
    }
    this.setData({ startTime: v, formTouched: true })
    this.updateStartDateTime()
  },
  updateStartDateTime() {
    const d = this.data.startDate
    const t = this.data.startTime || '00:00'
    if (d) {
      const form = Object.assign({}, this.data.form)
      const tt = t.length === 5 ? `${t}:00` : t
      form.incubator_start_date = `${d} ${tt}`
      this.setData({ form })
    }
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
      this.setData({ selectedSpeciesIndex: idx, form, formTouched: true })
    }catch(_){ }
  },
  formatDate(d) { return d ? String(d).slice(0, 10) : '' },

  async submitEgg() {
    try {
      if (!this.data.formTouched) {
        wx.showToast({ title: '请先填写至少一项信息', icon: 'none' })
        return
      }
      const f = this.data.form || {}
      if (!f.species_id) {
        wx.showToast({ title: '请选择鹦鹉品种', icon: 'none' })
        return
      }
      if (!f.laid_date) {
        wx.showToast({ title: '请选择产蛋日期', icon: 'none' })
        return
      }
      const payload = Object.assign({}, this.data.form)
      const sVal = String(payload.incubator_start_date || '').trim()
      if (!sVal) {
        const t = this.data.startTime || '00:00'
        const tt = t.length === 5 ? `${t}:00` : t
        payload.incubator_start_date = `${this.data.startDate} ${tt}`
      } else {
        const m = sVal.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(:\d{2})?)$/)
        const m2 = sVal.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(:\d{2})?)$/)
        if (m) {
          const datePart = m[1]
          let timePart = m[2]
          if (timePart.length === 5) timePart = `${timePart}:00`
          payload.incubator_start_date = `${datePart} ${timePart}`
        } else if (m2) {
          const datePart = m2[1]
          let timePart = m2[2]
          if (timePart.length === 5) timePart = `${timePart}:00`
          payload.incubator_start_date = `${datePart} ${timePart}`
        }
      }
      let resp
      if (this.data.editMode && this.data.currentEggId) {
        resp = await app.request({ url: `/api/incubation/eggs/${this.data.currentEggId}` , method: 'PUT', data: payload })
      } else {
        resp = await app.request({ url: '/api/incubation/eggs', method: 'POST', data: payload })
      }
      if (resp && resp.success) {
        wx.showToast({ title: this.data.editMode ? '更新成功' : '创建成功', icon: 'success' })
        this.setData({ showAddEgg: false, editMode: false, currentEggId: null, form: { label: '', laid_date: '', incubator_start_date: '', species_id: '' }, selectedSpeciesIndex: -1, startDate: '', startTime: '00:00', formTouched: false })
        if (this.data.editMode) {
          const id = this.data.currentEggId
          const submitted = payload.incubator_start_date
          this.verifySavedStartTime(submitted, id).catch(()=>{})
        }
        this.fetchEggs()
      } else {
        wx.showToast({ title: resp.message || (this.data.editMode ? '更新失败' : '创建失败'), icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: e.message || (this.data.editMode ? '更新失败' : '创建失败'), icon: 'none' })
    }
  },

  async verifySavedStartTime(submitted, id){
    try{
      const res = await app.request({ url: `/api/incubation/eggs/${id}`, method: 'GET' })
      const egg = (res && res.data && res.data.egg) || {}
      const back = egg && egg.incubator_start_date
      const subHM = (String(submitted).match(/\b(\d{2}:\d{2})\b/) || [,''])[1]
      const backHM = (String(back).match(/\b(\d{2}:\d{2})\b/) || [,''])[1]
      if (subHM && backHM && subHM !== backHM){
        wx.showToast({ title: `后端时间为 ${backHM}，未更新`, icon: 'none' })
      }
    }catch(_){ }
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
      let dt = new Date(s.replace(/-/g, '/').replace('T', ' '))
      if(isNaN(dt.getTime())) {
         // Fallback if replacing didn't work or format is different
         dt = new Date(s)
      }
      if(isNaN(dt.getTime())) return null
      const now = new Date()
      const diff = now - dt
      const days = diff / 86400000
      if (days < 0) return '0.0'
      return days.toFixed(1)
    }catch(_){ return null }
  }
  ,
  computeDaysHoursText(dStr){
    try{
      if(!dStr) return '--'
      const s = String(dStr)
      let dt = new Date(s.replace(/-/g,'/').replace('T',' '))
      if(isNaN(dt.getTime())){ dt = new Date(s) }
      if(isNaN(dt.getTime())) return '--'
      const now = new Date()
      const ms = now.getTime() - dt.getTime()
      if (ms < 0) return '0天0小时'
      const days = Math.floor(ms / 86400000)+1
      const hours = Math.floor((ms % 86400000) / 3600000)
      return `${days}天${hours}小时`
    }catch(_){ return '--' }
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
      let startD = ''
      let startT = '00:00'
      if (item && item.incubator_start_date) {
        const raw = String(item.incubator_start_date)
        let dt = new Date(raw.replace(/-/g, '/').replace('T', ' '))
        if (isNaN(dt.getTime())) {
           dt = new Date(raw)
        }
        if (!isNaN(dt.getTime())) {
          const y = dt.getFullYear()
          const m = String(dt.getMonth()+1).padStart(2,'0')
          const d = String(dt.getDate()).padStart(2,'0')
          const hh = String(dt.getHours()).padStart(2,'0')
          const mm = String(dt.getMinutes()).padStart(2,'0')
          startD = `${y}-${m}-${d}`
          startT = `${hh}:${mm}`
        }
      }
      const _txt = String(item && item.incubator_start_datetime_text || '')
      if ((!startD || startT === '00:00') && _txt) {
        const _m = _txt.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
        if (_m) { startD = _m[1]; startT = _m[2] }
      }
      const form = {
        label: (item && item.label) || '',
        laid_date: this.formatDate(item && item.laid_date),
        incubator_start_date: startD ? `${startD} ${startT}:00` : '',
        species_id: (item && (item.species_id || (item.species && item.species.id))) || ''
      }
      this.setData({
        showAddEgg: true,
        editMode: true,
        currentEggId: id,
        form,
        selectedSpeciesIndex: speciesIdx,
        startDate: startD,
        startTime: startT
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
  },
  async verifySavedStartTime(submitted, id){
    try{
      const res = await app.request({ url: `/api/incubation/eggs/${id}`, method: 'GET' })
      const egg = (res && res.data && res.data.egg) || {}
      const back = egg && egg.incubator_start_date
      const subHM = (String(submitted).match(/\b(\d{2}:\d{2})\b/) || [,''])[1]
      const backHM = (String(back).match(/\b(\d{2}:\d{2})\b/) || [,''])[1]
      if (subHM && backHM && subHM !== backHM){
         console.error('Backend time mismatch:', subHM, backHM)
         wx.showToast({ title: `后端时间为 ${backHM}，未更新`, icon: 'none', duration: 3000 })
      }
    }catch(e){ console.error(e) }
  }
})
