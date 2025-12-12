const app = getApp()
const chickCare = require('../../utils/chick-care.js')

Page({
  data: {
    alerts: [],
    iconPaths: {
      alertInfoLow: '/images/remix/ri-information-fill-green.png',
      alertInfoMedium: '/images/remix/ri-information-fill-amber.png',
      alertInfoHigh: '/images/remix/ri-information-fill-red.png'
    },
    alertsCount: 0
  },

  onLoad() {
    this.loadAllHealthAlerts()
  },
  onShow() {
    this.loadAllHealthAlerts()
  },

  async loadAllHealthAlerts() {
    try {
      const res = await app.request({
        url: '/api/statistics/health-anomalies',
        method: 'GET',
        data: { days: 30 }
      })

      if (!res || !res.success) {
        this.setData({ alerts: [] })
        return
      }

      const severityOrder = { high: 2, medium: 1, low: 0 }
      const alerts = []
      const results = res.data && res.data.results ? res.data.results : []
      results.forEach(r => {
        const pid = r.parrot_id
        const name = r.parrot_name
        const anomalies = r.anomalies || []
        anomalies.forEach(a => {
          const sev = a.severity || 'medium'
          const sevText = sev === 'high' ? '【高】' : (sev === 'medium' ? '【中】' : '【低】')
          const title = `${name}：${sevText}${a.message || '健康异常提醒'}`
          let detailText = ''
          const d = a.details || {}
          if (a.type === 'weight_decline') {
            if (d.drop_pct !== undefined) {
              detailText = `下降 ${d.drop_pct}%；近期均值 ${d.recent_avg_g || d.latest_weight_g || '--'}g`
            } else if (d.slope_g_per_day !== undefined) {
              detailText = `斜率 ${d.slope_g_per_day} g/天；基准 ${d.baseline_g} g`
            }
          } else if (a.type === 'feeding_gap') {
            if (d.gap_hours !== undefined) {
              detailText = `间隔 ${d.gap_hours} 小时${d.median_hours ? `（常态 ${d.median_hours} 小时）` : ''}`
            }
          } else if (a.type === 'feeding_frequency_low') {
            if (d.recent_median_per_day !== undefined) {
              detailText = `最近日中位 ${d.recent_median_per_day} 次/天（常态 ${d.baseline_median_per_day} 次/天）`
            }
          }
          const description = `${a.suggestion || ''}${detailText ? '。' + detailText : ''}`
          alerts.push({
            id: `${pid}-${a.type}-${sev}`,
            parrot_id: pid,
            title,
            description,
            severity: sev,
            type: a.type
          })
        })
      })

      let parrots = []
      try {
        const pr = await app.request({ url: '/api/parrots', method: 'GET', data: { page: 1, per_page: 100 } })
        if (pr && pr.success) {
          parrots = (pr.data.parrots || []).map(p => ({ id: p.id, name: p.name, birth_date: p.birth_date }))
        }
      } catch (_) {}
      const careAlerts = []
      parrots.forEach(p => {
        const bd = p.birth_date
        if (!bd) return
        let birth = new Date(bd)
        if (isNaN(birth.getTime())) {
          const s = String(bd)
          birth = new Date(s.replace(/-/g, '/').replace('T', ' '))
        }
        if (isNaN(birth.getTime())) return
        const now = new Date()
        const diff = now.getTime() - birth.getTime()
        const days = Math.floor(diff / 86400000)
        const d = days < 1 ? 1 : days
        if (d >= 1 && d <= 45) {
          const alert = chickCare.buildChickCareAlert(p, d)
          if (alert) careAlerts.push(alert)
        }
      })

      let incubationAlerts = []
      try {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        const eggsResp = await app.request({ url: '/api/incubation/eggs', method: 'GET', data: { page: 1, per_page: 100 } })
        const eggs = (eggsResp && eggsResp.data && eggsResp.data.items) || (eggsResp && eggsResp.data && eggsResp.data.eggs) || []
        const incubating = eggs.filter(e => String((e && (e.status || e.state)) || '') === 'incubating')
        const adviceCalls = incubating.slice(0, 20).map(e => {
          const id = e.id || e.egg_id || e.eggId
          return app.request({ url: `/api/incubation/eggs/${id}/advice`, method: 'GET', data: { date: todayStr } })
            .then(r => ({ ok: true, egg: e, resp: r }))
            .catch(err => ({ ok: false, egg: e, err }))
        })
        const adviceResults = await Promise.all(adviceCalls)
        incubationAlerts = adviceResults.map(ar => {
          if (!ar || !ar.ok || !ar.resp || !ar.resp.success) return null
          const e = ar.egg || {}
          const ranges = (ar.resp.data && ar.resp.data.ranges) || {}
          const tr = ranges.temperature_c || {}
          const hr = ranges.humidity_pct || {}
          const turningRequired = (ar.resp.data && ar.resp.data.turning_required) ? true : false
          const candlingRequired = (ar.resp.data && ar.resp.data.candling_required) ? true : false
          const tipsArr = (ar.resp.data && Array.isArray(ar.resp.data.tips)) ? ar.resp.data.tips.filter(x => !!x) : []
          const speciesName = (e.species && e.species.name) ? e.species.name : (e.species_name || '')
          const parrotName = e.parrot_name || e.male_parrot_name || e.female_parrot_name || speciesName || '孵化蛋'
          const startStr = e.incubator_start_date || e.incubator_start_date_text || ''
          let dayIndexDisplay = ''
          try {
            if (startStr) {
              const onlyDate = String(startStr).slice(0,10)
              const startMid = new Date(`${onlyDate}T00:00:00`)
              if (!isNaN(startMid.getTime())) {
                const todayMid = new Date(`${todayStr}T00:00:00`)
                const di = Math.floor((todayMid.getTime() - startMid.getTime())/86400000) + 1
                if (di > 0 && isFinite(di)) dayIndexDisplay = String(di)
              }
            }
          } catch (_) {}
          const tempText = (tr.low!=null && tr.high!=null) ? `${tr.low}-${tr.high}℃` : '—'
          const humText = (hr.low!=null && hr.high!=null) ? `${hr.low}-${hr.high}%` : '—'
          const turningText = turningRequired ? '需翻蛋' : '不翻蛋'
          const candlingText = candlingRequired ? '需照蛋' : '不照蛋'
          const tipsText = tipsArr.length ? tipsArr.join('；') : ''
          return {
            id: `incubation-${e.id || e.egg_id}-${todayStr}`,
            parrot_id: e.parrot_id || '',
            title: dayIndexDisplay ? `${parrotName}：第${dayIndexDisplay}天孵化建议` : `${parrotName}：孵化建议`,
            description: `温度${tempText}；湿度${humText}；${turningText}；${candlingText}${tipsText ? '；' + tipsText : ''}`,
            severity: 'medium',
            type: 'incubation_advice'
          }
        }).filter(Boolean)
      } catch (_) {}

      let generalAdvice = null
      try {
        const today = new Date()
        const dayIndex = Math.floor(today.getTime() / 86400000)
        const topics = [
          { key: 'diet', name: '饮食与营养', desc: '均衡配比、清洁水源、避免高脂高盐' },
          { key: 'environment', name: '环境与丰富化', desc: '稳定温湿度、适度光照，提供玩具与觅食丰富化' },
          { key: 'interaction', name: '互动与训练', desc: '短时高频正向训练，尊重边界，避免过度应激' },
          { key: 'health', name: '健康与观察', desc: '每日观察粪便、食欲与体重趋势，异常及时记录' }
        ]
        const t = topics[dayIndex % topics.length]
        generalAdvice = {
          id: `care-general-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}-${t.key}`,
          parrot_id: '',
          title: `护理指南：${t.name}`,
          description: t.desc,
          severity: 'low',
          type: 'care_general_topic',
          category: t.key
        }
      } catch (_) {}

      const all = (generalAdvice ? [generalAdvice] : []).concat(careAlerts).concat(incubationAlerts).concat(alerts)
      const nmPrefs = (() => {
        try {
          const nm = app.globalData.notificationManager
          const s = nm && nm.getNotificationSettings ? nm.getNotificationSettings() : null
          return (s && s.healthAlertPreferences) || {}
        } catch (_) { return {} }
      })()
      const allowType = (t) => {
        const v = nmPrefs && nmPrefs[t]
        return typeof v === 'undefined' ? true : !!v
      }
      const list = all.filter(a => allowType(a.type))
      const todayKey = this.getTodayKey()
      const pinned = this.getPinnedSet(todayKey)
      list.sort((a, b) => {
        const waBase = a.type === 'chick_care' ? 3 : (severityOrder[a.severity] || 0)
        const wbBase = b.type === 'chick_care' ? 3 : (severityOrder[b.severity] || 0)
        const wa = waBase + (pinned.has(a.type) ? 100 : 0)
        const wb = wbBase + (pinned.has(b.type) ? 100 : 0)
        return wb - wa
      })

      const dismissed = this.getDismissedSet(todayKey)
      const filtered = list.filter(a => !dismissed.has(a.id))

      this.setData({ alerts: filtered, alertsCount: filtered.length })

      try {
        const nm = app.globalData.notificationManager
        const settings = nm.getNotificationSettings()
        if (settings && settings.enabled) {
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          const sup = wx.getStorageSync('suppressed_notifications_today') || {}
          const suppressed = sup && sup.date === todayKey && !!sup.health_alert
          const existing = nm.getLocalNotifications() || []
          const exists = (title) => existing.some(n => n && n.type === 'health_alert' && n.title === title && typeof n.createdAt === 'string' && n.createdAt.startsWith(todayKey))
          filtered.slice(0, 20).forEach(a => {
            const t = a.title || '健康提醒'
            const d = a.description || ''
            if (!suppressed && !exists(t)) {
              nm.addLocalNotification('health_alert', t, d, '', '', { route: '/pages/health-alerts/health-alerts' })
            }
          })
        }
      } catch (_) {}
    } catch (error) {
      console.error('加载全部健康提醒失败:', error)
      this.setData({ alerts: [] })
    }
  },

  handleIconError(e) {
    try {
      const keyPath = e.currentTarget.dataset.key
      if (!keyPath) return
      const current = this.data.iconPaths || {}
      const next = JSON.parse(JSON.stringify(current))
      const setByPath = (obj, path, value) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i]
          if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
          cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
      }
      const getByPath = (obj, path) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length; i++) {
          cur = cur[parts[i]]
          if (cur === undefined || cur === null) return null
        }
        return cur
      }
      const replaceExt = (p, toExt) => {
        if (!p || typeof p !== 'string') return p
        return p.replace(/\.(png|svg)$/i, `.${toExt}`)
      }
      const curVal = getByPath(next, keyPath)
      if (typeof curVal === 'string') {
        setByPath(next, keyPath, replaceExt(curVal, 'svg'))
        this.setData({ iconPaths: next })
      }
    } catch (_) {}
  },

  handleAlertTap(e) {
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
      const type = ds.type || ''
      const eggId = ds.eggId || ''
      if (type === 'care_general_topic') {
        wx.navigateTo({ url: '/pages/care-guide/care-guide?tab=general' })
        return
      }
      if (type === 'chick_care') {
        wx.navigateTo({ url: '/pages/care-guide/care-guide?tab=chick_0_45' })
        return
      }
      if (type === 'incubation_advice') {
        const url = eggId ? `/pages/incubation/detail/detail?id=${encodeURIComponent(eggId)}` : '/pages/incubation/index'
        wx.navigateTo({ url })
        return
      }
      if (type === 'feeding_gap' || type === 'feeding_frequency_low') {
        wx.navigateTo({ url: '/pages/records/feeding/feeding' })
        return
      }
      wx.navigateTo({ url: '/pages/records/health/health' })
    } catch (_) {}
  }
  ,
  getTodayKey() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  },
  getDismissedSet(todayKey) {
    try {
      const list = wx.getStorageSync(`dismissedHealthAlerts_${todayKey}`) || []
      return new Set(Array.isArray(list) ? list : [])
    } catch (_) { return new Set() }
  },
  addDismissedId(id) {
    if (!id) return
    const key = this.getTodayKey()
    try {
      const list = wx.getStorageSync(`dismissedHealthAlerts_${key}`) || []
      const next = Array.isArray(list) ? list.slice() : []
      if (!next.includes(id)) next.push(id)
      wx.setStorageSync(`dismissedHealthAlerts_${key}`, next)
    } catch (_) {}
  },
  
  deleteAlert(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    if (!id) return
    this.addDismissedId(id)
    const todayKey = this.getTodayKey()
    const dismissed = this.getDismissedSet(todayKey)
    const remaining = (this.data.alerts || []).filter(a => a.id !== id)
    this.setData({ alerts: remaining, alertsCount: remaining.length })
  }
  ,
  getPinnedSet(todayKey) {
    try {
      const list = wx.getStorageSync(`pinnedHealthAlertTypes_${todayKey}`) || []
      return new Set(Array.isArray(list) ? list : [])
    } catch (_) { return new Set() }
  },
  addPinnedId(type) {
    if (!type) return
    const key = this.getTodayKey()
    try {
      const list = wx.getStorageSync(`pinnedHealthAlertTypes_${key}`) || []
      const next = Array.isArray(list) ? list.slice() : []
      if (!next.includes(type)) next.push(type)
      wx.setStorageSync(`pinnedHealthAlertTypes_${key}`, next)
    } catch (_) {}
  },
  removePinnedId(type) {
    if (!type) return
    const key = this.getTodayKey()
    try {
      const list = wx.getStorageSync(`pinnedHealthAlertTypes_${key}`) || []
      const next = (Array.isArray(list) ? list : []).filter(x => x !== type)
      wx.setStorageSync(`pinnedHealthAlertTypes_${key}`, next)
    } catch (_) {}
  },
  onAlertLongPress(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
    const id = ds.id || ''
    const type = ds.type || ''
    if (!id) return
    const todayKey = this.getTodayKey()
    const pinned = this.getPinnedSet(todayKey)
    const isPinned = pinned.has(type)
    const itemList = [isPinned ? '取消置顶' : '置顶', '不再提醒', '删除']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const idx = res.tapIndex
        if (idx === 0) {
          if (isPinned) this.removePinnedId(type); else this.addPinnedId(type)
          this.loadAllHealthAlerts()
        } else if (idx === 1) {
          try {
            const nm = app.globalData.notificationManager
            const settings = nm.getNotificationSettings()
            const prefs = { ...(settings.healthAlertPreferences || {}) }
            if (type) prefs[type] = false
            const nextSettings = { ...settings, healthAlertPreferences: prefs }
            nm.saveNotificationSettings(nextSettings)
            try {
              app.request({
                url: '/api/reminders/settings',
                method: 'PUT',
                data: {
                  enabled: !!nextSettings.enabled,
                  feedingReminder: !!nextSettings.feedingReminder,
                  healthReminder: !!nextSettings.healthReminder,
                  cleaningReminder: !!nextSettings.cleaningReminder,
                  medicationReminder: !!nextSettings.medicationReminder,
                  breedingReminder: !!nextSettings.breedingReminder,
                  feedingReminderTime: nextSettings.feedingReminderTime || null,
                  cleaningReminderTime: nextSettings.cleaningReminderTime || null,
                  medicationReminderTime: nextSettings.medicationReminderTime || null,
                  healthAlertPreferences: prefs
                }
              }).then(()=>{}).catch(()=>{})
            } catch (_) {}
          } catch (_) {}
          this.loadAllHealthAlerts()
        } else if (idx === 2) {
          this.deleteAlert({ currentTarget: { dataset: { id } } })
        }
      }
    })
  }
})
