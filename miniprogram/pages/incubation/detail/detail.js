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
    showHatchPanel: false,
    hatchDate: '',
    hasOperationPermission: false
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
      const logsMapped = (logs || []).map(l => ({ ...l, log_date_text: this.formatDate(l && l.log_date) }))
      const startText = this.formatDate(egg && egg.incubator_start_date)
      const dsCalc = (typeof egg.day_since_start === 'number') ? egg.day_since_start : this.computeDaySinceStart(egg && egg.incubator_start_date)
      const dsText = (dsCalc === null || dsCalc === undefined || isNaN(dsCalc)) ? '--' : String(dsCalc)
      egg = { ...egg, incubator_start_date_text: startText, day_since_start: dsCalc, day_since_start_text: dsText }
      this.setData({ egg, statusText: this.mapStatusToCN(egg && egg.status) })
      const calResp = await app.request({ url: `/api/incubation/eggs/${this.data.id}/calendar`, method: 'GET' })
      const calMap = (calResp && calResp.data && calResp.data.calendar) || {}
      this.buildCalendarFromMap(calMap)
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
    const year = today.getFullYear()
    const month = today.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const days = []
    const padStart = first.getDay()

    const egg = this.data.egg || {}
    const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
    const startDate = startStr ? new Date(`${startStr}T00:00:00`) : null
    const todayMid = new Date(); todayMid.setHours(0,0,0,0)

    for(let i=0;i<padStart;i++){ days.push({ day:'', date:'', hasLog:false }) }
    for(let d=1; d<=last.getDate(); d++){
      const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const item = calendar && calendar[dt]
      const cellDate = new Date(`${dt}T00:00:00`)
      const isIncubating = !!(startDate && cellDate >= startDate && cellDate <= todayMid)
      let dayIndex = null
      if (isIncubating) {
        dayIndex = Math.floor((cellDate.getTime() - startDate.getTime()) / 86400000) + 1
      }
      const isToday = cellDate.getTime() === todayMid.getTime()
      let sTempTarget=null, sTempRangeText='', sHumRangeText=''
      if (isIncubating && dayIndex){
        const s = this.suggestForDay(dayIndex)
        const tr = s.temperature_c || {}
        const hr = s.humidity_pct || {}
        sTempTarget = tr.target
        sTempRangeText = `${tr.low}-${tr.high}℃`
        sHumRangeText = `${hr.low}-${hr.high}%`
      }
      days.push({ day: d, date: dt, hasLog: !!item, temp: item && item.temperature_c, hum: item && item.humidity_pct, isIncubating, dayIndex, isToday, sTempTarget, sTempRangeText, sHumRangeText })
    }
    this.setData({ calendarDays: days, currentMonthText: `${year}年${month+1}月` })
    this.setDefaultSelection()
  },

  setDefaultSelection(){
    try{
      const days = this.data.calendarDays || []
      const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      let sel = days.find(d => d.date === todayStr && d.isIncubating) || days.find(d => d.isIncubating)
      if (!sel) {
        const egg = this.data.egg || {}
        const startStr = egg.incubator_start_date_text || this.formatDate(egg.incubator_start_date)
        if (startStr){ sel = { date: todayStr, dayIndex: this.computeDaySinceStart(startStr)+1 } }
      }
      if (sel){
        const s = this.suggestForDay(sel.dayIndex)
        const tr = s.temperature_c || {}; const hr = s.humidity_pct || {}
        const turningText = (s.turning && s.turning.enabled) ? `每隔${s.turning.interval_min}分钟翻蛋一次` : '不翻蛋 (OFF)'
        const candlingText = (s.candling && s.candling.enabled) ? '照蛋看受精情况' : '不照蛋'
        this.setData({
          selectedDate: sel.date,
          selectedDateText: sel.date,
          selectedDayIndex: sel.dayIndex,
          selectedTempRangeText: `${tr.low}-${tr.high}℃`,
          selectedHumRangeText: `${hr.low}-${hr.high}%`,
          selectedTurningText: turningText,
          selectedCandlingText: candlingText
        })
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
      const s = this.suggestForDay(di)
      const tr = s.temperature_c || {}; const hr = s.humidity_pct || {}
      const turningText = (s.turning && s.turning.enabled) ? `每隔${s.turning.interval_min}分钟翻蛋一次` : '不翻蛋 (OFF)'
      const candlingText = (s.candling && s.candling.enabled) ? '照蛋看受精情况' : '不照蛋'
      this.setData({
        selectedDate: dt,
        selectedDateText: dt,
        selectedDayIndex: di,
        selectedTempRangeText: `${tr.low}-${tr.high}℃`,
        selectedHumRangeText: `${hr.low}-${hr.high}%`,
        selectedTurningText: turningText,
        selectedCandlingText: candlingText
      })
    }catch(_){ }
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
    if (dayIndex == null || dayIndex < 0) dayIndex = 0
    let temp
    if (dayIndex >= 17){
      temp = { low: 37.2, high: 37.3, target: 37.2 }
    } else {
      temp = { low: 37.4, high: 37.6, target: 37.5 }
    }
    let humLow, humHigh
    if (dayIndex <= 7){ humLow = 50.0; humHigh = 55.0 }
    else if (dayIndex <= 14){ humLow = 48.0; humHigh = 55.0 }
    else if (dayIndex <= 21){ humLow = 50.0; humHigh = 60.0 }
    else { humLow = 55.0; humHigh = 65.0 }
    const turning = { enabled: dayIndex >= 7 && dayIndex <= 16, interval_min: 120 }
    const candling = { enabled: dayIndex === 6 }
    return { temperature_c: temp, humidity_pct: { low: humLow, high: humHigh }, turning, candling }
  },

  computeDaySinceStart(dStr){
    try{
      if(!dStr) return null
      const s = String(dStr)
      let dt
      if(s.includes('T')){ dt = new Date(s) } else { dt = new Date(`${s}T00:00:00`) }
      if(isNaN(dt.getTime())) return null
      const today = new Date()
      const ms = today.setHours(0,0,0,0) - dt.setHours(0,0,0,0)
      return Math.floor(ms / 86400000)
    }catch(_){ return null }
  },

  
  mapStatusToCN(s){
    const map = { incubating: '孵化中', hatched: '已出雏', failed: '失败', stopped: '已停止' }
    return map[s] || (s || '')
  }
})
