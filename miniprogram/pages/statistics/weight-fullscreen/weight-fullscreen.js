// pages/statistics/weight-fullscreen/weight-fullscreen.js
Page({
  data: {
    // 传入的数据
    weightSeries: [],
    selectedParrotId: null,
    weightColors: ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22'],
    weightLegend: [],
    weightStartDate: '',
    weightEndDate: '',
    // 交互与显示
    activeWeightPoint: null,
    weightAvgChart: '',
  },

  onLoad(options) {
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (channel && channel.on) {
      channel.on('weightData', (payload) => {
        this.setData({
          weightSeries: payload.weightSeries || [],
          selectedParrotId: payload.selectedParrotId || null,
          weightColors: payload.weightColors || this.data.weightColors,
          weightLegend: payload.weightLegend || [],
          weightStartDate: payload.weightStartDate || '',
          weightEndDate: payload.weightEndDate || '',
        }, () => {
          this.updateLegend()
          this.drawChart()
        })
      })
    } else {
      // 无传入数据时，显示占位
      this.updateLegend()
      this.drawChart()
    }
  },

  onShow() {
    // 进入页面时尝试绘图（确保节点已渲染）
    setTimeout(() => this.drawChart(), 0)
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  // 横屏全屏绘图
  drawChart() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series
    const hasRange = !!(this.data.weightStartDate && this.data.weightEndDate)
    const rangeStart = this.data.weightStartDate
    const rangeEnd = this.data.weightEndDate

    const query = wx.createSelectorQuery()
    query.select('#weightFullscreenCanvas').node()
    query.select('#weightFullscreenCanvas').boundingClientRect()
    query.exec(res => {
      const nodeRes = res && res[0]
      const rect = res && res[1]
      if (!nodeRes || !nodeRes.node || !rect) return
      this.fullRect = rect
      const canvas = nodeRes.node
      const width = rect.width || 800
      const height = rect.height || 480
      const ctx = canvas.getContext('2d')
      const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || {}
      const dpr = winInfo.pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // 清空
      ctx.clearRect(0, 0, width, height)

      if (!displaySeries.length) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '16px sans-serif'
        ctx.fillText('暂无体重数据', width / 2, height / 2)
        this.setData({ weightAvgChart: '--' })
        return
      }

      const allPoints = []
      displaySeries.forEach(s => {
        (s.points || []).forEach(p => {
          if (p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0) {
            if (hasRange) {
              const d = p.date
              if (d && d >= rangeStart && d <= rangeEnd) allPoints.push(p)
            } else {
              allPoints.push(p)
            }
          }
        })
      })

      if (allPoints.length === 0) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '16px sans-serif'
        ctx.fillText('暂无有效体重数据', width / 2, height / 2)
        this.setData({ weightAvgChart: '--' })
        return
      }

      const dates = Array.from(new Set(allPoints.map(p => p.date))).sort()
      const weights = allPoints.map(p => p.weight)
      let minW = Math.min(...weights)
      let maxW = Math.max(...weights)
      if (!isFinite(minW) || !isFinite(maxW) || isNaN(minW) || isNaN(maxW)) {
        ctx.fillStyle = '#999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '16px sans-serif'
        ctx.fillText('体重数据异常', width / 2, height / 2)
        this.setData({ weightAvgChart: '--' })
        return
      }
      if (maxW === minW) { minW = Math.max(0, minW - 1); maxW = maxW + 1 }

      // 平均体重
      const sumW = weights.reduce((s, v) => s + (typeof v === 'number' && !isNaN(v) ? v : 0), 0)
      const avgWStr = weights.length > 0 ? (Math.round(sumW / weights.length) + 'g') : '--'
      this.setData({ weightAvgChart: avgWStr })

      // 边距适配横屏
      const paddingLeft = 68
      const paddingRight = 32
      const paddingTop = 28
      const paddingBottom = 56
      const chartW = width - paddingLeft - paddingRight
      const chartH = height - paddingTop - paddingBottom

      // 坐标轴与网格
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(width - paddingRight, height - paddingBottom)
      ctx.moveTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(paddingLeft, paddingTop)
      ctx.stroke()

      // 纵轴刻度
      const yTicks = 5
      ctx.fillStyle = '#9ca3af'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let i = 0; i <= yTicks; i++) {
        const t = i / yTicks
        const value = minW + t * (maxW - minW)
        const y = paddingTop + (1 - t) * chartH
        ctx.strokeStyle = '#111827'
        ctx.beginPath()
        ctx.moveTo(paddingLeft, y)
        ctx.lineTo(width - paddingRight, y)
        ctx.stroke()
        ctx.fillStyle = '#9ca3af'
        const displayValue = isFinite(value) && !isNaN(value) ? value.toFixed(1) : '0.0'
        ctx.fillText(displayValue, paddingLeft - 8, y)
      }

      // 横轴日期标签（最多8个）
      const maxXTicks = Math.min(8, dates.length)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let i = 0; i < maxXTicks; i++) {
        let idx, x
        if (dates.length === 1) { idx = 0; x = paddingLeft + chartW / 2 }
        else { idx = Math.round((i / (maxXTicks - 1)) * (dates.length - 1)); x = paddingLeft + (idx / (dates.length - 1)) * chartW }
        const d = new Date(dates[idx])
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        const y = height - paddingBottom
        ctx.strokeStyle = '#111827'
        ctx.beginPath()
        ctx.moveTo(x, paddingTop)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.fillStyle = '#9ca3af'
        ctx.fillText(label, x, y + 6)
      }

      const colorPalette = this.data.weightColors || ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22']
      const tapAreas = []

      // 折线与填充
      displaySeries.forEach((s, idx) => {
        const validPoints = (s.points || []).filter(p => p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
        if (!validPoints.length) return
        const color = colorPalette[idx % colorPalette.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const points = []
        validPoints.forEach(p => {
          const xIndex = dates.indexOf(p.date)
          if (xIndex === -1) return
          let x = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (xIndex / (dates.length - 1)) * chartW)
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          points.push({ x, y })
        })

        if (points.length > 1) {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1]
            const currentPoint = points[i]
            if (i === 1) {
              const controlX = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
              const controlY = prevPoint.y
              ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y)
            } else {
              const prevPrevPoint = points[i - 2]
              const nextPoint = i < points.length - 1 ? points[i + 1] : currentPoint
              const tension = 0.3
              const cp1x = prevPoint.x + (currentPoint.x - prevPrevPoint.x) * tension
              const cp1y = prevPoint.y + (currentPoint.y - prevPrevPoint.y) * tension
              const cp2x = currentPoint.x - (nextPoint.x - prevPoint.x) * tension
              const cp2y = currentPoint.y - (nextPoint.y - prevPoint.y) * tension
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y)
            }
          }
          const lastPoint = points[points.length - 1]
          const firstPoint = points[0]
          const bottomY = height - paddingBottom
          ctx.lineTo(lastPoint.x, bottomY)
          ctx.lineTo(firstPoint.x, bottomY)
          ctx.closePath()
          const gradient = ctx.createLinearGradient(0, paddingTop, 0, bottomY)
          const rgbMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 16)
            const g = parseInt(rgbMatch[2], 16)
            const b = parseInt(rgbMatch[3], 16)
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`)
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`)
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`)
          } else {
            gradient.addColorStop(0, color + '40')
            gradient.addColorStop(0.7, color + '1A')
            gradient.addColorStop(1, color + '05')
          }
          ctx.fillStyle = gradient
          ctx.fill()
          ctx.restore()

          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1]
            const currentPoint = points[i]
            if (i === 1) {
              const controlX = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
              const controlY = prevPoint.y
              ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y)
            } else {
              const prevPrevPoint = points[i - 2]
              const nextPoint = i < points.length - 1 ? points[i + 1] : currentPoint
              const tension = 0.3
              const cp1x = prevPoint.x + (currentPoint.x - prevPrevPoint.x) * tension
              const cp1y = prevPoint.y + (currentPoint.y - prevPrevPoint.y) * tension
              const cp2x = currentPoint.x - (nextPoint.x - prevPoint.x) * tension
              const cp2y = currentPoint.y - (nextPoint.y - prevPoint.y) * tension
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y)
            }
          }
          ctx.stroke()
        }

        // 点与点击区域
        ctx.fillStyle = color
        validPoints.forEach(p => {
          const xIndex = dates.indexOf(p.date)
          if (xIndex === -1) return
          let x = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (xIndex / (dates.length - 1)) * chartW)
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          ctx.shadowColor = color
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          if (!this.weightTapAreas) this.weightTapAreas = []
          this.weightTapAreas.push({ x, y, radius: 14, weight: p.weight, date: p.date, parrot_name: s.parrot_name, color })
        })
      })

      // 高亮标签
      const active = this.data.activeWeightPoint
      if (active && typeof active.x === 'number' && typeof active.y === 'number') {
        ctx.save()
        ctx.lineWidth = 2
        ctx.strokeStyle = active.color || '#333'
        ctx.beginPath()
        ctx.arc(active.x, active.y, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        const label = (typeof active.weight === 'number' && !isNaN(active.weight)) ? (Math.round(active.weight) + 'g') : '--'
        ctx.font = '14px sans-serif'
        const textW = ctx.measureText(label).width
        const paddingX = 8
        const paddingY = 6
        const boxW = textW + paddingX * 2
        const boxH = 24
        let boxX = active.x - boxW / 2
        let boxY = active.y - 12 - boxH
        if (boxX < 8) boxX = 8
        if (boxX + boxW > width - 8) boxX = width - 8 - boxW
        if (boxY < paddingTop + 4) boxY = active.y + 12
        ctx.save()
        ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'
        ctx.beginPath()
        ctx.rect(boxX, boxY, boxW, boxH)
        ctx.fill()
        ctx.restore()
        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2)
        ctx.restore()
      }
    })
  },

  // 根据当前显示系列生成图例
  updateLegend() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series
    const palette = this.data.weightColors || ['#667eea', '#764ba2', '#4CAF50', '#ff7f50', '#3498db', '#e67e22']
    const legend = (displaySeries || []).map((s, idx) => ({
      parrot_id: s.parrot_id,
      parrot_name: s.parrot_name,
      color: palette[idx % palette.length]
    }))
    this.setData({ weightLegend: legend })
  },

  // 点击命中判断
  onCanvasTap(e) {
    const areas = this.weightTapAreas || []
    if (!areas.length) return

    const query = wx.createSelectorQuery()
    query.select('#weightFullscreenCanvas').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect) return
      this.fullRect = rect

      const getCoordCandidates = (evt) => {
        const cands = []
        if (evt && evt.touches && evt.touches[0]) {
          const t = evt.touches[0]
          if (typeof t.x === 'number' && typeof t.y === 'number') cands.push({ x: t.x, y: t.y })
          if (typeof t.pageX === 'number' && typeof t.pageY === 'number') cands.push({ x: t.pageX - rect.left, y: t.pageY - rect.top })
          if (typeof t.clientX === 'number' && typeof t.clientY === 'number') cands.push({ x: t.clientX - rect.left, y: t.clientY - rect.top })
        }
        if (evt && evt.changedTouches && evt.changedTouches[0]) {
          const t = evt.changedTouches[0]
          if (typeof t.x === 'number' && typeof t.y === 'number') cands.push({ x: t.x, y: t.y })
          if (typeof t.pageX === 'number' && typeof t.pageY === 'number') cands.push({ x: t.pageX - rect.left, y: t.pageY - rect.top })
          if (typeof t.clientX === 'number' && typeof t.clientY === 'number') cands.push({ x: t.clientX - rect.left, y: t.clientY - rect.top })
        }
        if (evt && evt.detail) {
          if (typeof evt.detail.x === 'number' && typeof evt.detail.y === 'number') cands.push({ x: evt.detail.x, y: evt.detail.y })
          if (typeof evt.detail.clientX === 'number' && typeof evt.detail.clientY === 'number') cands.push({ x: evt.detail.clientX - rect.left, y: evt.detail.clientY - rect.top })
        }
        return cands
      }
      const candidates = getCoordCandidates(e)
      if (!candidates.length) return

      let hit = null
      for (let k = 0; k < candidates.length && !hit; k++) {
        const relX = candidates[k].x
        const relY = candidates[k].y
        for (let i = 0; i < areas.length; i++) {
          const a = areas[i]
          const dx = relX - a.x
          const dy = relY - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= (a.radius || 16)) { hit = a; break }
        }
      }

      if (hit) {
        this.setData({ activeWeightPoint: hit }, () => this.drawChart())
      } else {
        this.setData({ activeWeightPoint: null }, () => this.drawChart())
      }
    })
  },
  onShareAppMessage() {
    const title = '体重趋势曲线 - 鹦鹉管家AI'
    return {
      title,
      path: '/pages/statistics/weight-fullscreen/weight-fullscreen'
    }
  },
  onShareTimeline() {
    return {
      title: '体重趋势曲线 - 鹦鹉管家AI'
    }
  }
})
