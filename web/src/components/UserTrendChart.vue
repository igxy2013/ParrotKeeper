<template>
  <div class="chart-container">
    <div class="chart-header-row">
      <div class="segment-control">
        <div 
          class="segment-item" 
          :class="{ active: currentType === 'week' }" 
          @click="onTypeChange('week')"
        >周</div>
        <div 
          class="segment-item" 
          :class="{ active: currentType === 'month' }" 
          @click="onTypeChange('month')"
        >月</div>
        <div 
          class="segment-item" 
          :class="{ active: currentType === 'year' }" 
          @click="onTypeChange('year')"
        >年</div>
        <div 
          class="segment-item" 
          :class="{ active: currentType === 'all' }" 
          @click="onTypeChange('all')"
        >全</div>
      </div>
      <div class="controls-row" v-if="currentType !== 'all'">
        <div class="nav-btn" @click="onPrevDate">
          <img class="nav-icon left" src="/arrow-right-s-line.png" />
        </div>
        <el-date-picker
          v-if="currentType === 'week'"
          v-model="pickerDate"
          type="date"
          :clearable="false"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="date-input"
          size="large"
          @change="onDateChange"
        />
        <el-date-picker
          v-else-if="currentType === 'month'"
          v-model="pickerDate"
          type="month"
          :clearable="false"
          format="YYYY-MM"
          value-format="YYYY-MM"
          class="date-input"
          size="large"
          @change="onDateChange"
        />
        <el-date-picker
          v-else-if="currentType === 'year'"
          v-model="pickerDate"
          type="year"
          :clearable="false"
          format="YYYY"
          value-format="YYYY"
          class="date-input"
          size="large"
          @change="onDateChange"
        />
        <div class="nav-btn" @click="onNextDate">
          <img class="nav-icon" src="/arrow-right-s-line.png" />
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas
        ref="canvas"
        class="chart-canvas"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      ></canvas>
    </div>

    <div class="chart-legend">
      <div class="legend-item">
        <div class="dot new"></div>
        <span>新增趋势</span>
      </div>
      <div class="legend-item">
        <div class="dot bar"></div>
        <span>每日新增</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, defineProps, defineEmits } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['filter-change'])

// State
const currentType = ref('week')
const pickerDate = ref('')
const displayDate = ref('')
const currentDateObj = ref(null)
const activeIndex = ref(-1)

const canvas = ref(null)
const canvasWrapper = ref(null)
let ctx = null
let canvasSize = { width: 0, height: 0 }

// Init
onMounted(() => {
  initDate()
  initCanvas()
  window.addEventListener('resize', handleResize)
})

const initCanvas = () => {
  if (!canvas.value || !canvasWrapper.value) return
  
  const dpr = window.devicePixelRatio || 1
  const rect = canvasWrapper.value.getBoundingClientRect()
  
  canvas.value.width = rect.width * dpr
  canvas.value.height = rect.height * dpr
  
  ctx = canvas.value.getContext('2d')
  ctx.scale(dpr, dpr)
  
  canvasSize = { width: rect.width, height: rect.height }
  
  draw()
}

const handleResize = () => {
  initCanvas()
}

// Watch data change to redraw
watch(() => props.data, () => {
  draw()
})

// --- Date Logic ---
const initDate = () => {
  const now = new Date()
  currentDateObj.value = now.getTime()
  pickerDate.value = formatDate(now)
  displayDate.value = formatDisplayDate(now, 'week')
  
  nextTick(() => {
    triggerFilterEvent(now, 'week')
  })
}

const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getWeekRange = (date) => {
  const d = new Date(date)
  const day = d.getDay() || 7 // 1=Mon, 7=Sun
  const start = new Date(d)
  start.setDate(d.getDate() - day + 1)
  start.setHours(0,0,0,0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23,59,59,999)
  
  return { start, end }
}

const formatDisplayDate = (date, type) => {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  if (type === 'month') return `${y}年${m}月`
  if (type === 'year') return `${y}年`
  if (type === 'week') {
    const { start, end } = getWeekRange(date)
    const sM = start.getMonth() + 1
    const sD = start.getDate()
    const eM = end.getMonth() + 1
    const eD = end.getDate()
    return `${sM}.${sD}-${eM}.${eD}`
  }
  return ''
}

const onTypeChange = (type) => {
  if (type === currentType.value) return
  
  const now = new Date()
  currentType.value = type
  currentDateObj.value = now.getTime()
  pickerDate.value = formatDate(now)
  displayDate.value = formatDisplayDate(now, type)
  
  triggerFilterEvent(now, type)
}

const onDateChange = (val) => {
  if (!val) return
  let date
  if (currentType.value === 'year') {
    const y = parseInt(String(val))
    date = new Date(y, 0, 1)
  } else if (currentType.value === 'month') {
    const parts = String(val).split('-')
    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
  } else {
    const parts = String(val).split('-')
    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2] || '1'))
  }
  currentDateObj.value = date.getTime()
  displayDate.value = formatDisplayDate(date, currentType.value)
  triggerFilterEvent(date, currentType.value)
}

const onPrevDate = () => {
  const date = new Date(currentDateObj.value)
  if (currentType.value === 'month') {
    date.setMonth(date.getMonth() - 1)
  } else if (currentType.value === 'year') {
    date.setFullYear(date.getFullYear() - 1)
  } else if (currentType.value === 'week') {
    date.setDate(date.getDate() - 7)
  }
  
  currentDateObj.value = date.getTime()
  pickerDate.value = formatDate(date)
  displayDate.value = formatDisplayDate(date, currentType.value)
  
  triggerFilterEvent(date, currentType.value)
}

const onNextDate = () => {
  const date = new Date(currentDateObj.value)
  if (currentType.value === 'month') {
    date.setMonth(date.getMonth() + 1)
  } else if (currentType.value === 'year') {
    date.setFullYear(date.getFullYear() + 1)
  } else if (currentType.value === 'week') {
    date.setDate(date.getDate() + 7)
  }
  
  currentDateObj.value = date.getTime()
  pickerDate.value = formatDate(date)
  displayDate.value = formatDisplayDate(date, currentType.value)
  
  triggerFilterEvent(date, currentType.value)
}

const triggerFilterEvent = (date, type) => {
  let period = ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  let startStr = ''
  let endStr = ''

  if (type === 'month') {
    period = '本月'
    const s = new Date(date.getFullYear(), date.getMonth(), 1)
    const e = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    startStr = formatDate(s)
    endStr = formatDate(e)
  }
  else if (type === 'year') {
    period = '本年'
    const s = new Date(date.getFullYear(), 0, 1)
    const e = new Date(date.getFullYear(), 11, 31)
    startStr = formatDate(s)
    endStr = formatDate(e)
  }
  else if (type === 'week') {
    period = 'week'
    const { start, end } = getWeekRange(date)
    startStr = formatDate(start)
    const nextMon = new Date(end)
    nextMon.setDate(nextMon.getDate() + 1)
    endStr = formatDate(nextMon)
  }
  else if (type === 'all') period = '全部'

  emit('filter-change', {
    period,
    year: String(year),
    month: `${year}-${String(month).padStart(2, '0')}`,
    startDate: startStr,
    endDate: endStr,
    type: type // added for convenience
  })
}

// --- Chart Logic ---

const handleMouseMove = (e) => {
  if (!canvasSize.width) return
  const { width, height } = canvasSize
  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const data = props.data || []
  const padding = { top: 30, right: 20, bottom: 40, left: 40 }
  
  const isInsideX = x >= (padding.left - 5) && x <= (width - padding.right + 5)
  const isInsideY = y >= (padding.top - 5) && y <= (height - padding.bottom + 5)

  if (!isInsideX || !isInsideY) {
    if (activeIndex.value !== -1) {
      activeIndex.value = -1
      draw()
    }
    return
  }

  const chartW = width - padding.left - padding.right
  const step = chartW / data.length
  
  let index = Math.floor((x - padding.left) / step)
  if (index < 0) index = 0
  if (index >= data.length) index = data.length - 1
  
  if (activeIndex.value !== index) {
    activeIndex.value = index
    draw()
  }
}

const handleMouseLeave = () => {
  if (activeIndex.value !== -1) {
    activeIndex.value = -1
    draw()
  }
}

const draw = () => {
  if (!ctx || !canvasSize.width) return
  const { width, height } = canvasSize
  const data = props.data || []
  
  ctx.clearRect(0, 0, width, height)
  
  const padding = { top: 30, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  let maxAdd = 0
  data.forEach(d => {
    maxAdd = Math.max(maxAdd, Number(d.new_users || 0))
  })
  
  const niceRangeAdd = getNiceMax(maxAdd)

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

  const todayStr = formatDate(new Date())
  const points = []

  // Draw Bars
  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
  const barWidth = step * 0.4
  
  data.forEach((d, i) => {
    if (d.date > todayStr) return
    
    const xCenter = padding.left + step * i + step / 2
    const x = xCenter - barWidth / 2
    const yTop = getY(d.new_users) + 4
    const barHeight = (height - padding.bottom) - yTop
    
    if (barHeight > 0) {
      drawTopRoundedRect(ctx, x, yTop, barWidth, barHeight, 6)
    }
  })

  // Calculate Points
  data.forEach((d, i) => {
    if (d.date > todayStr) return
    const x = padding.left + step * i + step / 2
    const y = getY(d.new_users)
    points.push({ x, y })
  })

  if (points.length > 0) {
    // Area Gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, height - padding.bottom)
    ctx.lineTo(points[0].x, points[0].y)
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const p0 = points[i - 1] || p1
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
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Line
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([])
    
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const p0 = points[i - 1] || p1
      const p3 = points[i + 2] || p2
      
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
    }
    ctx.stroke()
  }

  // X Axis Labels
  ctx.fillStyle = '#9ca3af'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  
  const labelStep = (currentType.value === 'week' || currentType.value === 'year' || data.length <= 7) ? 1 : Math.ceil(data.length / 15)
  
  data.forEach((d, i) => {
    if (i % labelStep === 0) {
      const x = padding.left + step * i + step / 2
      const dateStr = _formatLabel(d.date, currentType.value)
      ctx.fillText(dateStr, x, height - 10)
    }
  })

  // Tooltip
  if (activeIndex.value >= 0 && activeIndex.value < data.length) {
    const d = data[activeIndex.value]
    const x = padding.left + step * activeIndex.value + step / 2
    
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
    drawRoundedRect(ctx, tipX, tipY, tipW, tipH, 8)
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
}

const getNiceMax = (val) => {
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
}

const drawTopRoundedRect = (ctx, x, y, width, height, radius) => {
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
}

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
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
}

const _formatLabel = (s, type) => {
  try {
    const t = String(s)
    if (type === 'year') {
       if (/^\d{4}-\d{2}$/.test(t)) return parseInt(t.slice(5)) + '月'
       if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return (new Date(t).getMonth() + 1) + '月'
    }
    if (type === 'month') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(8)
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(5)
    if (/^\d{4}-\d{2}$/.test(t)) return t.slice(5)
    return t
  } catch (_) {
    return String(s || '')
  }
}
</script>

<style scoped>
.chart-container {
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  font-family: sans-serif;
}

 .chart-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
 }

.segment-control {
  display: flex;
  background: #f3f4f6;
  padding: 3px;
  border-radius: 8px;
  cursor: pointer;
}

.segment-item {
  padding: 5px 20px;
  font-size: 14px;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.segment-item.active {
  background: #ffffff;
  color: #10b981;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-right { display: flex; align-items: center; gap: 16px; }

.nav-btn {
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #f3f4f6;
}

.nav-btn:active {
  opacity: 0.5;
}

.nav-icon {
  width: 20px;
  height: 20px;
  filter: invert(56%) sepia(82%) saturate(452%) hue-rotate(106deg) brightness(91%) contrast(92%);
}

.nav-icon.left {
  transform: rotate(180deg);
}

.controls-row { display: flex; align-items: center; gap: 10px; }
.date-input { width: 120px; }
.date-input :deep(.el-input__wrapper) { height: 40px; padding: 0 8px; }
.date-input :deep(.el-input__inner) { line-height: 40px; text-align: center; }

.dropdown-icon {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  filter: invert(56%) sepia(82%) saturate(452%) hue-rotate(106deg) brightness(91%) contrast(92%);
}

.canvas-wrapper {
  width: 100%;
  height: 220px; /* Approx 440rpx / 2 */
}

.chart-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-legend {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
}

.dot {
  width: 12px;
  height: 2px;
  border-radius: 2px;
  margin-right: 6px;
}

.dot.new {
  background: #10b981;
}

.dot.bar {
  width: 12px;
  height: 8px;
  border-radius: 2px;
  background: rgba(16, 185, 129, 0.3);
}
</style>
