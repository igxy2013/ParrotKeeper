Component({
  properties: {
    // series：[{ parrot_id, parrot_name, points: [{date, weight}]}]
    series: {
      type: Array,
      value: []
    }
  },
  data: {
    displaySeries: [],
    selectedParrotId: null,
    selectedParrotName: '',
    showParrotDropdown: false,
    weightAvgChart: ''
  },
  lifetimes: {
    attached() {
      this.prepareDisplaySeries()
      this.draw()
    }
  },
  observers: {
    'series': function() { 
      this.prepareDisplaySeries()
      this.draw() 
    }
  },
  methods: {
    onTap() {
      wx.navigateTo({ url: '/pages/statistics/statistics' })
    },
    palette(i) {
      // 与统计页的颜色保持一致（12种）
      const colors = ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']
      return colors[i % colors.length]
    },
  prepareDisplaySeries() {
      const src = Array.isArray(this.data.series) ? this.data.series : []
      const selectedId = this.data.selectedParrotId
      let filtered = selectedId ? src.filter(s => String(s.parrot_id) === String(selectedId)) : src
      // 默认最多显示12只鹦鹉
      if (!selectedId && Array.isArray(filtered)) filtered = filtered.slice(0, 12)
      const display = filtered.map((s, i) => ({
        parrot_id: s.parrot_id,
        parrot_name: s.parrot_name,
        color: this.palette(i),
        points: (Array.isArray(s.points) ? s.points : []).slice().sort((a,b) => (a.date > b.date ? 1 : -1))
      }))
      // 计算平均体重（当前选择下所有点）
      let weights = []
      for (let i = 0; i < display.length; i++) {
        const pts = Array.isArray(display[i].points) ? display[i].points : []
        for (let j = 0; j < pts.length; j++) {
          const w = pts[j] && pts[j].weight
          if (typeof w === 'number' && !isNaN(w) && w > 0) weights.push(w)
        }
      }
      let avgStr = '--'
      if (weights.length > 0) {
        let sum = 0
        for (let k = 0; k < weights.length; k++) sum += weights[k]
        avgStr = Number(sum / weights.length).toFixed(1) + 'g'
      }
      this.setData({ displaySeries: display, weightAvgChart: avgStr })
    },
    toggleParrotDropdown(e) {
      // 防止冒泡到卡片
      if (e && e.stopPropagation) e.stopPropagation()
      this.setData({ showParrotDropdown: !this.data.showParrotDropdown })
    },
    selectParrot(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      const id = e.currentTarget && (e.currentTarget.dataset && e.currentTarget.dataset.id)
      const name = e.currentTarget && (e.currentTarget.dataset && e.currentTarget.dataset.name)
      const selectedId = id ? String(id) : ''
      this.setData({
        selectedParrotId: selectedId || null,
        selectedParrotName: name || '' ,
        showParrotDropdown: false
      }, () => {
        this.prepareDisplaySeries()
        this.draw()
      })
    },
    draw() {
      const series = Array.isArray(this.data.displaySeries) ? this.data.displaySeries : []
      const query = wx.createSelectorQuery().in(this)
      query.select('#homeWeightCanvas').fields({ node: true, size: true }).exec(res => {
        const canvasNode = res && res[0] && res[0].node
        const width = res && res[0] && res[0].width
        const height = res && res[0] && res[0].height
        if (!canvasNode || !width || !height) return

        const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || wx.getSystemInfoSync().pixelRatio || 1
        canvasNode.width = Math.floor(width * dpr)
        canvasNode.height = Math.floor(height * dpr)
        const ctx = canvasNode.getContext('2d')
        ctx.scale(dpr, dpr)

        // 背景与清空
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // 无数据提示与早退
        const hasSeries = Array.isArray(series) && series.length > 0
        if (!hasSeries) {
          ctx.fillStyle = '#999'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '14px sans-serif'
          ctx.fillText('暂无体重数据', width / 2, height / 2)
          return
        }

        // 收集所有有效点与日期
        const allPoints = []
        const dateSet = new Set()
        for (const s of series) {
          const pts = Array.isArray(s.points) ? s.points : []
          for (const p of pts) {
            if (p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0 && p.date) {
              allPoints.push(p)
              dateSet.add(p.date)
            }
          }
        }

        if (!allPoints.length) {
          ctx.fillStyle = '#999'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '14px sans-serif'
          ctx.fillText('暂无有效体重数据', width / 2, height / 2)
          return
        }

        const dates = Array.from(dateSet).sort()
        const weights = allPoints.map(p => p.weight)
        let minW = Math.min(...weights)
        let maxW = Math.max(...weights)
        if (!isFinite(minW) || !isFinite(maxW) || isNaN(minW) || isNaN(maxW)) {
          ctx.fillStyle = '#999'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '14px sans-serif'
          ctx.fillText('体重数据异常', width / 2, height / 2)
          return
        }
        if (maxW === minW) {
          minW = Math.max(0, minW - 1)
          maxW = maxW + 1
        }

        // 坐标系统与与统计页保持一致的边距
        const paddingLeft = 48
        const paddingRight = 18
        const paddingTop = 18
        const paddingBottom = 36
        const chartW = width - paddingLeft - paddingRight
        const chartH = height - paddingTop - paddingBottom

        // 坐标轴
        ctx.strokeStyle = '#ddd'
        ctx.lineWidth = 1
        ctx.beginPath()
        // X轴
        ctx.moveTo(paddingLeft, height - paddingBottom)
        ctx.lineTo(width - paddingRight, height - paddingBottom)
        // Y轴
        ctx.moveTo(paddingLeft, height - paddingBottom)
        ctx.lineTo(paddingLeft, paddingTop)
        ctx.stroke()

        // 纵轴刻度与标签（4等分，含网格线）
        const yTicks = 4
        ctx.fillStyle = '#666'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (let i = 0; i <= yTicks; i++) {
          const t = i / yTicks
          const value = minW + t * (maxW - minW)
          const y = paddingTop + (1 - t) * chartH
          // 网格线
          ctx.strokeStyle = '#eee'
          ctx.beginPath()
          ctx.moveTo(paddingLeft, y)
          ctx.lineTo(width - paddingRight, y)
          ctx.stroke()
          // 文本标签
          ctx.fillStyle = '#666'
          const displayValue = isFinite(value) && !isNaN(value) ? value.toFixed(1) : '0.0'
          ctx.fillText(displayValue, paddingLeft - 6, y)
        }

        // 横轴刻度与日期标签（最多6个均匀采样）
        const maxXTicks = Math.min(6, dates.length)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        for (let i = 0; i < maxXTicks; i++) {
          let idx, x
          if (dates.length === 1) {
            idx = 0
            x = paddingLeft + chartW / 2
          } else {
            idx = Math.round((i / (maxXTicks - 1)) * (dates.length - 1))
            x = paddingLeft + (idx / (dates.length - 1)) * chartW
          }
          const d = new Date(dates[idx])
          const label = `${d.getMonth() + 1}/${d.getDate()}`
          const y = height - paddingBottom
          // 刻度线
          ctx.strokeStyle = '#eee'
          ctx.beginPath()
          ctx.moveTo(x, paddingTop)
          ctx.lineTo(x, y)
          ctx.stroke()
          // 标签
          ctx.fillStyle = '#666'
          ctx.fillText(label, x, y + 4)
        }

        // 折线绘制与填充（平滑曲线），样式与统计页一致
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        const lineWidth = 2
        for (let si = 0; si < series.length; si++) {
          const s = series[si]
          const rawPoints = (Array.isArray(s.points) ? s.points : [])
            .filter(p => p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0)
            .sort((a,b) => a.date.localeCompare(b.date))
          if (!rawPoints.length) continue

          // 计算画布坐标点
          const points = []
          for (let i = 0; i < rawPoints.length; i++) {
            const xIndex = dates.indexOf(rawPoints[i].date)
            if (xIndex === -1) continue
            const x = (dates.length === 1)
              ? paddingLeft + chartW / 2
              : paddingLeft + (xIndex / (dates.length - 1)) * chartW
            const norm = (rawPoints[i].weight - minW) / (maxW - minW)
            if (!isFinite(norm) || isNaN(norm)) continue
            const y = paddingTop + (1 - norm) * chartH
            points.push({ x, y })
          }
          if (points.length < 2) {
            continue
          }

          // 先绘制填充区域（使用平滑曲线）
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
          const rgbMatch = s.color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 16)
            const g = parseInt(rgbMatch[2], 16)
            const b = parseInt(rgbMatch[3], 16)
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`) // 顶部25%
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`) // 中部10%
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`) // 底部2%
          } else {
            gradient.addColorStop(0, s.color + '40')
            gradient.addColorStop(0.7, s.color + '1A')
            gradient.addColorStop(1, s.color + '05')
          }
          ctx.fillStyle = gradient
          ctx.fill()
          ctx.restore()

          // 再绘制平滑曲线描边
          ctx.strokeStyle = s.color
          ctx.lineWidth = lineWidth
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
      })
    }
  }
})
