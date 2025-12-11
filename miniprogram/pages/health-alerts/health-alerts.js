const app = getApp()
const chickCare = require('../../utils/chick-care.js')

Page({
  data: {
    alerts: [],
    iconPaths: {
      alertInfoLow: '/images/remix/ri-information-fill-blue.png',
      alertInfoMedium: '/images/remix/ri-information-fill-amber.png',
      alertInfoHigh: '/images/remix/ri-information-fill-red.png'
    }
  },

  onLoad() {
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
        if (d >= 1 && d <= 30) {
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
              const start = new Date(String(startStr).replace(/-/g,'/').replace('T',' '))
              if (!isNaN(start.getTime())) {
                const todayMid = new Date(`${todayStr}T00:00:00`)
                const di = Math.floor((todayMid.getTime() - start.getTime())/86400000) + 1
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

      const all = careAlerts.concat(incubationAlerts).concat(alerts)
      all.sort((a, b) => {
        const wa = a.type === 'chick_care' ? 3 : (severityOrder[a.severity] || 0)
        const wb = b.type === 'chick_care' ? 3 : (severityOrder[b.severity] || 0)
        return wb - wa
      })

      this.setData({ alerts: all })

      try {
        const nm = app.globalData.notificationManager
        const settings = nm.getNotificationSettings()
        if (settings && settings.enabled) {
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          const existing = nm.getLocalNotifications() || []
          const exists = (title) => existing.some(n => n && n.type === 'health_alert' && n.title === title && typeof n.createdAt === 'string' && n.createdAt.startsWith(todayKey))
          all.slice(0, 20).forEach(a => {
            const t = a.title || '健康提醒'
            const d = a.description || ''
            if (!exists(t)) {
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
  }
})
