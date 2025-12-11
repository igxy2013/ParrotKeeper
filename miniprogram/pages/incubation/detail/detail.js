const app = getApp()

Page({
  data: {
    id: '',
    loading: true,
    egg: {},
    calendarDays: [],
    currentMonthText: '',
    statusText: '',
    selectedDate: '',
    selectedDateText: '',
    selectedDayIndex: null,
    selectedTempRangeText: '',
    selectedHumRangeText: '',
    selectedTurningText: '',
    selectedCandlingText: '',
    selectedTips: [],
    showHatchPanel: false,
    hatchDate: '',
    hasOperationPermission: false,
    speciesSupported: true
    , showUnifiedPanel: false
    , logDate: ''
    , logTemp: ''
    , logHum: ''
    , logNotes: ''
    , logCandling: false
    , hatchToday: false
    , hasHatched: false
    , afterHatch: false
    , calendarYear: null
    , calendarMonth: null
    , calendarMap: {}
    , eggLogs: []
    , selectedLogs: []
    , showEditLogPanel: false
    , editingLogId: null
    , editLogDate: ''
    , editLogTemp: ''
    , editLogHum: ''
    , editLogNotes: ''
  },

  isSpeciesSupported(name){
    const supported = ['玄凤鹦鹉','牡丹鹦鹉','亚马逊鹦鹉','金刚鹦鹉','非洲灰鹦鹉','折衷鹦鹉']
    const n = (name || '').trim()
    return supported.includes(n)
  },

  onLoad(options){
    this.setData({ id: options.id || '' })
    try{
      const hasOperationPermission = app.hasOperationPermission && app.hasOperationPermission()
      this.setData({ hasOperationPermission: !!hasOperationPermission })
    }catch(_){ this.setData({ hasOperationPermission: false }) }
    this.fetchDetail()
  },

  async fetchDetail(){
    try {
      this.setData({ loading: true })
      const resp = await app.request({ url: `/api/incubation/eggs/${this.data.id}`, method: 'GET' })
      let egg = (resp && resp.data && resp.data.egg) || {}
      const logs = (resp && resp.data && resp.data.logs) || []
      const logsMapped = (logs || []).map(l => {
        const rdt = l && (l.record_date_text || l.record_date || l.date)
        const ldt = l && l.log_date
        const logDateText = rdt ? String(rdt) : this.formatDate(ldt)
        return { ...l, log_date_text: logDateText }
      })
      const startText = this.formatDate(egg && egg.incubator_start_date)
      const startDateTimeText = app.formatDateTime(egg && egg.incubator_start_date, 'YYYY-MM-DD HH:mm')
      const dsCalc = this.computeDaySinceStart(egg && egg.incubator_start_date)
      const dsText = this.computeDaysHoursText(egg && egg.incubator_start_date)
      const speciesName = (egg && egg.species && egg.species.name) ? egg.species.name : (egg && egg.species_name) || ''
      const hatchText = this.formatDate(egg && egg.hatch_date)
      egg = { ...egg, incubator_start_date_text: startText, incubator_start_datetime_text: startDateTimeText, hatch_date_text: hatchText, day_since_start: dsCalc, day_since_start_text: dsText, species_name: speciesName }
      const speciesSupported = this.isSpeciesSupported(speciesName)
      const statusText = hatchText ? '已出雏' : this.mapStatusToCN(egg && egg.status)
      const hasHatched = !!hatchText
      this.setData({ egg, statusText, speciesSupported, hasHatched, eggLogs: logsMapped })
      const calResp = await app.request({ url: `/api/incubation/eggs/${this.data.id}/calendar`, method: 'GET' })
      const calMap = (calResp && calResp.data && calResp.data.calendar) || {}
      try{
        const cDates = (calResp && calResp.data && calResp.data.candling_dates) || []
        const tDates = (calResp && calResp.data && calResp.data.turning_dates) || []
        if (Array.isArray(cDates)) calMap.candling_dates = cDates
        if (Array.isArray(tDates)) calMap.turning_dates = tDates
      }catch(_){ }
      const today = new Date()
      const y = today.getFullYear()
      const m = today.getMonth()
      this.setData({ calendarMap: calMap, calendarYear: y, calendarMonth: m })
      this.buildCalendarFromMap(calMap)
      this.updateSelectedLogs()
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatDate(d){ return d ? String(d).slice(0,10) : '' },

  buildCalendar(logs){
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const days = []
    const map = {}
    (logs || []).forEach(l => { const k = this.formatDate(l.log_date); map[k] = l })
    const padStart = first.getDay()
    for(let i=0;i<padStart;i++){ days.push({ day:'', date:'', hasLog:false }) }
    for(let d=1; d<=last.getDate(); d++){
      const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const l = map[dt]
      days.push({ day: d, date: dt, hasLog: !!l, temp: l && l.temperature_c, hum: l && l.humidity_pct })
    }
    this.setData({ calendarDays: days, currentMonthText: `${year}年${month+1}月` })
  },

  buildCalendarFromMap(calendar){
    const today = new Date()
    const year = (this.data.calendarYear != null) ? this.data.calendarYear : today.getFullYear()
    const month = (this.data.calendarMonth != null) ? this.data.calendarMonth : today.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const days = []
    const padStart = first.getDay()

    const egg = this.data.egg || {}
    const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
    const startDate = startStr ? new Date(`${startStr}T00:00:00`) : null
    const todayMid = new Date(); todayMid.setHours(0,0,0,0)
    const hatchStr = egg.hatch_date_text || this.formatDate(egg.hatch_date)
    const endDate = hatchStr ? new Date(`${hatchStr}T00:00:00`) : todayMid

    let candlingDatesSet = new Set()
    let turningDatesSet = new Set()
    try{
      const cList = (calendar && (calendar.candling_dates || calendar.candling)) || []
      if (Array.isArray(cList)){
        cList.forEach(d => { const s = this.formatDate(d); if (s) candlingDatesSet.add(s) })
      }
      const tList = (calendar && (calendar.turning_dates || calendar.turning)) || []
      if (Array.isArray(tList)){
        tList.forEach(d => { const s = this.formatDate(d); if (s) turningDatesSet.add(s) })
      }
    }catch(_){ }

    for(let i=0;i<padStart;i++){ days.push({ day:'', date:'', hasLog:false }) }
    // 规范化后端返回的calendar键，确保使用YYYY-MM-DD作为键（移除时间部分）
    const normalizedCalendar = {}
    try{
      const keys = Object.keys(calendar || {})
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        if (k === 'candling_dates' || k === 'turning_dates') continue
        const dk = this.formatDate(k)
        if (dk) normalizedCalendar[dk] = calendar[k]
      }
    }catch(_){ }

    for(let d=1; d<=last.getDate(); d++){
      const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const item = normalizedCalendar[dt]
      const cellDate = new Date(`${dt}T00:00:00`)
      const isIncubating = !!(startDate && cellDate >= startDate && cellDate <= endDate)
      let dayIndex = null
      if (startDate && cellDate >= startDate) {
        dayIndex = Math.floor((cellDate.getTime() - startDate.getTime()) / 86400000) + 1
      }
      const isToday = cellDate.getTime() === todayMid.getTime()
      let sTempTarget=null, sTempRangeText='', sHumRangeText=''
      let isCandlingDay=false
      let isTurningDay=false
      const isHatchDay = !!(hatchStr && dt === hatchStr)
      if (candlingDatesSet.has(dt)) { isCandlingDay = true }
      if (turningDatesSet.has(dt)) { isTurningDay = true }
      if (item && (item.candling_required || item.is_candling_day || item.candling === true || item.is_candling === true)) {
        isCandlingDay = true
      }
      if (item && (item.turning_required || item.is_turning_day || item.turning === true)) {
        isTurningDay = true
      }
      
      if (!isCandlingDay){
        const logs = this.data.eggLogs || []
        const hasCandlingLog = logs.some(x => (x.log_date_text || this.formatDate(x.log_date)) === dt && (x.candling === true || x.is_candling === true))
        if (hasCandlingLog) isCandlingDay = true
      }
      days.push({ day: d, date: dt, hasLog: !!item, temp: item && item.temperature_c, hum: item && item.humidity_pct, isIncubating, dayIndex, isToday, sTempTarget, sTempRangeText, sHumRangeText, isCandlingDay, isTurningDay, isHatchDay })
    }
    this.setData({ calendarDays: days, currentMonthText: `${year}年${month+1}月` })
    this.setDefaultSelection()
  },

  goPrevMonth(){
    try{
      let y = this.data.calendarYear
      let m = this.data.calendarMonth
      if (y == null || m == null){ const t = new Date(); y = t.getFullYear(); m = t.getMonth() }
      m -= 1
      if (m < 0){ m = 11; y -= 1 }
      this.setData({ calendarYear: y, calendarMonth: m })
      this.buildCalendarFromMap(this.data.calendarMap)
    }catch(_){ }
  },
  goNextMonth(){
    try{
      let y = this.data.calendarYear
      let m = this.data.calendarMonth
      if (y == null || m == null){ const t = new Date(); y = t.getFullYear(); m = t.getMonth() }
      m += 1
      if (m > 11){ m = 0; y += 1 }
      this.setData({ calendarYear: y, calendarMonth: m })
      this.buildCalendarFromMap(this.data.calendarMap)
    }catch(_){ }
  },

  setDefaultSelection(){
    try{
      const days = this.data.calendarDays || []
      const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      const egg = this.data.egg || {}
      const hatchStr = egg.hatch_date_text || this.formatDate(egg.hatch_date)
      let sel = null
      if (hatchStr){
        sel = days.find(d => d.date === hatchStr) || days.find(d => d.isIncubating)
      } else {
        sel = days.find(d => d.date === todayStr && d.isIncubating) || days.find(d => d.isIncubating)
      }
      if (!sel) {
        const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
        if (startStr){ sel = { date: todayStr, dayIndex: this.computePreciseDayIndex(startStr) } }
      }
      if (sel){
        if (sel.date === todayStr) {
          const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
          if (startStr) sel.dayIndex = this.computePreciseDayIndex(startStr)
        }
        {
          const afterHatch = !!(hatchStr && sel.date >= hatchStr)
          this.fetchAdviceAndSet(sel.date, sel.dayIndex, afterHatch)
        }
      }
    }catch(_){ }
  },

  onTapDay(e){
    try{
      const dt = e.currentTarget.dataset.date
      let di = e.currentTarget.dataset.dayindex
      if (di == null){
        const egg = this.data.egg || {}
        const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
        if (startStr){
          const start = new Date(`${startStr}T00:00:00`)
          const cell = new Date(`${dt}T00:00:00`)
          di = Math.floor((cell - start)/86400000) + 1
        }
      }
      if (!dt || !di || di <= 0) return
      const egg = this.data.egg || {}
      const hatchStr = egg.hatch_date_text || this.formatDate(egg.hatch_date)
      const afterHatch = !!(hatchStr && dt >= hatchStr)
      this.fetchAdviceAndSet(dt, di, afterHatch)
    }catch(_){ }
  },
  onEditLogTap(e){
    try{
      const id = e.currentTarget.dataset.id
      const list = this.data.selectedLogs || []
      const item = list.find(x => String(x.id) === String(id))
      if (!item){ wx.showToast({ title: '日志不存在', icon: 'none' }); return }
      this.setData({
        showEditLogPanel: true,
        editingLogId: id,
        editLogDate: item.log_date_text || this.formatDate(item.log_date),
        editLogTemp: item.temperature_c || item.temperature || '',
        editLogHum: item.humidity_pct || item.humidity || '',
        editLogNotes: item.notes || ''
      })
    }catch(_){ }
  },
  closeEditLogPanel(){
    this.setData({ showEditLogPanel: false, editingLogId: null })
  },
  onEditLogDateChange(e){ this.setData({ editLogDate: e.detail.value }) },
  onEditLogTempInput(e){ this.setData({ editLogTemp: e.detail.value }) },
  onEditLogHumInput(e){ this.setData({ editLogHum: e.detail.value }) },
  onEditLogNotesInput(e){ this.setData({ editLogNotes: e.detail.value }) },
  async submitEditLog(){
    try{
      const id = this.data.editingLogId
      if (!id){ wx.showToast({ title: '未选择日志', icon: 'none' }); return }
      const d = this.data.editLogDate
      if (!d){ wx.showToast({ title: '请选择日期', icon: 'none' }); return }
      const t = this.data.editLogTemp ? parseFloat(this.data.editLogTemp) : undefined
      const h = this.data.editLogHum ? parseFloat(this.data.editLogHum) : undefined
      const payload = { log_date: d }
      if (t !== undefined && !isNaN(t)) payload.temperature_c = t
      if (h !== undefined && !isNaN(h)) payload.humidity_pct = h
      if (this.data.editLogNotes) payload.notes = this.data.editLogNotes
      const resp = await app.request({ url: `/api/incubation/logs/${id}`, method: 'PUT', data: payload })
      if (resp && resp.success){
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ showEditLogPanel: false, editingLogId: null })
        this.fetchDetail()
      } else {
        wx.showToast({ title: (resp && resp.message) || '保存失败', icon: 'none' })
      }
    }catch(_){ wx.showToast({ title: '保存失败', icon: 'none' }) }
  },
  async onDeleteLogTap(e){
    try{
      const id = e.currentTarget.dataset.id
      const confirmRes = await new Promise(resolve => {
        wx.showModal({ title: '删除确认', content: '确定删除该日志吗？', success: r => resolve(r) })
      })
      if (!confirmRes || !confirmRes.confirm) return
      const resp = await app.request({ url: `/api/incubation/logs/${id}`, method: 'DELETE' })
      if (resp && resp.success){
        wx.showToast({ title: '已删除', icon: 'success' })
        this.fetchDetail()
      } else {
        wx.showToast({ title: (resp && resp.message) || '删除失败', icon: 'none' })
      }
    }catch(_){ wx.showToast({ title: '删除失败', icon: 'none' }) }
  },

  openHatchPanel(){
    try{
      let d = this.data.egg && this.data.egg.hatch_date
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      if (!d) d = todayStr
      this.setData({ showHatchPanel: true, hatchDate: String(d).slice(0,10) })
    }catch(_){ this.setData({ showHatchPanel: true }) }
  },
  closeHatchPanel(){ this.setData({ showHatchPanel: false }) },
  onHatchDateChange(e){ this.setData({ hatchDate: e.detail.value }) },
  async submitHatchDate(){
    try{
      const d = this.data.hatchDate
      if (!d){ wx.showToast({ title: '请选择日期', icon: 'none' }); return }
      const resp = await app.request({ url: `/api/incubation/eggs/${this.data.id}`, method: 'PUT', data: { hatch_date: d } })
      if (resp && resp.success){
        wx.showToast({ title: '已保存出壳日期', icon: 'success' })
        this.setData({ showHatchPanel: false })
        this.fetchDetail()
      } else {
        wx.showToast({ title: (resp && resp.message) || '保存失败', icon: 'none' })
      }
    }catch(err){ wx.showToast({ title: '保存失败', icon: 'none' }) }
  },

  suggestForDay(dayIndex){
    return { 
      temperature_c: { low: null, high: null, target: null }, 
      humidity_pct: { low: null, high: null }, 
      turning: { enabled: false, interval_min: null }, 
      candling: { enabled: false } 
    }
  },

  async fetchAdviceAndSet(dateText, dayIndex, afterHatch){
    try{
      const resp = await app.request({ url: `/api/incubation/eggs/${this.data.id}/advice?date=${encodeURIComponent(dateText)}`, method: 'GET' })
      const ranges = (resp && resp.data && resp.data.ranges) || {}
      const tr = ranges.temperature_c || {}
      const hr = ranges.humidity_pct || {}
      const turningRequired = (resp && resp.data) ? resp.data.turning_required : undefined
      const candlingRequired = (resp && resp.data) ? resp.data.candling_required : undefined
      const tipsArr = (resp && resp.data && Array.isArray(resp.data.tips)) ? resp.data.tips.filter(x => !!x) : []
      let turningText
      let candlingText
      
      if (turningRequired === undefined || candlingRequired === undefined){
        // 无后端数据，且已移除硬编码兜底
        turningText = '—'
        candlingText = '—'
      } else {
        turningText = turningRequired ? '需要翻蛋' : '不翻蛋 (OFF)'
        candlingText = candlingRequired ? '照蛋查看孵化情况' : '不照蛋'
      }

      this.setData({
        selectedDate: dateText,
        selectedDateText: dateText,
        selectedDayIndex: dayIndex,
        selectedTempRangeText: (tr.low!=null && tr.high!=null) ? `${tr.low}-${tr.high}℃` : '—',
        selectedHumRangeText: (hr.low!=null && hr.high!=null) ? `${hr.low}-${hr.high}%` : '—',
        selectedTurningText: turningText,
        selectedCandlingText: candlingText,
        selectedTips: tipsArr,
        afterHatch
      })
      this.updateSelectedLogs()
    }catch(_){
      // 出错时也不使用硬编码
      this.setData({
        selectedDate: dateText,
        selectedDateText: dateText,
        selectedDayIndex: dayIndex,
        selectedTempRangeText: '—',
        selectedHumRangeText: '—',
        selectedTurningText: '—',
        selectedCandlingText: '—',
        selectedTips: [],
        afterHatch
      })
      this.updateSelectedLogs()
    }
  },

  computeDaySinceStart(dStr){
    try{
      if(!dStr) return null
      const s = String(dStr)
      let dt = new Date(s.replace(/-/g, '/').replace('T', ' '))
      if(isNaN(dt.getTime())){ dt = new Date(s) }
      if(isNaN(dt.getTime())) return null
      const now = new Date()
      const diff = now - dt
      const days = diff / 86400000
      if (days < 0) return '0.0'
      return Number(days.toFixed(1))
    }catch(_){ return null }
  },

  computeDaysHoursText(dStr){
    try{
      if(!dStr) return '--'
      const s = String(dStr)
      let dt = new Date(s.replace(/-/g,'/').replace('T',' '))
      if(isNaN(dt.getTime())) dt = new Date(s)
      if(isNaN(dt.getTime())) return '--'
      const now = new Date()
      const ms = now.getTime() - dt.getTime()
      if (ms < 0) return '0天0小时'
      const days = Math.floor(ms / 86400000) + 1
      const hours = Math.floor((ms % 86400000) / 3600000)
      return `${days}天${hours}小时`
    }catch(_){ return '--' }
  },

  computePreciseDayIndex(dStr){
    try{
      if(!dStr) return 1
      const s = String(dStr)
      let dt = new Date(s.replace(/-/g,'/').replace('T',' '))
      if(isNaN(dt.getTime())) dt = new Date(s)
      if(isNaN(dt.getTime())) return 1
      const now = new Date()
      const ms = now.getTime() - dt.getTime()
      if (ms < 0) return 1
      const di = Math.floor(ms / 86400000) + 1
      return di > 0 ? di : 1
    }catch(_){ return 1 }
  },

  
  mapStatusToCN(s){
    const map = { incubating: '孵化中', hatched: '已出雏', failed: '失败', stopped: '已停止' }
    return map[s] || (s || '')
  },
  openPlusMenu(){
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const logD = this.data.selectedDate || todayStr
    this.setData({ showUnifiedPanel: true, logDate: logD, logTemp: '', logHum: '', logNotes: '', logCandling: false, hatchToday: false })
  },
  closeUnifiedPanel(){ this.setData({ showUnifiedPanel: false }) },

  
  onLogDateChange(e){ this.setData({ logDate: (e && e.detail && e.detail.value) || '' }) },
  onLogTempInput(e){ this.setData({ logTemp: (e && e.detail && e.detail.value) || '' }) },
  onLogHumInput(e){ this.setData({ logHum: (e && e.detail && e.detail.value) || '' }) },
  onLogNotesInput(e){ this.setData({ logNotes: (e && e.detail && e.detail.value) || '' }) },
  toggleLogCandling(e){ const v = !!(e && e.detail && e.detail.value); this.setData({ logCandling: v }) },
  toggleHatchToday(e){ const v = !!(e && e.detail && e.detail.value); this.setData({ hatchToday: v }) },
  async submitUnifiedForm(){
    try{
      const ops = []
      const d = this.data.logDate
      if(!d){ wx.showToast({ title: '请选择日期', icon: 'none' }); return }
      const egg = this.data.egg || {}
      const startStr = this.formatDate(egg && egg.incubator_start_date)
      const hatchStr = this.formatDate(egg && egg.hatch_date)
      if (!startStr && (this.data.logTemp || this.data.logHum || this.data.logNotes || this.data.logCandling)){
        wx.showToast({ title: '请先设置孵化开始日期', icon: 'none' }); return
      }
      if (hatchStr){
        const dt = new Date(`${d}T00:00:00`).getTime()
        const ht = new Date(`${hatchStr}T00:00:00`).getTime()
        if (dt > ht){ wx.showToast({ title: '出壳后无法添加孵化日志', icon: 'none' }); return }
      }
      const hasLog = !!(this.data.logTemp || this.data.logHum || this.data.logNotes || this.data.logCandling)
      if (hasLog){
        const t = this.data.logTemp ? parseFloat(this.data.logTemp) : undefined
        const h = this.data.logHum ? parseFloat(this.data.logHum) : undefined
        const payload = { log_date: d }
        // 兼容后端键名：同时传递 temperature_c/temperature 与 humidity_pct/humidity
        if (t !== undefined && !isNaN(t)) { payload.temperature_c = t; payload.temperature = t }
        if (h !== undefined && !isNaN(h)) { payload.humidity_pct = h; payload.humidity = h }
        if (this.data.logNotes) payload.notes = this.data.logNotes
        // 兼容照蛋字段命名
        payload.candling = !!this.data.logCandling
        payload.is_candling = !!this.data.logCandling
        // 传递 day_index 以便后端校验
        if (startStr){
          try{
            const start = new Date(`${startStr}T00:00:00`)
            const cell = new Date(`${d}T00:00:00`)
            const di = Math.floor((cell - start)/86400000) + 1
            if (di > 0 && isFinite(di)) payload.day_index = di
          }catch(_){}
        }
        // 保留最小必要字段，避免后端解析歧义
        ops.push(app.request({ url: `/api/incubation/eggs/${this.data.id}/logs`, method: 'POST', data: payload }).catch(err => ({ success: false, message: err && err.message })))
      }
      if (this.data.hatchToday){
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        ops.push(app.request({ url: `/api/incubation/eggs/${this.data.id}`, method: 'PUT', data: { hatch_date: todayStr } }).catch(err => ({ success: false, message: err && err.message })))
      }
      if (ops.length === 0){ wx.showToast({ title: '未填写内容', icon: 'none' }); return }
      const results = await Promise.all(ops)
      const ok = results.every(r => r && r.success)
      if (ok){
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ showUnifiedPanel: false })
        this.fetchDetail()
      } else {
        const failMsg = (results.find(r => !r || !r.success) || {}).message || '保存失败'
        wx.showToast({ title: failMsg, icon: 'none' })
      }
    }catch(_){ wx.showToast({ title: '保存失败', icon: 'none' }) }
  },

  

  
  onStartDateChange(e){ this.setData({ startDate: (e && e.detail && e.detail.value) || '' }) },
  async submitStartDate(){
    try{
      const d = this.data.startDate
      if (!d){ wx.showToast({ title: '请选择日期', icon: 'none' }); return }
      const resp = await app.request({ url: `/api/incubation/eggs/${this.data.id}`, method: 'PUT', data: { incubator_start_date: d } })
      if (resp && resp.success){
        wx.showToast({ title: '已保存开始日期', icon: 'success' })
        this.setData({ showUnifiedPanel: false })
        this.fetchDetail()
      } else {
        wx.showToast({ title: (resp && resp.message) || '保存失败', icon: 'none' })
      }
    }catch(_){ wx.showToast({ title: '保存失败', icon: 'none' }) }
  },
  updateSelectedLogs(){
    try{
      const d = this.data.selectedDate
      const list = this.data.eggLogs || []
      if (!d || !list.length){ this.setData({ selectedLogs: [] }); return }
      const filtered = list.filter(x => (x.log_date_text || this.formatDate(x.log_date)) === d)
      this.setData({ selectedLogs: filtered })
    }catch(_){ this.setData({ selectedLogs: [] }) }
  },
})
