// pages/statistics/weight-fullscreen/weight-fullscreen.js
Page({
  data: {
    // 传入的数据
    weightSeries: [],
    selectedParrotId: null,
    // 体重趋势颜色：12种高对比色（与统计页一致）
    weightColors: ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC'],
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
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series.slice(0, 12)
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

      const colorPalette = this.data.weightColors || ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
      const tapAreas = []

      // 折线与填充（使用单调三次样条，去除交点绘制）
      displaySeries.forEach((s, idx) => {
        const validPoints = (s.points || []).filter(p => p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
        if (!validPoints.length) return
        const color = colorPalette[idx % colorPalette.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 2
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
          const n = points.length
          const xs = points.map(p => p.x)
          const ys = points.map(p => p.y)
          const dxArr = new Array(n - 1)
          const mArr = new Array(n - 1)
          for (let i = 0; i < n - 1; i++) {
            const dx = xs[i + 1] - xs[i]
            dxArr[i] = dx
            mArr[i] = dx !== 0 ? ((ys[i + 1] - ys[i]) / dx) : 0
          }
          const tArr = new Array(n)
          tArr[0] = mArr[0]
          tArr[n - 1] = mArr[n - 2]
          for (let i = 1; i <= n - 2; i++) {
            const m0 = mArr[i - 1]
            const m1 = mArr[i]
            if (m0 * m1 <= 0) {
              tArr[i] = 0
            } else {
              const dx0 = dxArr[i - 1]
              const dx1 = dxArr[i]
              tArr[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1))
            }
          }
          for (let i = 0; i < n - 1; i++) {
            const x0 = xs[i], y0 = ys[i]
            const x1 = xs[i + 1], y1 = ys[i + 1]
            const dx = dxArr[i]
            const cp1x = x0 + dx / 3
            const cp1y = y0 + tArr[i] * dx / 3
            const cp2x = x1 - dx / 3
            const cp2y = y1 - tArr[i + 1] * dx / 3
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
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
          const n2 = points.length
          const xs2 = points.map(p => p.x)
          const ys2 = points.map(p => p.y)
          const dx2 = new Array(n2 - 1)
          const m2 = new Array(n2 - 1)
          for (let i = 0; i < n2 - 1; i++) {
            const dx = xs2[i + 1] - xs2[i]
            dx2[i] = dx
            m2[i] = dx !== 0 ? ((ys2[i + 1] - ys2[i]) / dx) : 0
          }
          const t2 = new Array(n2)
          t2[0] = m2[0]
          t2[n2 - 1] = m2[n2 - 2]
          for (let i = 1; i <= n2 - 2; i++) {
            const m0 = m2[i - 1]
            const m1 = m2[i]
            if (m0 * m1 <= 0) {
              t2[i] = 0
            } else {
              const dx0 = dx2[i - 1]
              const dx1 = dx2[i]
              t2[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1))
            }
          }
          for (let i = 0; i < n2 - 1; i++) {
            const x0 = xs2[i], y0 = ys2[i]
            const x1 = xs2[i + 1], y1 = ys2[i + 1]
            const dx = dx2[i]
            const cp1x = x0 + dx / 3
            const cp1y = y0 + t2[i] * dx / 3
            const cp2x = x1 - dx / 3
            const cp2y = y1 - t2[i + 1] * dx / 3
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
          }
          ctx.stroke()
        }

        // 不绘制交点，仅计算交互用的点位
        validPoints.forEach(p => {
          const xIndex = dates.indexOf(p.date)
          if (xIndex === -1) return
          let x = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (xIndex / (dates.length - 1)) * chartW)
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          if (!this.weightTapAreas) this.weightTapAreas = []
          this.weightTapAreas.push({ x, y, radius: 10, weight: p.weight, date: p.date, parrot_name: s.parrot_name, color })
        })
      })

      // 单指移动竖向指示与多项标签（与统计页一致）
      if (typeof this._activeGuideX === 'number') {
        let gx = this._activeGuideX
        if (gx < paddingLeft) gx = paddingLeft
        if (gx > paddingLeft + chartW) gx = paddingLeft + chartW
        let guideIdx = 0
        let guideXPos
        if (dates.length === 1) {
          guideIdx = 0
          guideXPos = paddingLeft + chartW / 2
        } else {
          const ratio = (gx - paddingLeft) / chartW
          guideIdx = Math.round(ratio * (dates.length - 1))
          guideXPos = paddingLeft + (guideIdx / (dates.length - 1)) * chartW
        }
        ctx.save()
        ctx.strokeStyle = '#9CA3AF'
        ctx.lineWidth = 1
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(guideXPos, paddingTop)
        ctx.lineTo(guideXPos, height - paddingBottom)
        ctx.stroke()
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])
        ctx.restore()

        const dateSel = dates[guideIdx]
        const items = []
        displaySeries.forEach((s, idx) => {
          const p = (s.points || []).find(pt => pt && pt.date === dateSel && typeof pt.weight === 'number' && !isNaN(pt.weight) && pt.weight > 0)
          if (!p) return
          const norm = (p.weight - minW) / (maxW - minW)
          if (!isFinite(norm) || isNaN(norm)) return
          const y = paddingTop + (1 - norm) * chartH
          const color = colorPalette[idx % colorPalette.length]
          // 空心圆指示
          ctx.save()
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(guideXPos, y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.restore()
          items.push({ text: (s.parrot_name || '') + ' ' + p.weight.toFixed(1) + 'g', color })
        })

        if (items.length > 0) {
          const headerText = dateSel || ''
          ctx.font = '12px sans-serif'
          const headerW = ctx.measureText(headerText).width
          ctx.font = '11px sans-serif'
          let maxItemW = 0
          items.forEach(it => { maxItemW = Math.max(maxItemW, ctx.measureText(it.text).width) })
          const dotW = 10
          const paddingX = 8
          const paddingY = 6
          const lineGap = 4
          const headerH = 16
          const itemH = 14
          const contentW = Math.max(headerW, dotW + maxItemW)
          const boxW = contentW + paddingX * 2
          const boxH = headerH + lineGap + items.length * itemH + paddingY * 2
          const margin = 8
          let boxX
          if (guideXPos < width / 2) {
            boxX = guideXPos + margin
            if (boxX + boxW > width - 8) boxX = width - 8 - boxW
          } else {
            boxX = guideXPos - margin - boxW
            if (boxX < 8) boxX = 8
          }
          let boxY = paddingTop + 8
          if (boxY + boxH > height - paddingBottom - 8) boxY = height - paddingBottom - 8 - boxH

          ctx.save()
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
          const r = 6
          ctx.beginPath()
          ctx.moveTo(boxX + r, boxY)
          ctx.lineTo(boxX + boxW - r, boxY)
          ctx.arc(boxX + boxW - r, boxY + r, r, -Math.PI / 2, 0)
          ctx.lineTo(boxX + boxW, boxY + boxH - r)
          ctx.arc(boxX + boxW - r, boxY + boxH - r, r, 0, Math.PI / 2)
          ctx.lineTo(boxX + r, boxY + boxH)
          ctx.arc(boxX + r, boxY + boxH - r, r, Math.PI / 2, Math.PI)
          ctx.lineTo(boxX, boxY + r)
          ctx.arc(boxX + r, boxY + r, r, Math.PI, Math.PI * 3 / 2)
          ctx.fill()
          ctx.restore()

          ctx.save()
          ctx.fillStyle = '#111827'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.font = '12px sans-serif'
          ctx.fillText(headerText, boxX + paddingX, boxY + paddingY)
          ctx.restore()

          let curY = boxY + paddingY + headerH + lineGap
          items.forEach(it => {
            ctx.save()
            ctx.fillStyle = it.color
            ctx.beginPath()
            ctx.arc(boxX + paddingX + 3, curY + itemH / 2, 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#111827'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = '11px sans-serif'
            ctx.fillText(it.text, boxX + paddingX + dotW, curY + itemH / 2)
            ctx.restore()
            curY += itemH
          })
        }
      }
    })
  },

  // 根据当前显示系列生成图例
  updateLegend() {
    const series = this.data.weightSeries || []
    const selectedId = this.data.selectedParrotId
    const displaySeries = selectedId ? series.filter(s => String(s.parrot_id) === String(selectedId)) : series.slice(0, 12)
    const palette = this.data.weightColors || ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
    const legend = (displaySeries || []).map((s, idx) => ({
      parrot_id: s.parrot_id,
      parrot_name: s.parrot_name,
      color: palette[idx % palette.length]
    }))
    this.setData({ weightLegend: legend })
  },

  // 点击命中判断
  onFsTouchStart(e) { this._updateFsGuide(e) },
  onFsTouchMove(e) { this._updateFsGuide(e) },
  onFsTouchEnd(e) {},
  _updateFsGuide(e) {
    const query = wx.createSelectorQuery()
    query.select('#weightFullscreenCanvas').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect) return
      this.fullRect = rect
      let relX = null
      if (e && e.touches && e.touches[0]) {
        const t = e.touches[0]
        if (typeof t.x === 'number') relX = t.x
        else if (typeof t.pageX === 'number') relX = t.pageX - rect.left
        else if (typeof t.clientX === 'number') relX = t.clientX - rect.left
      } else if (e && e.changedTouches && e.changedTouches[0]) {
        const t = e.changedTouches[0]
        if (typeof t.x === 'number') relX = t.x
        else if (typeof t.pageX === 'number') relX = t.pageX - rect.left
        else if (typeof t.clientX === 'number') relX = t.clientX - rect.left
      } else if (e && e.detail && typeof e.detail.x === 'number') {
        relX = e.detail.x
      } else if (e && e.detail && typeof e.detail.clientX === 'number') {
        relX = e.detail.clientX - rect.left
      }
      if (typeof relX !== 'number') return
      this._activeGuideX = relX
      this.setData({ activeWeightPoint: null }, () => this.drawChart())
    })
  },
  onShareAppMessage() {
    const title = '体重趋势 - 鹦鹉管家AI'
    return {
      title,
      path: '/pages/statistics/weight-fullscreen/weight-fullscreen'
    }
  },
  onShareTimeline() {
    return {
      title: '体重趋势 - 鹦鹉管家AI'
    }
  }
})
