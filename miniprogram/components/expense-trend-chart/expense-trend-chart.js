Component({
  properties: {
    data: {
      type: Array,
      value: [],
      observer: 'draw'
    }
  },

  methods: {
    draw() {
      const data = this.data.data || []
      const query = wx.createSelectorQuery().in(this)
      query.select('#trendChartCanvas').fields({ node: true, size: true }).exec(res => {
        const canvasNode = res[0].node
        const width = res[0].width
        const height = res[0].height
        
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 1
        canvasNode.width = width * dpr
        canvasNode.height = height * dpr
        
        const ctx = canvasNode.getContext('2d')
        ctx.scale(dpr, dpr)
        
        this.renderChart(ctx, width, height, data)
      })
    },

    renderChart(ctx, width, height, data) {
      // Clear
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

      // Find Min/Max
      let maxVal = 0
      let minVal = 0
      data.forEach(d => {
        maxVal = Math.max(maxVal, d.income, d.expense, d.net)
        minVal = Math.min(minVal, d.net) // Net can be negative
      })
      // Ensure 0 is included
      minVal = Math.min(0, minVal)
      maxVal = Math.max(0, maxVal)
      
      // Add padding to range
      const range = maxVal - minVal
      const niceRange = range === 0 ? 100 : range * 1.2
      // Recalculate max/min based on niceRange/0-axis centering if needed, but simple is fine
      // Let's just expand top/bottom
      if (range === 0) {
          maxVal = 100; minVal = 0;
      } else {
          maxVal = minVal + niceRange
      }

      // Helper: value to Y
      const getY = (val) => {
        const pct = (val - minVal) / (maxVal - minVal)
        return padding.top + chartH * (1 - pct)
      }

      // Draw Grid & Axis
      ctx.strokeStyle = '#eee'
      ctx.lineWidth = 1
      ctx.beginPath()
      // Y Axis Lines (5 steps)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      
      for (let i = 0; i <= 4; i++) {
        const val = minVal + (maxVal - minVal) * (i / 4)
        const y = getY(val)
        
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.fillText(Math.round(val), padding.left - 5, y)
      }
      ctx.stroke()

      // X Axis Labels
      const barWidth = (chartW / data.length) * 0.6
      const step = chartW / data.length
      
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      // Reduce labels if too many
      const skip = Math.ceil(data.length / 6)
      
      data.forEach((d, i) => {
        const x = padding.left + step * i + step / 2
        
        if (i % skip === 0) {
            // Format date
            const dateParts = d.date.split('-')
            const label = dateParts.length >= 2 ? `${dateParts[1]}/${dateParts[2]||'01'}` : d.date
            ctx.fillText(label, x, height - padding.bottom + 5)
        }
      })

      // Draw Bars (Income & Expense)
      // Grouped: Income Left, Expense Right? Or Stacked?
      // User said: "one bar chart reflects both".
      // Let's do Side-by-Side.
      // Bar Width needs to be split.
      const subBarWidth = barWidth / 2
      
      data.forEach((d, i) => {
        const xCenter = padding.left + step * i + step / 2
        
        // Income Bar
        const yIncome = getY(d.income)
        const hIncome = getY(0) - yIncome
        ctx.fillStyle = '#67C23A'
        ctx.fillRect(xCenter - subBarWidth, yIncome, subBarWidth, hIncome)
        
        // Expense Bar
        const yExpense = getY(d.expense)
        const hExpense = getY(0) - yExpense
        ctx.fillStyle = '#F56C6C'
        ctx.fillRect(xCenter, yExpense, subBarWidth, hExpense)
      })

      // Draw Net Line
      ctx.strokeStyle = '#409EFF'
      ctx.lineWidth = 2
      ctx.beginPath()
      data.forEach((d, i) => {
        const x = padding.left + step * i + step / 2
        const y = getY(d.net)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      
      // Draw Points on Line
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#409EFF'
      ctx.lineWidth = 2
      data.forEach((d, i) => {
        const x = padding.left + step * i + step / 2
        const y = getY(d.net)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
    }
  }
})