Component({
  properties: {
    data: {
      type: Array,
      value: [],
      observer: 'draw'
    },
    // period property might still be passed, but we prioritize internal state
    period: {
      type: String,
      value: 'day' 
    }
  },

  data: {
    width: 0,
    height: 0,
    activeIndex: -1,
    tooltip: null,
    
    // Filter State
    currentType: 'week', // month, year, all, week
    pickerDate: '', // YYYY-MM-DD
    displayDate: '',
    currentDateObj: null // timestamp
  },

  lifetimes: {
    attached() {
      this.initDate()
    },
    ready() {
      const query = this.createSelectorQuery()
      query.select('#userTrendCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const canvas = res[0].node
            const ctx = canvas.getContext('2d')
            // Use wx.getWindowInfo() instead of deprecated wx.getSystemInfoSync()
            const dpr = wx.getWindowInfo().pixelRatio
            canvas.width = res[0].width * dpr
            canvas.height = res[0].height * dpr
            ctx.scale(dpr, dpr)
            this._canvas = canvas
            this._ctx = ctx
            this._canvasSize = { width: res[0].width, height: res[0].height }
            this.draw()
          }
        })
    }
  },

  methods: {
    // --- Date Logic ---
    initDate() {
      const now = new Date()
      this.setData({
        currentDateObj: now.getTime(),
        pickerDate: this.formatDate(now),
        displayDate: this.formatDisplayDate(now, 'week')
      })
      // Trigger initial load (nextTick to avoid recursive update warning)
      wx.nextTick(() => {
        this.triggerFilterEvent(now, 'week')
      })
    },

    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    formatDisplayDate(date, type) {
      const y = date.getFullYear()
      const m = date.getMonth() + 1
      if (type === 'month') return `${y}年${m}月`
      if (type === 'year') return `${y}年`
      if (type === 'week') {
        const { start, end } = this.getWeekRange(date)
        const sM = start.getMonth() + 1
        const sD = start.getDate()
        const eM = end.getMonth() + 1
        const eD = end.getDate()
        return `${sM}.${sD}-${eM}.${eD}`
      }
      return ''
    },

    getWeekRange(date) {
      // Natural Week: Monday to Sunday
      const d = new Date(date)
      const day = d.getDay() || 7 // 1=Mon, 7=Sun
      const start = new Date(d)
      start.setDate(d.getDate() - day + 1)
      start.setHours(0,0,0,0)
      
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23,59,59,999)
      
      return { start, end }
    },

    onTypeChange(e) {
      const type = e.currentTarget.dataset.type
      if (type === this.data.currentType) return
      
      const now = new Date()
      this.setData({
        currentType: type,
        currentDateObj: now.getTime(),
        pickerDate: this.formatDate(now),
        displayDate: this.formatDisplayDate(now, type)
      }, () => {
        this.triggerFilterEvent(now, type)
      })
    },

    onDateChange(e) {
      const val = e.detail.value
      // Parse YYYY-MM or YYYY-MM-DD or YYYY
      let date
      const parts = val.split('-')
      if (parts.length >= 3) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      } else if (parts.length === 2) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
      } else if (parts.length === 1) {
        date = new Date(parseInt(parts[0]), 0, 1)
      } else {
        date = new Date()
      }
      
      this.setData({
        currentDateObj: date.getTime(),
        pickerDate: val,
        displayDate: this.formatDisplayDate(date, this.data.currentType)
      }, () => {
        this.triggerFilterEvent(date, this.data.currentType)
      })
    },

    onPrevDate() {
      const { currentType, currentDateObj } = this.data
      const date = new Date(currentDateObj)
      if (currentType === 'month') {
        date.setMonth(date.getMonth() - 1)
      } else if (currentType === 'year') {
        date.setFullYear(date.getFullYear() - 1)
      } else if (currentType === 'week') {
        date.setDate(date.getDate() - 7)
      }
      this.setData({
        currentDateObj: date.getTime(),
        pickerDate: this.formatDate(date),
        displayDate: this.formatDisplayDate(date, currentType)
      }, () => {
        this.triggerFilterEvent(date, currentType)
      })
    },

    onNextDate() {
      const { currentType, currentDateObj } = this.data
      const date = new Date(currentDateObj)
      if (currentType === 'month') {
        date.setMonth(date.getMonth() + 1)
      } else if (currentType === 'year') {
        date.setFullYear(date.getFullYear() + 1)
      } else if (currentType === 'week') {
        date.setDate(date.getDate() + 7)
      }
      this.setData({
        currentDateObj: date.getTime(),
        pickerDate: this.formatDate(date),
        displayDate: this.formatDisplayDate(date, currentType)
      }, () => {
        this.triggerFilterEvent(date, currentType)
      })
    },

    triggerFilterEvent(date, type) {
      let period = ''
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      let startStr = ''
      let endStr = ''

      if (type === 'month') {
        period = '本月'
        // Natural Month: 1st to next 1st
        const s = new Date(date.getFullYear(), date.getMonth(), 1)
        const e = new Date(date.getFullYear(), date.getMonth() + 1, 1)
        startStr = this.formatDate(s)
        endStr = this.formatDate(e)
      }
      else if (type === 'year') {
        period = '本年'
        // Natural Year: Jan 1 to Dec 31
        const s = new Date(date.getFullYear(), 0, 1)
        // End date should be Dec 31 of current year, not Jan 1 of next year
        const e = new Date(date.getFullYear(), 11, 31)
        startStr = this.formatDate(s)
        endStr = this.formatDate(e)
      }
      else if (type === 'week') {
        period = 'week'
        // Natural Week
        const { start, end } = this.getWeekRange(date)
        startStr = this.formatDate(start)
        endStr = this.formatDate(end)
      }
      else if (type === 'all') period = '全部'

      this.triggerEvent('filterchange', {
        period,
        year: String(year),
        month: `${year}-${String(month).padStart(2, '0')}`,
        startDate: startStr,
        endDate: endStr
      })
    },

    // --- Chart Logic ---

    handleTouch(e) {
      const { x, y } = e.touches[0]
      const { width, height } = this._canvasSize || {}
      if (!width) return
      
      const data = this.data.data || []
      const padding = { top: 30, right: 20, bottom: 40, left: 40 }
      
      // Check if touch is within the chart area (excluding padding)
      // Giving a little buffer (e.g. 5px) to make it easier to tap edge points
      const isInsideX = x >= (padding.left - 5) && x <= (width - padding.right + 5)
      const isInsideY = y >= (padding.top - 5) && y <= (height - padding.bottom + 5)

      if (!isInsideX || !isInsideY) {
        // Clicked on padding/blank area -> Close Tooltip
        if (this.data.activeIndex !== -1) {
          this.setData({ activeIndex: -1 })
          this.draw()
        }
        return
      }

      const chartW = width - padding.left - padding.right
      const step = chartW / data.length
      
      let index = Math.floor((x - padding.left) / step)
      if (index < 0) index = 0
      if (index >= data.length) index = data.length - 1
      
      if (this.data.activeIndex !== index) {
        this.setData({ activeIndex: index })
        this.draw()
      }
    },

    handleTouchEnd() {
      // Keep highlight for inspection
    },

    draw() {
      if (!this._ctx || !this._canvasSize) return
      const ctx = this._ctx
      const { width, height } = this._canvasSize
      const data = this.data.data || []
      const { activeIndex, currentType } = this.data

      ctx.clearRect(0, 0, width, height)

      const padding = { top: 30, right: 20, bottom: 40, left: 40 }
      const chartW = width - padding.left - padding.right
      const chartH = height - padding.top - padding.bottom

      // Calculate Range
      let maxAdd = 0
      data.forEach(d => {
        maxAdd = Math.max(maxAdd, Number(d.new_users || 0))
      })
      
      const niceRangeAdd = this.getNiceMax(maxAdd)

      const getY = (val) => {
        val = Number(val) || 0
        const pct = val / niceRangeAdd
        return padding.top + chartH * (1 - pct)
      }

      const step = chartW / data.length
      
      // Draw Grid
      ctx.strokeStyle = '#f3f4f6'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4]) 
      
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH * i) / 5
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
      }

      const todayStr = this.formatDate(new Date())
      const points = []

      // Draw Bars (New Users)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
      const barWidth = step * 0.4
      
      data.forEach((d, i) => {
        // Skip future dates
        if (d.date > todayStr) return
        
        const xCenter = padding.left + step * i + step / 2
        const x = xCenter - barWidth / 2
        // Shift bar slightly down so it doesn't overlap the curve
        const yTop = getY(d.new_users) + 4
        const barHeight = (height - padding.bottom) - yTop
        
        if (barHeight > 0) {
            this.drawTopRoundedRect(ctx, x, yTop, barWidth, barHeight, 6)
        }
      })

      data.forEach((d, i) => {
        // Skip future dates
        if (d.date > todayStr) return

        const x = padding.left + step * i + step / 2
        const y = getY(d.new_users)
        points.push({ x, y })
      })

      if (points.length > 0) {
        // Area Gradient
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)') // Emerald 500 with opacity
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')

        ctx.beginPath()
        if (points.length > 0) {
            ctx.moveTo(points[0].x, height - padding.bottom)
            ctx.lineTo(points[0].x, points[0].y)
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
            if (points.length > 0) {
                ctx.lineTo(points[points.length - 1].x, height - padding.bottom)
            }
        }
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Line
        ctx.strokeStyle = '#10b981' // Emerald 500
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.setLineDash([])
        
        ctx.beginPath()
        if (points.length > 0) {
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
      }

      // X Axis Labels
      ctx.fillStyle = '#9ca3af'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      
      // If week/year view or data is short, show all labels
      const labelStep = (currentType === 'week' || currentType === 'year' || data.length <= 7) ? 1 : Math.ceil(data.length / 15)
      
      data.forEach((d, i) => {
        if (i % labelStep === 0) {
          const x = padding.left + step * i + step / 2
          const dateStr = this._formatLabel(d.date, currentType)
          ctx.fillText(dateStr, x, height - 10)
        }
      })

      // Tooltip
      if (activeIndex >= 0 && activeIndex < data.length) {
        const d = data[activeIndex]
        const x = padding.left + step * activeIndex + step / 2
        
        // Vertical Line
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, height - padding.bottom)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.stroke()
        ctx.setLineDash([])

        // Highlight Point
        const yPoint = getY(d.new_users)
        ctx.beginPath()
        ctx.arc(x, yPoint, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2
        ctx.stroke()

        // Tooltip Box
        let tipX = x + 10
        let tipY = padding.top + 10
        const tipW = 120
        const tipH = 50
        if (tipX + tipW > width) tipX = x - tipW - 10

        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
        ctx.shadowBlur = 10
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        this.drawRoundedRect(ctx, tipX, tipY, tipW, tipH, 8)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        
        ctx.textAlign = 'left'
        ctx.fillStyle = '#374151'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(d.date, tipX + 10, tipY + 20)
        
        ctx.font = '11px sans-serif'
        ctx.fillStyle = '#10b981'
        ctx.fillText(`新增: ${d.new_users}`, tipX + 10, tipY + 38)
      }
    },

    getNiceMax(val) {
      if (val === 0) return 10
      const power = Math.floor(Math.log10(val))
      const mag = Math.pow(10, power)
      const norm = val / mag
      let niceNorm
      if (norm <= 1) niceNorm = 1
      else if (norm <= 2) niceNorm = 2
      else if (norm <= 5) niceNorm = 5
      else niceNorm = 10
      return niceNorm * mag
    },

    drawTopRoundedRect(ctx, x, y, width, height, radius) {
      radius = Math.min(radius, width/2, height)
      ctx.beginPath()
      ctx.moveTo(x, y + height)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height)
      ctx.closePath()
      ctx.fill()
    },

    drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    },

    _formatLabel(s, type) {
        try {
          const t = String(s)
          
          if (type === 'year') {
             // Expecting YYYY-MM
             if (/^\d{4}-\d{2}$/.test(t)) {
                 return parseInt(t.slice(5)) + '月'
             }
             if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
                 return (new Date(t).getMonth() + 1) + '月'
             }
          }
          
          if (type === 'month') {
              // Expecting YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
                  return t.slice(8) // just DD
              }
          }

          // Default fallback
          // Always show MM-DD for daily data if possible, or just default
          if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(5)
          if (/^\d{4}-\d{2}$/.test(t)) return t.slice(5)
          return t
        } catch (_) {
          return String(s || '')
        }
    }
  }
})
