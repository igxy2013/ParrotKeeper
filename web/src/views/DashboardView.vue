<template>
  <div class="dashboard-container">
    <div class="page-header">
      <div class="page-header-left">
      <h2>仪表盘</h2>
       <div class="header-date">{{ currentDate }}</div>
      </div>
      <div class="time-range-tabs">
        <div
          v-for="item in timeRanges"
          :key="item.value"
          class="time-range-tab"
          :class="{ active: activeRange === item.value }"
          @click="setActiveRange(item.value)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>

    <!-- Top Stats Row -->
    <el-row :gutter="24" v-loading="loading">
      <el-col :span="6">
        <div class="stat-card primary-card" @click="goTo('/parrots')" style="cursor: pointer">
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
        <div class="stat-card danger-card" @click="goTo('/expenses')" style="cursor: pointer">
          <div class="stat-icon-wrapper">
             <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">{{ rangeText }}支出</div>
             <div class="stat-value">¥{{ stats.monthly_expense || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card success-card" @click="goTo('/expenses')" style="cursor: pointer">
          <div class="stat-icon-wrapper">
             <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
             <div class="stat-label">{{ rangeText }}收入</div>
             <div class="stat-value">¥{{ stats.monthly_income || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card info-card" @click="goTo('/records?tab=health')" style="cursor: pointer">
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
              <div class="mini-label">{{ rangeText }}喂食</div>
              <div class="mini-num">{{ stats.monthly_feeding || 0 }}</div>
           </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="mini-stat-card">
           <div class="mini-icon bg-orange-light"><el-icon class="text-orange"><Timer /></el-icon></div>
           <div class="mini-info">
              <div class="mini-label">{{ rangeText }}检查</div>
              <div class="mini-num">{{ stats.monthly_health_checks || 0 }}</div>
           </div>
        </div>
      </el-col>
    </el-row>

    <!-- Chart Row -->
    <el-row :gutter="24" class="mt-6" v-loading="loading">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
             <div class="header-title">
                 <el-icon><TrendCharts /></el-icon>
                 <span>体重趋势（{{ trendDays }} 天）</span>
              </div>
              <div class="header-actions">
                 <div class="avg-meta"><span class="meta-label">平均体重</span><span class="meta-value">{{ weightAvgChart || '--' }}</span></div>
                 <div class="avg-meta"><span class="meta-label">参考体重</span><span class="meta-value">{{ refWeightChart }}</span></div>
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
            <div class="weight-chart-wrapper">
              <canvas ref="weightCanvas" class="weight-canvas" @mousemove="onChartMouseMove" @mouseleave="onChartMouseLeave"></canvas>
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
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <div class="header-title">
              <el-icon><List /></el-icon>
              <span>品种分布</span>
            </div>
          </div>
          <div class="species-card">
            <div class="species-legend" v-if="speciesDistribution.length">
              <div class="species-legend-item" v-for="(it, idx) in speciesDistribution" :key="it.species">
                <span class="legend-dot" :style="{ backgroundColor: it.color }"></span>
                <span class="legend-name">{{ it.species }}</span>
                <span class="legend-count">{{ it.count }}</span>
                <span class="legend-percent">{{ it.percentage.toFixed(1) }}%</span>
              </div>
            </div>
            <div class="species-chart">
              <canvas ref="speciesCanvas" class="species-canvas" @click="onSpeciesPieClick"></canvas>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row :gutter="24" class="mt-12" v-loading="loading">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <div class="header-title">
              <el-icon><List /></el-icon>
              <span>最近活动</span>
            </div>
          </div>
          <div class="recent-list">
            <div v-if="!recentActivities.length" class="empty-tip">暂无最近活动</div>
            <div v-else class="recent-items">
              <div class="recent-item" v-for="item in recentActivities" :key="item.key">
                <div class="recent-icon" :class="item.type">
                  <el-icon v-if="item.type==='feeding'"><Dish /></el-icon>
                  <el-icon v-else-if="item.type==='cleaning'"><Brush /></el-icon>
                  <el-icon v-else-if="item.type==='health'"><FirstAidKit /></el-icon>
                  <el-icon v-else><Calendar /></el-icon>
                </div>
                <div class="recent-content">
                  <div class="recent-title">{{ item.title }}</div>
                  <div class="recent-meta">{{ item.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <div class="header-title">
              <el-icon><Warning /></el-icon>
              <span>健康提醒</span>
            </div>
          </div>
          <div class="alert-list">
            <div v-if="!healthAlerts.length" class="empty-tip">暂无健康异常</div>
            <div v-else class="alert-items">
              <div class="alert-item" v-for="a in healthAlerts" :key="a.key">
                <span class="alert-badge" :class="a.severity">{{ a.severity==='high' ? '高' : '中' }}</span>
                <span class="alert-text">{{ a.parrot_name }}：{{ a.message }}</span>
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
import { useRouter } from 'vue-router'
import { User, Wallet, Money, FirstAidKit, Dish, Calendar, Timer, TrendCharts, List, Brush, Warning } from '@element-plus/icons-vue'
import api from '../api/axios'

const router = useRouter()
const goTo = (path) => { router.push(path) }

const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const stats = ref({})
const loading = ref(true)

const timeRanges = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
  { label: '全部', value: 'all' }
]

const activeRange = ref('month')

const getDaysByRange = (range) => {
  if (range === 'week') return 7
  if (range === 'month') return 30
  if (range === 'year') return 365
  if (range === 'all') return 36500
  return 30
}

const trendDays = ref(getDaysByRange(activeRange.value))

const weightSeries = ref([])
const selectedParrotId = ref('')
const selectedParrotName = ref('')
const showParrotDropdown = ref(false)
const hoverIndex = ref(-1)
const weightAvgChart = ref('')
const weightCanvas = ref(null)
const weightColorMap = ref({})
const activeWeightPoint = ref(null)
const activeGuideX = ref(null)
let isDragging = false
let weightTapAreas = []
let weightCanvasRect = null

const refWeightChart = computed(() => {
  const sid = selectedParrotId.value
  if (!sid) return '--'
  const list = weightSeries.value || []
  const s = list.find(x => String(x.parrot_id) === String(sid))
  const v = s && s.species_ref_weight_g
  if (typeof v === 'number' && isFinite(v) && v > 0) return v.toFixed(1) + 'g'
  return '--'
})

const palette = ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']

const displaySeries = computed(() => {
  const list = weightSeries.value || []
  const sid = selectedParrotId.value
  if (sid) return list.filter(s => String(s.parrot_id) === String(sid))
  return list.slice(0, 12)
})

const rangeText = computed(() => {
  if (activeRange.value === 'week') return '本周'
  if (activeRange.value === 'year') return '本年'
  if (activeRange.value === 'all') return '累计'
  return '本月'
})

const recentActivities = ref([])
const healthAlerts = ref([])

// Species Distribution
const speciesDistribution = ref([])
const speciesCanvas = ref(null)
const selectedSpeciesIndex = ref(-1)
const speciesColors = ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']

const fetchRecentActivities = async () => {
  try {
    const res = await api.get('/records/recent', { params: { limit: 6 } })
    const data = res.data?.data || {}
    const list = []
    const add = (arr, type) => {
      (arr || []).forEach(r => {
        let t = ''
        if (type === 'feeding') t = r.feeding_time
        else if (type === 'health') t = r.record_date
        else if (type === 'cleaning') t = r.cleaning_time
        else t = r.created_at
        const time = t ? new Date(t).toLocaleString('zh-CN') : ''
        const title = type === 'feeding' ? '喂食' : type === 'cleaning' ? '清洁' : type === 'health' ? '健康' : '繁殖'
        list.push({
          key: `${type}-${r.id}`,
          type,
          title: `${title}${r.parrot?.name ? ' · ' + r.parrot.name : ''}`,
          time
        })
      })
    }
    add(data.feeding, 'feeding')
    add(data.health, 'health')
    add(data.cleaning, 'cleaning')
    add(data.breeding, 'breeding')
    list.sort((a, b) => (new Date(b.time).getTime() || 0) - (new Date(a.time).getTime() || 0))
    recentActivities.value = list.slice(0, 8)
  } catch (_) {
    recentActivities.value = []
  }
}

const fetchHealthAlerts = async (days) => {
  try {
    const d = typeof days === 'number' ? days : trendDays.value || 30
    const res = await api.get('/statistics/health-anomalies', { params: { days: d } })
    const results = res.data?.data?.results || []
    const items = []
    results.forEach(p => {
      (p.anomalies || []).forEach(an => {
        items.push({
          key: `${p.parrot_id}-${an.type}-${an.severity}`,
          parrot_name: p.parrot_name,
          severity: an.severity || 'medium',
          message: an.message || ''
        })
      })
    })
    healthAlerts.value = items.slice(0, 8)
  } catch (_) {
    healthAlerts.value = []
  }
}

const fetchOverview = async () => {
  const res = await api.get('/statistics/overview', { params: { days: trendDays.value } })
  if (res.data && res.data.success) {
    stats.value = res.data.data
  }
}

const fetchWeightTrends = async () => {
  const wt = await api.get('/statistics/weight-trends', { params: { days: trendDays.value } })
  if (wt.data && wt.data.success && Array.isArray(wt.data.data?.series)) {
    weightSeries.value = wt.data.data.series || []
    if (!selectedParrotId.value) {
      const list = weightSeries.value || []
      let best = null
      for (let i = 0; i < list.length; i++) {
        const pts = Array.isArray(list[i].points) ? list[i].points : []
        if (!best || pts.length > best.count) {
          best = { id: list[i].parrot_id, name: list[i].parrot_name, count: pts.length }
        }
      }
      if (best && best.id) {
        selectedParrotId.value = best.id
        selectedParrotName.value = best.name || ''
      }
    }
    buildColorMap()
    await computeAvgAndDraw()
  }
}

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

  const avgMap = {}
  const countMap = {}
  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i]
    const d = p.date
    if (!d) continue
    const w = p.weight
    if (typeof w !== 'number' || !isFinite(w) || isNaN(w)) continue
    if (!avgMap[d]) {
      avgMap[d] = w
      countMap[d] = 1
    } else {
      avgMap[d] += w
      countMap[d] += 1
    }
  }
  const dateArray = dates.slice()
  for (let i = 0; i < dateArray.length; i++) {
    const d = dateArray[i]
    if (countMap[d] && countMap[d] > 0) {
      avgMap[d] = avgMap[d] / countMap[d]
    }
  }

  if (dateArray.length > 0) {
    const span = dateArray.length === 1 ? chartW : chartW / (dateArray.length - 1)
    const barWidth = Math.max(6, Math.min(32, span * 0.6))
    const barTopPadding = 4
    const barBottomPadding = 2
    let baseBarHex = '#10b981'
    const sidForColor = selectedParrotId.value ? String(selectedParrotId.value) : ''
    if (sidForColor && weightColorMap.value && weightColorMap.value[sidForColor]) {
      baseBarHex = weightColorMap.value[sidForColor]
    } else {
      const ds = displaySeries.value || []
      if (ds.length === 1) {
        const s0 = ds[0]
        const key = String(s0.parrot_id)
        if (weightColorMap.value && weightColorMap.value[key]) {
          baseBarHex = weightColorMap.value[key]
        }
      }
    }
    let barColor = 'rgba(16, 185, 129, 0.12)'
    if (typeof baseBarHex === 'string') {
      const m = baseBarHex.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
      if (m) {
        const r = parseInt(m[1], 16)
        const g = parseInt(m[2], 16)
        const b = parseInt(m[3], 16)
        barColor = `rgba(${r}, ${g}, ${b}, 0.16)`
      }
    }
    for (let i = 0; i < dateArray.length; i++) {
      const d = dateArray[i]
      const avgW = avgMap[d]
      if (typeof avgW !== 'number' || !isFinite(avgW) || isNaN(avgW)) continue
      const norm = (avgW - minW) / (maxW - minW)
      if (!isFinite(norm) || isNaN(norm)) continue
      const centerX = dateArray.length === 1
        ? paddingLeft + chartW / 2
        : paddingLeft + (i / (dateArray.length - 1)) * chartW
      const barBottom = height - paddingBottom - barBottomPadding
      const barTop = paddingTop + barTopPadding + (1 - norm) * chartH
      if (barTop >= barBottom) continue
      const halfW = barWidth / 2
      const left = centerX - halfW
      const right = centerX + halfW
      const radius = Math.min(12, (barBottom - barTop) / 2, halfW)
      ctx.beginPath()
      ctx.moveTo(left + radius, barTop)
      ctx.lineTo(right - radius, barTop)
      ctx.quadraticCurveTo(right, barTop, right, barTop + radius)
      ctx.lineTo(right, barBottom - radius)
      ctx.quadraticCurveTo(right, barBottom, right - radius, barBottom)
      ctx.lineTo(left + radius, barBottom)
      ctx.quadraticCurveTo(left, barBottom, left, barBottom - radius)
      ctx.lineTo(left, barTop + radius)
      ctx.quadraticCurveTo(left, barTop, left + radius, barTop)
      ctx.fillStyle = barColor
      ctx.fill()
    }
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

  // Hover effect logic
  if (hoverIndex.value !== -1 && dates.length > 0) {
    let hoverDateIdx = hoverIndex.value
    if (hoverDateIdx < 0) hoverDateIdx = 0
    if (hoverDateIdx >= dates.length) hoverDateIdx = dates.length - 1
    
    const dateSel = dates[hoverDateIdx]
    const guideXPos = (dates.length === 1) ? (paddingLeft + chartW / 2) : (paddingLeft + (hoverDateIdx / (dates.length - 1)) * chartW)

    // Draw guide line
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

    // Collect items for the tooltip
    const items = []
    for (let si = 0; si < series.length; si++) {
      const s = series[si]
      const p = (s.points || []).find(pt => pt && pt.date === dateSel && typeof pt.weight === 'number' && !isNaN(pt.weight) && pt.weight > 0)
      if (!p) continue
      
      const norm = (p.weight - minW) / (maxW - minW)
      if (!isFinite(norm) || isNaN(norm)) continue
      const y = paddingTop + (1 - norm) * chartH
      const color = weightColorMap.value[String(s.parrot_id)] || palette[si % palette.length]

      // Draw point circle
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
    
    // Draw aggregated tooltip box
    if (items.length > 0) {
      const headerText = dateSel || ''
      ctx.font = 'bold 12px sans-serif'
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
      // Intelligent positioning
      if (guideXPos < width / 2) { 
        boxX = guideXPos + margin
        if (boxX + boxW > width - 8) boxX = width - 8 - boxW 
      } else { 
        boxX = guideXPos - margin - boxW
        if (boxX < 8) boxX = 8 
      }
      
      let boxY = paddingTop + 8
      if (boxY + boxH > height - paddingBottom - 8) boxY = height - paddingBottom - 8 - boxH
      
      // Draw Box Background
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      
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
      
      // Draw Header
      ctx.save()
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(headerText, boxX + paddingX, boxY + paddingY)
      ctx.restore()
      
      // Draw Items
      let curY = boxY + paddingY + headerH + lineGap
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        ctx.save()
        
        // Color Dot
        ctx.fillStyle = it.color
        ctx.beginPath()
        ctx.arc(boxX + paddingX + 3, curY + itemH / 2, 3, 0, Math.PI * 2)
        ctx.fill()
        
        // Text
        ctx.fillStyle = '#374151'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.font = '11px sans-serif'
        ctx.fillText(it.text, boxX + paddingX + dotW, curY + itemH / 2)
        
        ctx.restore()
        curY += itemH
      }
    }
  }
}

const onChartMouseMove = (e) => {
  const el = weightCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  
  const width = rect.width
  const paddingLeft = 48
  const paddingRight = 18
  const innerWidth = width - paddingLeft - paddingRight
  
  const series = displaySeries.value || []
  if (!series.length) return

  const dateSet = new Set()
  for (let i = 0; i < series.length; i++) {
    const pts = Array.isArray(series[i].points) ? series[i].points : []
    for (let j = 0; j < pts.length; j++) {
      if (pts[j].date) dateSet.add(pts[j].date)
    }
  }
  const dates = Array.from(dateSet).sort()
  if (dates.length < 1) return

  let idx
  if (dates.length === 1) {
    idx = 0
  } else {
    const xStep = innerWidth / (dates.length - 1)
    idx = Math.round((mouseX - paddingLeft) / xStep)
  }

  if (idx < 0) idx = 0
  if (idx >= dates.length) idx = dates.length - 1
  
  if (hoverIndex.value !== idx) {
    hoverIndex.value = idx
    activeGuideX.value = null // Disable click-based guide
    drawWeightChart()
  }
}

const onChartMouseLeave = () => {
  if (hoverIndex.value !== -1) {
    hoverIndex.value = -1
    drawWeightChart()
  }
}

onMounted(async () => {
  try {
    await fetchOverview()
    await fetchWeightTrends()
    await fetchRecentActivities()
    await fetchHealthAlerts(trendDays.value)
    await loadSpeciesDistribution()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  const onResize = () => computeAvgAndDraw()
  window.addEventListener('resize', onResize)
  resizeHandler = onResize
})

const setActiveRange = async (range) => {
  if (activeRange.value === range) return
  activeRange.value = range
  trendDays.value = getDaysByRange(range)
  loading.value = true
  try {
    await fetchOverview()
    await fetchWeightTrends()
    await fetchHealthAlerts(trendDays.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

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

const loadSpeciesDistribution = async () => {
  try {
    const res = await api.get('/parrots', { params: { page: 1, per_page: 1000 } })
    const arr = res.data?.data?.parrots || []
    const counts = {}
    for (let i = 0; i < arr.length; i++) {
      const sp = (arr[i]?.species?.name || '未知品种')
      counts[sp] = (counts[sp] || 0) + 1
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const items = Object.keys(counts).map((name, idx) => ({
      species: name,
      count: counts[name],
      percentage: total > 0 ? (counts[name] / total) * 100 : 0,
      color: speciesColors[idx % speciesColors.length]
    })).sort((a, b) => b.count - a.count)
    speciesDistribution.value = items
    await nextTick()
    drawSpeciesPie()
  } catch (e) {
    speciesDistribution.value = []
  }
}

const drawSpeciesPie = () => {
  const el = speciesCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const w = Math.max(240, Math.floor(rect.width || 320))
  const h = Math.max(180, Math.floor(rect.height || 200))
  const dpr = window.devicePixelRatio || 1
  el.width = Math.floor(w * dpr)
  el.height = Math.floor(h * dpr)
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const data = speciesDistribution.value || []
  if (!data.length) {
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '14px sans-serif'
    ctx.fillText('暂无品种数据', w / 2, h / 2)
    return
  }
  const cx = w / 2
  const cy = h / 2
  const baseR = Math.min(w, h) / 2 - 16
  const innerR = baseR * 0.55
  let start = -Math.PI / 2
  for (let i = 0; i < data.length; i++) {
    const it = data[i]
    const angle = (it.percentage / 100) * Math.PI * 2
    const end = start + angle
    const isSel = i === selectedSpeciesIndex.value
    const outerR = isSel ? baseR + 6 : baseR
    if (angle > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, outerR, start, end)
      ctx.arc(cx, cy, innerR, end, start, true)
      ctx.closePath()
      ctx.fillStyle = it.color
      if (selectedSpeciesIndex.value !== -1 && !isSel) ctx.globalAlpha = 0.3
      else ctx.globalAlpha = 1.0
      ctx.fill()
      if (isSel) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke() }
    }
    start = end
  }
  ctx.globalAlpha = 1.0
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const total = data.reduce((s, it) => s + (it.count || 0), 0)
  if (selectedSpeciesIndex.value !== -1) {
    const sel = data[selectedSpeciesIndex.value]
    ctx.fillStyle = sel.color
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(sel.species, cx, cy - 16)
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(String(sel.count), cx, cy + 6)
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.fillText(sel.percentage.toFixed(1) + '%', cx, cy + 24)
  } else {
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.fillText('总数', cx, cy - 16)
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(String(total), cx, cy + 6)
  }
}

const onSpeciesPieClick = (e) => {
  const el = speciesCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = rect.width
  const h = rect.height
  const cx = w / 2
  const cy = h / 2
  const baseR = Math.min(w, h) / 2 - 16
  const innerR = baseR * 0.55
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < innerR || dist > baseR) return
  let ang = Math.atan2(dy, dx)
  if (ang < -Math.PI / 2) ang += Math.PI * 2
  const data = speciesDistribution.value || []
  let start = -Math.PI / 2
  for (let i = 0; i < data.length; i++) {
    const angle = (data[i].percentage / 100) * Math.PI * 2
    const end = start + angle
    if (ang >= start && ang <= end) {
      const newIdx = (selectedSpeciesIndex.value === i) ? -1 : i
      selectedSpeciesIndex.value = newIdx
      drawSpeciesPie()
      break
    }
    start = end
  }
}
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
.page-header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
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

.time-range-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(243, 244, 246, 0.9);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

.time-range-tab {
  min-width: 56px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
  color: #4b5563;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.time-range-tab.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.time-range-tab:not(.active):hover {
  background: #e5e7eb;
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

/* Species Card */
.species-card { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; }
.species-legend { display: flex; flex-direction: column; gap: 6px; }
.species-legend-item { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: #f9fafb; }
.species-legend .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.species-legend .legend-name { font-size: 13px; color: #374151; }
.species-legend .legend-count { font-size: 13px; font-weight: 600; color: #111827; }
.species-legend .legend-percent { font-size: 12px; color: #6b7280; }
.species-chart { display: flex; align-items: center; justify-content: center; }
.species-canvas { width: 100%; height: 200px; }
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
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  height: 100%;
}
.h-full { height: 100%; box-sizing: border-box; }
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
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
.mt-8 { margin-top: 32px; }
.mt-12 { margin-top: 48px; }

.recent-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
.recent-items { display: flex; flex-direction: column; gap: 6px; }
.recent-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
.recent-item:last-child { border-bottom: none; }
.recent-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #f5f7fa; }
.recent-content { display: flex; flex-direction: column; }
.recent-title { font-size: 13px; color: #1f2937; font-weight: 600; }
.recent-meta { font-size: 12px; color: #6b7280; }

.alert-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
.alert-items { display: flex; flex-direction: column; gap: 6px; }
.alert-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
.alert-item:last-child { border-bottom: none; }
.alert-badge { display:inline-block; padding: 2px 6px; border-radius: 999px; font-size: 12px; color: #fff; }
.alert-badge.high { background: #ef4444; }
.alert-badge.medium { background: #f59e0b; }
.alert-text { font-size: 13px; color: #1f2937; }
.empty-tip { font-size: 13px; color: #6b7280; }

/* thin scrollbars inside lists */
.recent-list::-webkit-scrollbar, .alert-list::-webkit-scrollbar { width: 6px; }
.recent-list::-webkit-scrollbar-thumb, .alert-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 8px; }
</style>
