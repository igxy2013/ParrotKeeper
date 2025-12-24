<template>
  <div class="dashboard-container">
    <div class="page-header">
       <h2>仪表盘</h2>
       <div class="header-date">{{ currentDate }}</div>
    </div>

    <!-- Top Stats Row -->
    <el-row :gutter="24" v-loading="loading">
      <el-col :span="6">
        <div class="stat-card primary-card">
          <div class="stat-icon-wrapper">
             <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">鹦鹉总数</div>
             <div class="stat-value">{{ stats.total_parrots || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card danger-card">
           <div class="stat-icon-wrapper">
             <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">本月支出</div>
             <div class="stat-value">¥{{ stats.monthly_expense || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card success-card">
           <div class="stat-icon-wrapper">
             <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">本月收入</div>
             <div class="stat-value">¥{{ stats.monthly_income || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card info-card">
           <div class="stat-icon-wrapper">
             <el-icon><FirstAidKit /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">健康状况</div>
             <div class="health-tags">
                <div class="health-row">
                   <span class="health-dot healthy"></span>
                   <span class="health-text">健康 {{ stats.health_status?.healthy || 0 }}</span>
                </div>
                <div class="health-row" v-if="stats.health_status?.sick">
                   <span class="health-dot sick"></span>
                   <span class="health-text text-danger">生病 {{ stats.health_status?.sick }}</span>
                </div>
                <div class="health-row" v-if="stats.health_status?.recovering">
                   <span class="health-dot recovering"></span>
                   <span class="health-text text-warning">康复 {{ stats.health_status?.recovering }}</span>
                </div>
             </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Secondary Stats Row -->
    <el-row :gutter="24" class="mt-6" v-loading="loading">
      <el-col :span="6">
        <div class="mini-stat-card">
           <div class="mini-icon bg-blue-light"><el-icon class="text-blue"><Dish /></el-icon></div>
           <div class="mini-info">
              <div class="mini-label">总喂食次数</div>
              <div class="mini-num">{{ stats.total_feedings || 0 }}</div>
           </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="mini-stat-card">
           <div class="mini-icon bg-purple-light"><el-icon class="text-purple"><FirstAidKit /></el-icon></div>
           <div class="mini-info">
              <div class="mini-label">总健康检查</div>
              <div class="mini-num">{{ stats.total_checkups || 0 }}</div>
           </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="mini-stat-card">
           <div class="mini-icon bg-green-light"><el-icon class="text-green"><Calendar /></el-icon></div>
           <div class="mini-info">
              <div class="mini-label">本月喂食</div>
              <div class="mini-num">{{ stats.monthly_feeding || 0 }}</div>
           </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="mini-stat-card">
           <div class="mini-icon bg-orange-light"><el-icon class="text-orange"><Timer /></el-icon></div>
           <div class="mini-info">
              <div class="mini-label">本月检查</div>
              <div class="mini-num">{{ stats.monthly_health_checks || 0 }}</div>
           </div>
        </div>
      </el-col>
    </el-row>

    <!-- Chart Row -->
    <el-row :gutter="24" class="mt-6" v-loading="loading">
      <el-col :span="16">
        <div class="chart-card">
          <div class="chart-header">
             <div class="header-title">
                 <el-icon><TrendCharts /></el-icon>
                 <span>体重趋势（{{ trendDays }} 天）</span>
              </div>
              <div class="header-actions">
                 <div class="avg-meta"><span class="meta-label">平均体重</span><span class="meta-value">{{ weightAvgChart || '--' }}</span></div>
                  <div class="parrot-selector" @click.stop="toggleParrotDropdown">
                    <div class="selector-wrapper">
                      <span class="selector-text">{{ selectedParrotName || '全部鹦鹉' }}</span>
                      <span class="selector-arrow">▼</span>
                    </div>
                    <div class="dropdown-menu" v-if="showParrotDropdown">
                      <div class="dropdown-item" @click.stop="selectParrot('','')"><span class="item-text">全部鹦鹉</span><span class="check-icon">{{ !selectedParrotId ? '✓' : '' }}</span></div>
                      <div class="dropdown-item" v-for="s in weightSeries" :key="s.parrot_id" @click.stop="selectParrot(s.parrot_id, s.parrot_name)"><span class="item-text">{{ s.parrot_name }}</span><span class="check-icon">{{ selectedParrotId == s.parrot_id ? '✓' : '' }}</span></div>
                    </div>
                  </div>
              </div>
          </div>
          <div class="trend-card">
            <div class="chart-wrapper">
              <canvas 
                ref="weightCanvas" 
                class="weight-canvas"
                @click="onWeightCanvasClick"
                @mousedown="onWeightMouseDown"
                @mousemove="onWeightMouseMove"
                @mouseup="onWeightMouseUp"
                @mouseleave="onWeightMouseLeave"
              ></canvas>
            </div>
            <div class="legend" v-if="displaySeries.length">
              <div class="legend-item" v-for="item in displaySeries" :key="item.parrot_id">
                <span class="legend-dot" :style="{ backgroundColor: weightColorMap[String(item.parrot_id)] }"></span>
                <span class="legend-name">{{ item.parrot_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card h-full">
           <div class="chart-header">
              <div class="header-title">
                 <el-icon><List /></el-icon>
                 <span>今日记录</span>
              </div>
           </div>
           <div class="today-stats-container">
              <div class="today-stat-box success-box">
                 <div class="today-icon"><el-icon><Dish /></el-icon></div>
                 <div class="today-content">
                    <div class="today-label">今日喂食</div>
                    <div class="today-val">{{ stats.today_records?.feeding || 0 }}</div>
                 </div>
              </div>
              <div class="today-stat-box info-box">
                 <div class="today-icon"><el-icon><Brush /></el-icon></div>
                 <div class="today-content">
                    <div class="today-label">今日清洁</div>
                    <div class="today-val">{{ stats.today_records?.cleaning || 0 }}</div>
                 </div>
              </div>
              <div class="today-stat-box warning-box">
                 <div class="today-icon"><el-icon><View /></el-icon></div>
                 <div class="today-content">
                    <div class="today-label">统计访问</div>
                    <div class="today-val">{{ stats.stats_views || 0 }}</div>
                 </div>
              </div>
           </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { User, Wallet, Money, FirstAidKit, Dish, Calendar, Timer, TrendCharts, List, Brush, View } from '@element-plus/icons-vue'
import api from '../api/axios'

const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const stats = ref({})
const loading = ref(true)
const trendDays = ref(30)

const weightSeries = ref([])
const selectedParrotId = ref('')
const selectedParrotName = ref('')
const showParrotDropdown = ref(false)
const weightAvgChart = ref('')
const weightCanvas = ref(null)
const weightColorMap = ref({})
const activeWeightPoint = ref(null)
const activeGuideX = ref(null)
let isDragging = false
let weightTapAreas = []
let weightCanvasRect = null

const palette = ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']

const displaySeries = computed(() => {
  const list = weightSeries.value || []
  const sid = selectedParrotId.value
  if (sid) return list.filter(s => String(s.parrot_id) === String(sid))
  return list.slice(0, 12)
})

const toggleParrotDropdown = () => { showParrotDropdown.value = !showParrotDropdown.value }
const selectParrot = (id, name) => {
  selectedParrotId.value = id || ''
  selectedParrotName.value = name || ''
  showParrotDropdown.value = false
  computeAvgAndDraw()
}

const buildColorMap = () => {
  const list = weightSeries.value || []
  const cm = {}
  for (let i = 0; i < Math.min(12, list.length); i++) {
    const s = list[i]
    cm[String(s.parrot_id)] = palette[i % palette.length]
  }
  weightColorMap.value = cm
}

const computeAvgAndDraw = async () => {
  const series = displaySeries.value || []
  const pts = []
  for (let i = 0; i < series.length; i++) {
    const p = Array.isArray(series[i].points) ? series[i].points : []
    for (let j = 0; j < p.length; j++) {
      const w = p[j] && p[j].weight
      if (typeof w === 'number' && !isNaN(w) && isFinite(w) && w > 0) pts.push(w)
    }
  }
  if (pts.length) {
    let sum = 0
    for (let i = 0; i < pts.length; i++) sum += pts[i]
    weightAvgChart.value = (sum / pts.length).toFixed(1) + 'g'
  } else {
    weightAvgChart.value = '--'
  }
  await nextTick()
  drawWeightChart()
}

const drawWeightChart = () => {
  const el = weightCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  weightCanvasRect = rect
  const width = rect.width || 300
  const height = 180
  const dpr = window.devicePixelRatio || 1
  el.width = Math.floor(width * dpr)
  el.height = Math.floor(height * dpr)
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const series = displaySeries.value || []
  if (!series.length) {
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '14px sans-serif'
    ctx.fillText('暂无体重数据', width / 2, height / 2)
    return
  }

  const allPoints = []
  const dateSet = new Set()
  for (let i = 0; i < series.length; i++) {
    const pts = Array.isArray(series[i].points) ? series[i].points : []
    for (let j = 0; j < pts.length; j++) {
      const p = pts[j]
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
  if (maxW === minW) { minW = Math.max(0, minW - 1); maxW = maxW + 1 }

  const paddingLeft = 48
  const paddingRight = 18
  const paddingTop = 18
  const paddingBottom = 36
  const chartW = width - paddingLeft - paddingRight
  const chartH = height - paddingTop - paddingBottom

  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(paddingLeft, height - paddingBottom)
  ctx.lineTo(width - paddingRight, height - paddingBottom)
  ctx.moveTo(paddingLeft, height - paddingBottom)
  ctx.lineTo(paddingLeft, paddingTop)
  ctx.stroke()

  const yTicks = 4
  ctx.fillStyle = '#666'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= yTicks; i++) {
    const t = i / yTicks
    const value = minW + t * (maxW - minW)
    const y = paddingTop + (1 - t) * chartH
    ctx.strokeStyle = '#eee'
    ctx.beginPath()
    ctx.moveTo(paddingLeft, y)
    ctx.lineTo(width - paddingRight, y)
    ctx.stroke()
    ctx.fillStyle = '#666'
    const displayValue = isFinite(value) && !isNaN(value) ? value.toFixed(1) : '0.0'
    ctx.fillText(displayValue, paddingLeft - 6, y)
  }

  const maxXTicks = Math.min(6, dates.length)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i < maxXTicks; i++) {
    let idx, x
    if (dates.length === 1) { idx = 0; x = paddingLeft + chartW / 2 }
    else { idx = Math.round((i / (maxXTicks - 1)) * (dates.length - 1)); x = paddingLeft + (idx / (dates.length - 1)) * chartW }
    const d = new Date(dates[idx])
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const y = height - paddingBottom
    ctx.strokeStyle = '#eee'
    ctx.beginPath()
    ctx.moveTo(x, paddingTop)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.fillStyle = '#666'
    ctx.fillText(label, x, y + 4)
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const tapAreas = []
  for (let si = 0; si < series.length; si++) {
    const s = series[si]
    const rawPoints = (Array.isArray(s.points) ? s.points : [])
      .filter(p => p && typeof p.weight === 'number' && !isNaN(p.weight) && p.weight > 0)
      .sort((a,b) => a.date.localeCompare(b.date))
    if (!rawPoints.length) continue
    const color = weightColorMap.value[String(s.parrot_id)] || palette[si % palette.length]
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    const points = []
    for (let i = 0; i < rawPoints.length; i++) {
      const xIndex = dates.indexOf(rawPoints[i].date)
      if (xIndex === -1) continue
      const x = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (xIndex / (dates.length - 1)) * chartW)
      const norm = (rawPoints[i].weight - minW) / (maxW - minW)
      if (!isFinite(norm) || isNaN(norm)) continue
      const y = paddingTop + (1 - norm) * chartH
      points.push({ x, y })
    }
    if (points.length > 1) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      const n = points.length
      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const dxArr = new Array(n - 1)
      const mArr = new Array(n - 1)
      for (let i = 0; i < n - 1; i++) { const dx = xs[i + 1] - xs[i]; dxArr[i] = dx; mArr[i] = dx !== 0 ? ((ys[i + 1] - ys[i]) / dx) : 0 }
      const tArr = new Array(n)
      tArr[0] = mArr[0]
      tArr[n - 1] = mArr[n - 2]
      for (let i = 1; i <= n - 2; i++) { const m0 = mArr[i - 1]; const m1 = mArr[i]; if (m0 * m1 <= 0) { tArr[i] = 0 } else { const dx0 = dxArr[i - 1]; const dx1 = dxArr[i]; tArr[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1)) } }
      for (let i = 0; i < n - 1; i++) { const x0 = xs[i], y0 = ys[i]; const x1 = xs[i + 1], y1 = ys[i + 1]; const dx = dxArr[i]; const cp1x = x0 + dx / 3; const cp1y = y0 + tArr[i] * dx / 3; const cp2x = x1 - dx / 3; const cp2y = y1 - tArr[i + 1] * dx / 3; ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1) }
      const lastPoint = points[points.length - 1]
      const firstPoint = points[0]
      const bottomY = height - paddingBottom
      ctx.lineTo(lastPoint.x, bottomY)
      ctx.lineTo(firstPoint.x, bottomY)
      ctx.closePath()
      const gradient = ctx.createLinearGradient(0, paddingTop, 0, bottomY)
      const hex = color
      const m = hex.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
      if (m) {
        const r = parseInt(m[1], 16)
        const g = parseInt(m[2], 16)
        const b = parseInt(m[3], 16)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`)
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`)
      } else {
        gradient.addColorStop(0, hex + '40')
        gradient.addColorStop(0.7, hex + '1A')
        gradient.addColorStop(1, hex + '05')
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
      for (let i = 0; i < n2 - 1; i++) { const dx = xs2[i + 1] - xs2[i]; dx2[i] = dx; m2[i] = dx !== 0 ? ((ys2[i + 1] - ys2[i]) / dx) : 0 }
      const t2 = new Array(n2)
      t2[0] = m2[0]
      t2[n2 - 1] = m2[n2 - 2]
      for (let i = 1; i <= n2 - 2; i++) { const m0 = m2[i - 1]; const m1 = m2[i]; if (m0 * m1 <= 0) { t2[i] = 0 } else { const dx0 = dx2[i - 1]; const dx1 = dx2[i]; t2[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1)) } }
      for (let i = 0; i < n2 - 1; i++) { const x0 = xs2[i], y0 = ys2[i]; const x1 = xs2[i + 1], y1 = ys2[i + 1]; const dx = dx2[i]; const cp1x = x0 + dx / 3; const cp1y = y0 + t2[i] * dx / 3; const cp2x = x1 - dx / 3; const cp2y = y1 - t2[i + 1] * dx / 3; ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1) }
      ctx.stroke()
    } else {
      const p0 = points[0]
      ctx.beginPath()
      ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    for (let k = 0; k < rawPoints.length; k++) {
      const rp = rawPoints[k]
      const xIndex = dates.indexOf(rp.date)
      if (xIndex === -1) continue
      const x = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (xIndex / (dates.length - 1)) * chartW)
      const norm = (rp.weight - minW) / (maxW - minW)
      if (!isFinite(norm) || isNaN(norm)) continue
      const y = paddingTop + (1 - norm) * chartH
      tapAreas.push({ x, y, radius: 10, weight: rp.weight, date: rp.date, parrot_name: s.parrot_name, color })
    }

    if (selectedParrotId.value && typeof s.species_ref_weight_g === 'number' && isFinite(s.species_ref_weight_g)) {
      const norm = (s.species_ref_weight_g - minW) / (maxW - minW)
      if (isFinite(norm) && !isNaN(norm)) {
        const yRef = paddingTop + (1 - norm) * chartH
        ctx.save()
        ctx.strokeStyle = '#7c3aed'
        ctx.lineWidth = 2
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(paddingLeft, yRef)
        ctx.lineTo(width - paddingRight, yRef)
        ctx.stroke()
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])
        ctx.restore()
      }
    }
  }
  weightTapAreas = tapAreas

  if (typeof activeGuideX.value === 'number') {
    let gx = activeGuideX.value
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
    for (let si = 0; si < series.length; si++) {
      const s = series[si]
      const p = (s.points || []).find(pt => pt && pt.date === dateSel && typeof pt.weight === 'number' && !isNaN(pt.weight) && pt.weight > 0)
      if (!p) continue
      const norm = (p.weight - minW) / (maxW - minW)
      if (!isFinite(norm) || isNaN(norm)) continue
      const y = paddingTop + (1 - norm) * chartH
      const color = weightColorMap.value[String(s.parrot_id)] || palette[si % palette.length]
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
    }
    if (items.length > 0) {
      const headerText = dateSel || ''
      ctx.font = '12px sans-serif'
      const headerW = ctx.measureText(headerText).width
      ctx.font = '11px sans-serif'
      let maxItemW = 0
      for (let i = 0; i < items.length; i++) { maxItemW = Math.max(maxItemW, ctx.measureText(items[i].text).width) }
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
      if (guideXPos < width / 2) { boxX = guideXPos + margin; if (boxX + boxW > width - 8) boxX = width - 8 - boxW }
      else { boxX = guideXPos - margin - boxW; if (boxX < 8) boxX = 8 }
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
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
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
      }
    }
  } else {
    const active = activeWeightPoint.value
    if (active && typeof active.x === 'number' && typeof active.y === 'number') {
      const weightText = (typeof active.weight === 'number' && !isNaN(active.weight)) ? (active.weight.toFixed(1) + 'g') : '--'
      const nameText = active.parrot_name || ''
      const label = nameText ? (nameText + ' ' + weightText) : weightText
      ctx.font = '12px sans-serif'
      const textW = ctx.measureText(label).width
      const paddingX = 6
      const boxW = textW + paddingX * 2
      const boxH = 20
      let boxX = active.x - boxW / 2
      let boxY = active.y - 10 - boxH
      if (boxX < 8) boxX = 8
      if (boxX + boxW > width - 8) boxX = width - 8 - boxW
      if (boxY < paddingTop + 4) boxY = active.y + 10
      ctx.save()
      ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'
      const r2 = 6
      ctx.beginPath()
      ctx.moveTo(boxX + r2, boxY)
      ctx.lineTo(boxX + boxW - r2, boxY)
      ctx.arc(boxX + boxW - r2, boxY + r2, r2, -Math.PI / 2, 0)
      ctx.lineTo(boxX + boxW, boxY + boxH - r2)
      ctx.arc(boxX + boxW - r2, boxY + boxH - r2, r2, 0, Math.PI / 2)
      ctx.lineTo(boxX + r2, boxY + boxH)
      ctx.arc(boxX + r2, boxY + boxH - r2, r2, Math.PI / 2, Math.PI)
      ctx.lineTo(boxX, boxY + r2)
      ctx.arc(boxX + r2, boxY + r2, r2, Math.PI, Math.PI * 3 / 2)
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2)
      ctx.restore()
    }
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/statistics/overview')
    if (res.data.success) { stats.value = res.data.data }
    const wt = await api.get('/statistics/weight-trends', { params: { days: trendDays.value } })
    if (wt.data && wt.data.success && Array.isArray(wt.data.data?.series)) {
      weightSeries.value = wt.data.data.series || []
      buildColorMap()
      await computeAvgAndDraw()
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  const onResize = () => computeAvgAndDraw()
  window.addEventListener('resize', onResize)
  resizeHandler = onResize
})

let resizeHandler = null
onBeforeUnmount(() => { if (resizeHandler) window.removeEventListener('resize', resizeHandler) })

watch(weightSeries, () => { buildColorMap(); computeAvgAndDraw() })

const onWeightCanvasClick = (e) => {
  updateGuideFromEvent(e)
}

const updateGuideFromEvent = (e) => {
  const el = weightCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  weightCanvasRect = rect
  const hasOffset = typeof e.offsetX === 'number'
  const relX = hasOffset ? e.offsetX : (e.clientX - rect.left)
  if (typeof relX !== 'number' || isNaN(relX)) return
  activeGuideX.value = relX
  activeWeightPoint.value = null
  drawWeightChart()
}

const onWeightMouseDown = (e) => { isDragging = true; updateGuideFromEvent(e) }
const onWeightMouseMove = (e) => { if (isDragging) updateGuideFromEvent(e) }
const onWeightMouseUp = () => { isDragging = false }
const onWeightMouseLeave = () => {}
</script>

<style scoped>
.dashboard-container {
  padding: 0 4px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}
.header-date {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Main Stats Cards */
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0,0,0,0.03);
  height: 100px;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.primary-card .stat-icon-wrapper { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); color: #2563eb; }
.danger-card .stat-icon-wrapper { background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%); color: #dc2626; }
.success-card .stat-icon-wrapper { background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); color: #16a34a; }
.info-card .stat-icon-wrapper { background: linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%); color: #9333ea; }

.stat-content {
  flex: 1;
  min-width: 0;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

/* Health Tags */
.health-tags {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.health-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.health-dot.healthy { background: #10b981; }
.health-dot.sick { background: #ef4444; }
.health-dot.recovering { background: #f59e0b; }
.health-text {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.text-danger { color: #ef4444; }
.text-warning { color: #f59e0b; }

/* Mini Cards */
.mini-stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s;
}
.mini-stat-card:hover {
  border-color: #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.mini-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.bg-blue-light { background: #eff6ff; }
.text-blue { color: #3b82f6; }
.bg-purple-light { background: #faf5ff; }
.text-purple { color: #a855f7; }
.bg-green-light { background: #f0fdf4; }
.text-green { color: #22c55e; }
.bg-orange-light { background: #fff7ed; }
.text-orange { color: #f97316; }

.mini-info { flex: 1; }
.mini-label { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
.mini-num { font-size: 18px; font-weight: 700; color: #1f2937; }

/* Chart Cards */
.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  height: 100%;
}
.h-full { height: 100%; box-sizing: border-box; }
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trend-card { display: flex; flex-direction: column; gap: 8px; }
.avg-meta { display: flex; align-items: baseline; gap: 6px; }
.meta-label { font-size: 13px; color: #6b7280; }
.meta-value { font-size: 16px; font-weight: 700; color: #1f2937; }

.parrot-selector { position: relative; }
.selector-wrapper { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #f3f4f6; cursor: pointer; transition: background 0.2s; }
.selector-wrapper:hover { background: #e5e7eb; }
.selector-text { font-size: 13px; color: #374151; font-weight: 500; }
.selector-arrow { font-size: 10px; color: #6b7280; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 6px; min-width: 160px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); z-index: 10; padding: 4px; }
.dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; cursor: pointer; border-radius: 6px; }
.dropdown-item:hover { background: #f9fafb; }
.item-text { font-size: 13px; color: #374151; }
.check-icon { font-size: 12px; color: #10b981; }

.chart-wrapper { width: 100%; margin: 0 -12px; }
.weight-canvas { width: 100%; height: 180px; display: block; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px; }
.legend-item { display: flex; align-items: center; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.legend-name { font-size: 12px; color: #6b7280; }

/* Today Stats */
.today-stats-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.today-stat-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  transition: transform 0.2s;
}
.today-stat-box:hover { transform: translateX(4px); }
.success-box { background: #f0fdf4; border: 1px solid #dcfce7; }
.info-box { background: #eff6ff; border: 1px solid #dbeafe; }
.warning-box { background: #fff7ed; border: 1px solid #ffedd5; }

.today-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.success-box .today-icon { color: #16a34a; }
.info-box .today-icon { color: #2563eb; }
.warning-box .today-icon { color: #ea580c; }

.today-content { flex: 1; }
.today-label { font-size: 13px; color: #6b7280; margin-bottom: 2px; }
.today-val { font-size: 20px; font-weight: 700; color: #111827; }

.mt-6 { margin-top: 24px; }
</style>
