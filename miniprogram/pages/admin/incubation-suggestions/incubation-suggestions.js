const app = getApp()

Page({
  data:{
    loading: true,
    isSuperAdmin: false,
    speciesList: [],
    speciesNames: [],
    speciesMap: {},
    selectedSpeciesIndex: 0,
    selectedSpeciesId: null,
    selectedSpeciesName: '',
    items: [],
    showModal: false,
    modalTitle: '',
    form: {},
    formSpeciesIndex: 0,
    formSpeciesName: '',
    formSpeciesIds: [],
    formSpeciesDisplay: '',
    showSpeciesMulti: false
  },
  onLoad(){
    this.init()
  },
  async init(){
    try{
      const user = app.globalData.user || {}
      const role = String((app.globalData.userInfo && app.globalData.userInfo.role) || user.role || '')
      const isSuperAdmin = role === 'super_admin'
      this.setData({ isSuperAdmin })
      await this.loadSpecies()
      this.setDefaultSpecies()
      await this.loadList()
    }finally{
      this.setData({ loading: false })
    }
  },
  async loadSpecies(){
    try{
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      const list = (res && res.data) || []
      const names = list.map(s => s.name)
      const map = {}
      list.forEach(s=>{ map[String(s.id)] = s.name })
      this.setData({ speciesList: list, speciesNames: names, speciesMap: map })
    }catch(_){ this.setData({ speciesList: [], speciesNames: [] }) }
  },
  setDefaultSpecies(){
    const list = this.data.speciesList || []
    if (list.length){
      const first = list[0]
      this.setData({ selectedSpeciesIndex: 0, selectedSpeciesId: first.id, selectedSpeciesName: first.name })
    }
  },
  async loadList(){
    try{
      const res = await app.request({ url: `/api/incubation/suggestions`, method: 'GET' })
      const items = (res && res.data && res.data.items) || []
      const map = this.data.speciesMap || {}
      const itemsWith = items.map(it => ({ ...it, species_name: it.species && it.species.name ? it.species.name : (map[String(it.species_id)] || it.species_name || '通用') }))
      const groups = this.buildGroups(itemsWith)
      this.setData({ items: itemsWith, groupedItems: groups, groupExpanded: {} })
    }catch(_){ this.setData({ items: [] }) }
  },
  buildGroups(list){
    const keyOf = (it) => JSON.stringify({
      day_start: it.day_start,
      day_end: it.day_end,
      temperature_low: String(it.temperature_low||''),
      temperature_high: String(it.temperature_high||''),
      temperature_target: String(it.temperature_target||''),
      humidity_low: String(it.humidity_low||''),
      humidity_high: String(it.humidity_high||''),
      turning_required: !!it.turning_required,
      candling_required: !!it.candling_required,
      tips: it.tips || ''
    })
    const m = {}
    for (const it of (list||[])){
      const k = keyOf(it)
      if (!m[k]) m[k] = { key: k, sample: it, items: [], species_names: [], species_ids: [] }
      m[k].items.push(it)
      const nm = it.species_name || '通用'
      if (m[k].species_names.indexOf(nm) < 0) m[k].species_names.push(nm)
      m[k].species_ids.push(it.species_id)
    }
    return Object.values(m)
  },
  toggleGroupExpand(e){
    const key = e.currentTarget.dataset.key
    const ge = { ...(this.data.groupExpanded || {}) }
    ge[key] = !ge[key]
    this.setData({ groupExpanded: ge })
  },
  openEditGroupModal(e){
    const key = e.currentTarget.dataset.key
    const groups = this.data.groupedItems || []
    const g = groups.find(x => x && x.key === key)
    if (!g){ wx.showToast({ title:'分组不存在', icon:'none' }); return }
    const sample = g.sample || {}
    const allIds = (g.species_ids || []).filter(Boolean)
    const uniqIds = Array.from(new Set(allIds))
    const names = (g.species_names || []).filter(Boolean)
    const idx = (this.data.speciesList || []).findIndex(sp => String(sp.id) === String(sample.species_id))
    const s = this.data.speciesList[idx]
    this.setData({
      showModal: true,
      modalTitle: '编辑孵化建议',
      form: { id: sample.id, day_start: sample.day_start, day_end: sample.day_end, temperature_low: sample.temperature_low, temperature_high: sample.temperature_high, temperature_target: sample.temperature_target, humidity_low: sample.humidity_low, humidity_high: sample.humidity_high, turning_required: !!sample.turning_required, candling_required: !!sample.candling_required, tips: sample.tips },
      formSpeciesIndex: idx >=0 ? idx : 0,
      formSpeciesName: s ? s.name : (names[0] || ''),
      formSpeciesIds: uniqIds,
      formSpeciesDisplay: names.join('、'),
      showSpeciesMulti: true
    })
  },
  onSpeciesChange(e){
    const idx = e.detail.value
    const s = this.data.speciesList[idx]
    this.setData({ selectedSpeciesIndex: idx, selectedSpeciesId: s && s.id, selectedSpeciesName: s && s.name })
    this.loadList()
  },
  openCreateModal(){
    const idx = this.data.selectedSpeciesIndex
    const s = this.data.speciesList[idx]
    this.setData({
      showModal: true,
      modalTitle: '新增孵化建议',
      form: { day_start: '', day_end: '', temperature_low: '', temperature_high: '', temperature_target: '', humidity_low: '', humidity_high: '', turning_required: false, candling_required: false, tips: '' },
      formSpeciesIndex: idx,
      formSpeciesName: s && s.name,
      formSpeciesIds: [],
      formSpeciesDisplay: '',
      showSpeciesMulti: false
    })
  },
  openEditModal(e){
    const id = e.currentTarget.dataset.id
    const item = (this.data.items || []).find(x => String(x.id) === String(id))
    if (!item){ wx.showToast({ title:'记录不存在', icon:'none' }); return }
    const idx = (this.data.speciesList || []).findIndex(sp => String(sp.id) === String(item.species_id))
    const s = this.data.speciesList[idx]
    this.setData({
      showModal: true,
      modalTitle: '编辑孵化建议',
      form: { id: item.id, day_start: item.day_start, day_end: item.day_end, temperature_low: item.temperature_low, temperature_high: item.temperature_high, temperature_target: item.temperature_target, humidity_low: item.humidity_low, humidity_high: item.humidity_high, turning_required: !!item.turning_required, candling_required: !!item.candling_required, tips: item.tips },
      formSpeciesIndex: idx >=0 ? idx : this.data.selectedSpeciesIndex,
      formSpeciesName: s ? s.name : this.data.selectedSpeciesName,
      formSpeciesIds: item.species_id ? [item.species_id] : [],
      formSpeciesDisplay: item.species_name || (s ? s.name : ''),
      showSpeciesMulti: false
    })
  },
  closeModal(){ this.setData({ showModal:false }) },
  onFormSpeciesChange(e){
    const idx = e.detail.value
    const s = this.data.speciesList[idx]
    this.setData({ formSpeciesIndex: idx, formSpeciesName: s && s.name })
  },
  onFormInput(e){
    const f = e.currentTarget.dataset.field
    const v = e.detail.value
    const form = { ...this.data.form, [f]: v }
    this.setData({ form })
  },
  onFormSwitchChange(e){
    const f = e.currentTarget.dataset.field
    const v = !!e.detail.value
    const form = { ...this.data.form, [f]: v }
    this.setData({ form })
  },
  openSpeciesSelector(){
    this.setData({ showSpeciesMulti: !this.data.showSpeciesMulti })
  },
  async batchDeleteGroup(e){
    try{
      const key = e.currentTarget.dataset.key
      const groups = this.data.groupedItems || []
      const g = groups.find(x => x && x.key === key)
      if (!g || !(g.items||[]).length){ wx.showToast({ title:'分组为空', icon:'none' }); return }
      const ids = (g.items||[]).map(x => x.id).filter(Boolean)
      const conf = await new Promise(resolve => wx.showModal({ title:'批量删除确认', content:`确定删除该分组下的${ids.length}条建议吗？`, success:r=>resolve(r) }))
      if (!conf || !conf.confirm) return
      const ops = ids.map(id => app.request({ url: `/api/incubation/suggestions/${id}`, method: 'DELETE' }).catch(err => ({ success:false, message: err && err.message })))
      const results = await Promise.all(ops)
      const ok = results.filter(r => r && r.success).length
      const total = ids.length
      if (ok > 0 && ok === total){
        wx.showToast({ title:`已删除${ok}条`, icon:'success' })
        this.loadList()
      } else if (ok > 0){
        wx.showToast({ title:`部分删除（${ok}/${total}）`, icon:'none' })
        this.loadList()
      } else {
        wx.showToast({ title:'删除失败', icon:'none' })
      }
    }catch(_){ wx.showToast({ title:'删除失败', icon:'none' }) }
  },
  toggleSpecies(e){
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    const ids = (this.data.formSpeciesIds || []).slice()
    const idx = ids.indexOf(id)
    if (idx >= 0) ids.splice(idx, 1)
    else ids.push(id)
    const names = (this.data.speciesList || []).filter(s => ids.indexOf(s.id) >= 0).map(s => s.name)
    this.setData({ formSpeciesIds: ids, formSpeciesDisplay: names.join('、') })
  },
  async submitForm(){
    try{
      const creating = !this.data.form.id
      if (creating){
        const ids = this.data.formSpeciesIds || []
        if (!ids.length && !this.data.formSpeciesIndex && !(this.data.speciesList && this.data.speciesList.length)){
          wx.showToast({ title: '请选择品种', icon:'none' }); return
        }
        const targets = ids.length ? ids : [(this.data.speciesList[this.data.formSpeciesIndex] || {}).id].filter(Boolean)
        let ok = 0, fail = 0
        for (const sid of targets){
          const body = { ...this.data.form, species_id: sid }
          const res = await app.request({ url: '/api/incubation/suggestions', method: 'POST', data: body })
          if (res && res.success) ok++; else fail++
        }
        if (ok > 0 && fail === 0){
          wx.showToast({ title:`已保存${ok}条`, icon:'success' })
          this.setData({ showModal:false })
          this.loadList()
        }else if (ok > 0){
          wx.showToast({ title:`部分成功（${ok}/${targets.length}）`, icon:'none' })
          this.setData({ showModal:false })
          this.loadList()
        }else{
          wx.showToast({ title:'保存失败', icon:'none' })
        }
      }else{
        const form = this.data.form || {}
        const selectedIds = this.data.formSpeciesIds || []
        const idx = this.data.formSpeciesIndex
        const s = this.data.speciesList[idx]
        const currentSpeciesId = s ? s.id : form.species_id
        const targets = selectedIds.length ? selectedIds : [currentSpeciesId].filter(Boolean)
        if (!targets.length){ wx.showToast({ title:'请选择品种', icon:'none' }); return }
        let ok = 0, fail = 0
        for (const sid of targets){
          // 若为当前记录所属品种，更新该记录；否则为其他品种，尝试更新同天数范围，否则创建新记录
          if (String(sid) === String(currentSpeciesId)){
            const body = { ...form, species_id: sid }
            const res = await app.request({ url: `/api/incubation/suggestions/${body.id}`, method: 'PUT', data: body })
            if (res && res.success) ok++; else fail++
          } else {
            const existing = (this.data.items || []).find(x => String(x.species_id) === String(sid) && String(x.day_start) === String(form.day_start) && String(x.day_end) === String(form.day_end))
            if (existing){
              const body = { ...form, id: existing.id, species_id: sid }
              const res = await app.request({ url: `/api/incubation/suggestions/${existing.id}`, method: 'PUT', data: body })
              if (res && res.success) ok++; else fail++
            } else {
              const body = { ...form, species_id: sid }
              // 去掉 id 字段以免后端误解析
              delete body.id
              const res = await app.request({ url: '/api/incubation/suggestions', method: 'POST', data: body })
              if (res && res.success) ok++; else fail++
            }
          }
        }
        if (ok > 0 && fail === 0){
          wx.showToast({ title:`已保存${ok}条`, icon:'success' })
          this.setData({ showModal:false })
          this.loadList()
        } else if (ok > 0){
          wx.showToast({ title:`部分成功（${ok}/${targets.length}）`, icon:'none' })
          this.setData({ showModal:false })
          this.loadList()
        } else {
          wx.showToast({ title:'保存失败', icon:'none' })
        }
      }
    }catch(_){ wx.showToast({ title:'保存失败', icon:'none' }) }
  },
  async deleteItem(e){
    try{
      const id = e.currentTarget.dataset.id
      const conf = await new Promise(resolve => wx.showModal({ title:'删除确认', content:'确定删除该建议吗？', success:r=>resolve(r) }))
      if (!conf || !conf.confirm) return
      const res = await app.request({ url: `/api/incubation/suggestions/${id}`, method: 'DELETE' })
      if (res && res.success){ wx.showToast({ title:'已删除', icon:'success' }); this.loadList() }
      else { wx.showToast({ title:(res&&res.message)||'删除失败', icon:'none' }) }
    }catch(_){ wx.showToast({ title:'删除失败', icon:'none' }) }
  }
})
