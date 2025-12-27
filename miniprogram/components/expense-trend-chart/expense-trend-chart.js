Component({
  properties: {
    data: {
      type: Array,
      value: [],
      observer: 'draw'
    }
  },

  data: {
    selectedIndex: -1
  },

  methods: {
    draw() {
      const data = this.data.data || []
      const query = wx.createSelectorQuery().in(this)
      query.select('#trendChartCanvas').fields({ node: true, size: true }).exec(res => {
        if (!res || !res[0] || !res[0].node) return
        const canvasNode = res[0].node
        const width = res[0].width
        const height = res[0].height

        const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 1
        canvasNode.width = width * dpr
        canvasNode.height = height * dpr

        const ctx = canvasNode.getContext('2d')
        ctx.scale(dpr, dpr)

        this._canvasWidth = width
        this._canvasHeight = height
        this._ctx = ctx

        this.renderChart(ctx, width, height, data)
      })
    },

    renderChart(ctx, width, height, data) {
      ctx.clearRect(0, 0, width, height)

      if (!data.length) {
        ctx.fillStyle = '#999'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无数据', width / 2, height / 2)
        return
      }

      const padding = { top: 20, right: 10, bottom: 30, left: 40 }
      const chartW = width - padding.left - padding.right
      const chartH = height - padding.top - padding.bottom

      let maxVal = 0
      let minVal = 0
      let maxBarVal = 0
      data.forEach(d => {
        maxVal = Math.max(maxVal, d.income, d.expense, d.net)
        minVal = Math.min(minVal, d.net)
        maxBarVal = Math.max(maxBarVal, d.income, d.expense)
      })
      minVal = Math.min(0, minVal)
      maxVal = Math.max(0, maxVal)
      if (maxBarVal <= 0) {
        maxBarVal = 1
      }

      const range = maxVal - minVal
      const niceRange = range === 0 ? 100 : range * 1.2
      if (range === 0) {
        maxVal = 100
        minVal = 0
      } else {
        maxVal = minVal + niceRange
      }

      const getY = (val) => {
        const pct = (val - minVal) / (maxVal - minVal)
        return padding.top + chartH * (1 - pct)
      }

      const drawTopRoundedRect = (ctx, x, y, w, h, r) => {
        const radius = Math.min(r, w / 2, h)
        ctx.beginPath()
        ctx.moveTo(x, y + h)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.lineTo(x + w - radius, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
        ctx.lineTo(x + w, y + h)
        ctx.closePath()
        ctx.fill()
      }

      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px sans-serif'

      for (let i = 0; i <= 4; i++) {
        const val = minVal + (maxVal - minVal) * (i / 4)
        const y = getY(val)

        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.fillText(Math.round(val), padding.left - 5, y)
      }
      ctx.stroke()

      const barWidth = (chartW / data.length) * 0.6
      const step = chartW / data.length

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      const skip = Math.ceil(data.length / 6)

      data.forEach((d, i) => {
        const x = padding.left + step * i + step / 2
        if (i % skip === 0) {
          const label = d.date || ''
          ctx.fillText(label, x, height - padding.bottom + 5)
        }
      })

      const placeholderTop = getY(maxBarVal)
      const baseY = getY(0)
      const placeholderHeight = baseY - placeholderTop
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'
      data.forEach((d, i) => {
        const xCenter = padding.left + step * i + step / 2
        const x = xCenter - barWidth / 2
        drawTopRoundedRect(ctx, x, placeholderTop, barWidth, placeholderHeight, 6)
      })

      const subBarWidth = barWidth / 2

      data.forEach((d, i) => {
        const xCenter = padding.left + step * i + step / 2

        const yIncome = getY(d.income)
        const hIncome = baseY - yIncome
        ctx.fillStyle = '#064e3b'
        drawTopRoundedRect(ctx, xCenter - subBarWidth, yIncome, subBarWidth, hIncome, 6)

        const yExpense = getY(d.expense)
        const hExpense = baseY - yExpense
        ctx.fillStyle = '#a3e635'
        drawTopRoundedRect(ctx, xCenter, yExpense, subBarWidth, hExpense, 6)
      })

      const points = data.map((d, i) => {
        const x = padding.left + step * i + step / 2
        const y = getY(d.net)
        return { x, y }
      })

      if (points.length > 1) {
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i - 1] || points[i]
          const p1 = points[i]
          const p2 = points[i + 1]
          const p3 = points[i + 2] || p2

          const cp1x = p1.x + (p2.x - p0.x) / 6
          const cp1y = p1.y + (p2.y - p0.y) / 6
          const cp2x = p2.x - (p3.x - p1.x) / 6
          const cp2y = p2.y - (p3.y - p1.y) / 6

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
        }

        ctx.stroke()
      }

      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })

      const selIndex = this.data.selectedIndex
      if (selIndex >= 0 && selIndex < data.length) {
        const sel = data[selIndex]
        const px = points[selIndex].x
        const py = points[selIndex].y

        ctx.fillStyle = '#10b981'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        const lines = [
          sel.date || '',
          '收入 ¥' + Number(sel.income || 0).toFixed(2),
          '支出 ¥' + Number(sel.expense || 0).toFixed(2),
          '净收益 ¥' + Number(sel.net || 0).toFixed(2)
        ]

        ctx.font = '10px sans-serif'
        let maxWidth = 0
        lines.forEach(text => {
          const w = ctx.measureText(text).width
          if (w > maxWidth) maxWidth = w
        })

        const paddingX = 8
        const paddingY = 4
        const lineHeight = 12
        const boxWidth = maxWidth * 1.1 + paddingX * 2
        const boxHeight = lines.length * lineHeight + paddingY * 2

        let boxX = px - boxWidth / 2
        if (boxX < padding.left) boxX = padding.left
        if (boxX + boxWidth > width - padding.right) boxX = width - padding.right - boxWidth

        let boxY = py - boxHeight - 8
        if (boxY < padding.top) boxY = py + 8

        const r = 6
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(boxX + r, boxY)
        ctx.lineTo(boxX + boxWidth - r, boxY)
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r)
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r)
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - r, boxY + boxHeight)
        ctx.lineTo(boxX + r, boxY + boxHeight)
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r)
        ctx.lineTo(boxX, boxY + r)
        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.textAlign = 'left'
        ctx.fillStyle = '#111827'
        ctx.textBaseline = 'top'
        let ty = boxY + paddingY
        lines.forEach((text, idx) => {
          if (idx === 0) {
            ctx.fillStyle = '#4b5563'
          } else {
            ctx.fillStyle = '#111827'
          }
          ctx.fillText(text, boxX + paddingX, ty)
          ty += lineHeight
        })
      }
    },

    onTouchStart(e) {
      this.handleTouch(e)
    },

    onTouchMove(e) {
      this.handleTouch(e)
    },

    handleTouch(e) {
      const data = this.data.data || []
      if (!data.length) return
      const touch = e.touches && e.touches[0]
      if (!touch) return

      const padding = { top: 20, right: 10, bottom: 30, left: 40 }
      const width = this._canvasWidth || 0
      const chartW = width - padding.left - padding.right
      if (chartW <= 0) return
      const step = chartW / data.length
      const x = touch.x
      const index = Math.floor((x - padding.left) / step)
      if (index < 0 || index >= data.length) return

      if (index === this.data.selectedIndex) return

      this.setData({ selectedIndex: index })
      if (this._ctx && this._canvasWidth && this._canvasHeight) {
        this.renderChart(this._ctx, this._canvasWidth, this._canvasHeight, data)
      }
    }
  }
})
