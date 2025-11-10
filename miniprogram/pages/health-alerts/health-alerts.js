const app = getApp()

Page({
  data: {
    alerts: []
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

      alerts.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))

      this.setData({ alerts })
    } catch (error) {
      console.error('加载全部健康提醒失败:', error)
      this.setData({ alerts: [] })
    }
  }
})
