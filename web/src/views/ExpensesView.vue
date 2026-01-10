<template>
  <div class="expenses-page page-container">
    <div class="page-header">
      <h2>收支管理</h2>
      <div class="header-actions">
        <div class="time-range-tabs">
          <div
            v-for="p in periods"
            :key="p"
            class="time-range-tab"
            :class="{ active: selectedPeriod === p }"
            @click="setSelectedPeriod(p)"
          >
            {{ p }}
          </div>
        </div>
        <el-button type="primary" :icon="Plus" @click="openDialog">添加收支记录</el-button>
      </div>
    </div>

    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card clickable" @click="filterByStat('支出')">
        <div class="stat-content-wrapper">
          <div class="stat-icon-box icon-expense">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">总支出</div>
            <div class="stat-value expense">¥{{ formatAmount(stats.totalExpense) }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card clickable" @click="filterByStat('收入')">
        <div class="stat-content-wrapper">
          <div class="stat-icon-box icon-income">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">总收入</div>
            <div class="stat-value income">¥{{ formatAmount(stats.totalIncome) }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-content-wrapper">
          <div class="stat-icon-box icon-net">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">净收入</div>
            <div class="stat-value" :class="stats.netIncome >= 0 ? 'income' : 'expense'">
              ¥{{ formatAmount(stats.netIncome) }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card count-item">
        <div class="stat-content-wrapper">
          <div class="stat-icon-box icon-count">
            <el-icon><Tickets /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">当前列表记录数</div>
            <div class="stat-value">{{ displayTotalCount }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="analysis-row">
      <el-card class="analysis-card" shadow="never">
        <div class="card-header-row">
          <div class="card-title-row">
            <span class="card-icon"><el-icon><TrendCharts /></el-icon></span>
            <span class="card-title-text">收支趋势</span>
          </div>
          <div class="trend-controls">
            <div class="controls-row" v-if="selectedPeriod !== '全部'">
              <div class="nav-btn" @click="onPrevTrendDate">
                <img class="nav-icon left" src="/arrow-right-s-line.png" />
              </div>
              <el-date-picker
                v-if="selectedPeriod === '今天' || selectedPeriod === '本周'"
                v-model="trendPickerDate"
                type="date"
                :clearable="false"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="date-input"
                size="large"
                @change="onTrendDateChange"
              />
              <el-date-picker
                v-else-if="selectedPeriod === '本月'"
                v-model="trendPickerDate"
                type="month"
                :clearable="false"
                format="YYYY-MM"
                value-format="YYYY-MM"
                class="date-input"
                size="large"
                @change="onTrendDateChange"
              />
              <el-date-picker
                v-else-if="selectedPeriod === '本年'"
                v-model="trendPickerDate"
                type="year"
                :clearable="false"
                format="YYYY"
                value-format="YYYY"
                class="date-input"
                size="large"
                @change="onTrendDateChange"
              />
              <div class="nav-btn" @click="onNextTrendDate">
                <img class="nav-icon" src="/arrow-right-s-line.png" />
              </div>
            </div>
          </div>
        </div>
        <div class="analysis-content">
          <VChart
            v-if="trendData.length"
            :option="chartOption"
            autoresize
            class="trend-chart"
          />
          <div v-else class="empty-tip">暂无趋势数据</div>
        </div>
      </el-card>

      <el-card class="analysis-card" shadow="never">
        <div class="card-header-row">
          <div class="card-title-row">
            <span class="card-icon"><el-icon><Wallet /></el-icon></span>
            <span class="card-title-text">收支分布</span>
          </div>
          <div class="analysis-tabs">
            <span
              class="analysis-tab"
              :class="{ active: analysisType === '支出' }"
              @click="setAnalysisType('支出')"
            >支出</span>
            <span
              class="analysis-tab"
              :class="{ active: analysisType === '收入' }"
              @click="setAnalysisType('收入')"
            >收入</span>
          </div>
        </div>
        <div class="analysis-content" v-loading="analysisLoading">
          <div v-if="expenseAnalysis.length" class="analysis-grid">
            <div class="legend-col">
              <div class="legend-item clickable" v-for="item in expenseAnalysis" :key="item.category" @click="onAnalysisLegendClick(item)">
                <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
                <span class="legend-name">{{ item.categoryLabel }}</span>
                <div class="legend-amount">
                  <span class="amount">¥{{ formatAmount(item.amount) }}</span>
                  <span class="percent">{{ item.percentage.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
            <div class="chart-col">
              <canvas ref="expensePieCanvas" class="pie-canvas" @click="handleExpensePieClick"></canvas>
            </div>
          </div>
          <div class="empty-tip" v-else>暂无{{ analysisType }}数据</div>
        </div>
      </el-card>
    </div>

    <div class="toolbar">
      <div class="filter-group">
        <el-radio-group v-model="recordType" size="default" @change="onRecordTypeChange">
          <el-radio-button v-for="t in recordTypeOptions" :key="t" :value="t">{{ t }}</el-radio-button>
        </el-radio-group>
        
        <div class="category-tags" v-if="categoryOptions.length > 1">
          <span 
            v-for="c in categoryOptions" 
            :key="c" 
            class="category-tag" 
            :class="{ active: selectedCategory === c }"
            @click="onCategoryTagClick(c)"
          >
            {{ c }}
          </span>
        </div>
      </div>

      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索类型、类别、描述或鹦鹉名称"
          @input="onSearch"
          clearable
          style="width: 260px"
        />
        <el-button @click="refresh" :loading="loading">刷新</el-button>
      </div>
    </div>

    <el-table :data="filteredRecords" v-loading="loading" style="width: 100%">
      <el-table-column prop="date" label="日期" width="120" />
      <el-table-column prop="created_at" label="时间" width="120">
        <template #default="scope">
          {{ formatTime(scope.row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.type === '收入' ? 'success' : 'danger'">
            {{ scope.row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="category_text" label="类别" width="140" />
      <el-table-column prop="amount" label="金额" width="140" align="right">
        <template #default="scope">
          <span :class="scope.row.type === '收入' ? 'amount-income' : 'amount-expense'">
            {{ scope.row.type === '收入' ? '+' : '-' }}¥{{ formatAmount(scope.row.amount) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="备注" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="scope">
          <el-button type="success" link size="small" @click="openEdit(scope.row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      class="pagination"
      layout="prev, pager, next"
      :total="total"
      :page-size="perPage"
      :current-page="page"
      @current-change="onPageChange"
    />

    <ExpenseModal 
      v-model="dialogVisible" 
      :record="editingRecord"
      @success="onModalSuccess"
    />
    <LimitModal 
      v-model="showPermissionModal"
      mode="info"
      title="无权限提示"
      message="您没有新增收支的权限"
      :show-redeem="false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Wallet, TrendCharts, Money, Coin, Tickets } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import api from '@/api/axios'
import ExpenseModal from '../components/ExpenseModal.vue'
import { getCache, setCache } from '@/utils/cache'
import { useAuthStore } from '@/stores/auth'
import LimitModal from '../components/LimitModal.vue'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const authStore = useAuthStore()
const loading = ref(false)
const records = ref([])
const filteredRecords = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(50)

const periods = ['今天', '本周', '本月', '本年', '全部']
const selectedPeriod = ref('本月')

const recordTypeOptions = ['全部', '收入', '支出']
const recordType = ref('全部')

const expenseCategories = ['全部', '食物', '医疗', '玩具', '笼具', '幼鸟', '种鸟', '其他']
const incomeCategories = ['全部', '繁殖销售', '鸟类销售', '服务收入', '比赛奖金', '其他收入']
const categoryOptions = ref(['全部'])
const selectedCategory = ref('全部')

const categoryMap = {
  food: '食物',
  medical: '医疗',
  toys: '玩具',
  cage: '笼具',
  baby_bird: '幼鸟',
  breeding_bird: '种鸟',
  other: '其他'
}

const incomeReverseMap = {
  繁殖销售: 'breeding_sale',
  鸟类销售: 'bird_sale',
  服务收入: 'service',
  比赛奖金: 'competition',
  其他收入: 'other'
}

const stats = ref({
  totalExpense: 0,
  totalIncome: 0,
  netIncome: 0
})

const trendData = ref([])
const chartOption = ref({})

const displayTotalCount = ref(0)
const searchKeyword = ref('')

const analysisLoading = ref(false)
const expenseAnalysis = ref([])
const selectedExpenseIndex = ref(-1)
const expensePieCanvas = ref(null)
const analysisType = ref('支出')
const pieColors = ['#f97373', '#fb923c', '#facc15', '#22c55e', '#2dd4bf', '#fb7185', '#fbbf24', '#4ade80', '#34d399', '#38bdf8', '#a855f7']

const EXPENSES_CACHE_TTL = 60000

const trendPickerDate = ref('')
const trendCurrentDateObj = ref(null)
const selectedStartDate = ref('')
const selectedEndDate = ref('')
const showPermissionModal = ref(false)

const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getWeekRange = (date) => {
  const d = new Date(date)
  const day = d.getDay() || 7
  const start = new Date(d)
  start.setDate(d.getDate() - day + 1)
  start.setHours(0,0,0,0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  end.setHours(0,0,0,0)
  return { start, end }
}

const setSelectedRangeByPeriod = (date) => {
  const p = selectedPeriod.value
  if (p === '全部') { selectedStartDate.value = ''; selectedEndDate.value = ''; return }
  if (p === '今天') {
    const s = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const e = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    selectedStartDate.value = formatDate(s)
    selectedEndDate.value = formatDate(e)
    return
  }
  if (p === '本周') {
    const { start, end } = getWeekRange(date)
    selectedStartDate.value = formatDate(start)
    selectedEndDate.value = formatDate(end)
    return
  }
  if (p === '本月') {
    const s = new Date(date.getFullYear(), date.getMonth(), 1)
    const e = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    selectedStartDate.value = formatDate(s)
    selectedEndDate.value = formatDate(e)
    return
  }
  if (p === '本年') {
    const s = new Date(date.getFullYear(), 0, 1)
    const e = new Date(date.getFullYear() + 1, 0, 1)
    selectedStartDate.value = formatDate(s)
    selectedEndDate.value = formatDate(e)
    return
  }
}

const onTrendDateChange = (val) => {
  if (!val) return
  let date
  if (selectedPeriod.value === '本年') { const y = parseInt(String(val)); date = new Date(y, 0, 1) }
  else if (selectedPeriod.value === '本月') { const parts = String(val).split('-'); date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1) }
  else { const parts = String(val).split('-'); date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2] || '1')) }
  trendCurrentDateObj.value = date.getTime()
  setSelectedRangeByPeriod(date)
  loadTrend()
  loadExpenseAnalysis()
  page.value = 1
  loadExpenses()
  loadStats()
}

const onPrevTrendDate = () => {
  const date = new Date(trendCurrentDateObj.value || Date.now())
  if (selectedPeriod.value === '本月') date.setMonth(date.getMonth() - 1)
  else if (selectedPeriod.value === '本年') date.setFullYear(date.getFullYear() - 1)
  else date.setDate(date.getDate() - 7)
  trendCurrentDateObj.value = date.getTime()
  if (selectedPeriod.value === '本年') trendPickerDate.value = String(date.getFullYear())
  else if (selectedPeriod.value === '本月') { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2,'0'); trendPickerDate.value = `${y}-${m}` }
  else trendPickerDate.value = formatDate(date)
  setSelectedRangeByPeriod(date)
  loadTrend()
  loadExpenseAnalysis()
  page.value = 1
  loadExpenses()
  loadStats()
}

const onNextTrendDate = () => {
  const date = new Date(trendCurrentDateObj.value || Date.now())
  if (selectedPeriod.value === '本月') date.setMonth(date.getMonth() + 1)
  else if (selectedPeriod.value === '本年') date.setFullYear(date.getFullYear() + 1)
  else date.setDate(date.getDate() + 7)
  trendCurrentDateObj.value = date.getTime()
  if (selectedPeriod.value === '本年') trendPickerDate.value = String(date.getFullYear())
  else if (selectedPeriod.value === '本月') { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2,'0'); trendPickerDate.value = `${y}-${m}` }
  else trendPickerDate.value = formatDate(date)
  setSelectedRangeByPeriod(date)
  loadTrend()
  loadExpenseAnalysis()
  page.value = 1
  loadExpenses()
  loadStats()
}
const buildListCacheKey = () => {
  const period = selectedPeriod.value
  const type = recordType.value
  const category = selectedCategory.value
  const s = selectedStartDate.value || ''
  const e = selectedEndDate.value || ''
  const keyParams = (s && e) ? `${s}|${e}` : 'all'
  return `expenses_list|${period}|${type}|${category}|${keyParams}|${page.value}|${perPage.value}`
}

const buildStatsCacheKey = () => {
  const period = selectedPeriod.value
  const type = recordType.value
  const category = selectedCategory.value
  const s = selectedStartDate.value || ''
  const e = selectedEndDate.value || ''
  const keyParams = (s && e) ? `${s}|${e}` : 'all'
  return `expenses_stats|${period}|${type}|${category}|${keyParams}`
}

const buildTrendCacheKey = (params) => {
  const period = selectedPeriod.value
  const s = params?.start_date || ''
  const e = params?.end_date || ''
  const pt = ['本年','全部'].includes(period) ? 'month' : 'day'
  return `expenses_trend|${period}|${s}|${e}|${pt}`
}

const buildAnalysisCacheKey = () => {
  const type = analysisType.value
  const dr = getDateRange()
  const s = dr.start_date || ''
  const e = dr.end_date || ''
  const period = selectedPeriod.value
  const keyParams = (s && e) ? `${s}|${e}` : 'all'
  return `expenses_analysis|${type}|${period}|${keyParams}`
}

const incomeCategoryLabelMap = {
  breeding_sale: '繁殖销售',
  bird_sale: '鸟类销售',
  service: '服务收入',
  competition: '比赛奖金',
  other: '其他收入'
}

const dialogVisible = ref(false)
const editingRecord = ref(null)

const getToday = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  return `${y}-${m}-${day}`
}

const updateCategoryOptions = () => {
  const type = recordType.value
  let opts = ['全部']
  if (type === '收入') {
    opts = incomeCategories.slice()
  } else if (type === '支出') {
    opts = expenseCategories.slice()
  } else {
    opts = ['全部', ...expenseCategories.slice(1), ...incomeCategories.slice(1)]
  }
  categoryOptions.value = opts
  if (!opts.includes(selectedCategory.value)) {
    selectedCategory.value = '全部'
  }
}

const getDateRange = () => {
  const now = new Date()
  let startDate
  let endDate
  if (selectedStartDate.value && selectedEndDate.value) {
    return { start_date: selectedStartDate.value, end_date: selectedEndDate.value }
  }

  const formatLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  switch (selectedPeriod.value) {
    case '今天':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      break
    case '本周': {
      const dayOfWeek = now.getDay() // 0=周日,1=周一,...
      const mondayOffset = dayOfWeek === 0 ? -6 : (1 - dayOfWeek)
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7) // 结束为下周一（独占）
      break
    }
    case '本月':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      break
    case '本年':
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear() + 1, 0, 1)
      break
    case '全部':
    default:
      return {}
  }

  return {
    start_date: formatLocalDate(startDate),
    end_date: formatLocalDate(endDate)
  }
}

const getSelectedCategoryValue = () => {
  const label = selectedCategory.value
  const type = recordType.value
  if (!label || label === '全部') return ''

  const expenseValue = Object.keys(categoryMap).find((key) => categoryMap[key] === label)
  const incomeValue = incomeReverseMap[label]

  if (type === '支出') {
    return expenseValue || ''
  }
  if (type === '收入') {
    return incomeValue || ''
  }
  return expenseValue || incomeValue || ''
}

const loadExpenses = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const dateParams = getDateRange()
    const selectedType = recordType.value
    const selectedCategoryLabel = selectedCategory.value

    const expenseCategoryValue = Object.keys(categoryMap).find((k) => categoryMap[k] === selectedCategoryLabel)
    const incomeCategoryValue = incomeReverseMap[selectedCategoryLabel]

    const commonParams = {
      per_page: perPage.value,
      ...dateParams
    }

    if (selectedCategoryLabel !== '全部' && (selectedType === '支出' || (selectedType === '全部' && expenseCategories.includes(selectedCategoryLabel))) && expenseCategoryValue) {
      commonParams.category = expenseCategoryValue
    }

    if (selectedCategoryLabel !== '全部' && (selectedType === '收入' || (selectedType === '全部' && incomeCategories.includes(selectedCategoryLabel))) && incomeCategoryValue) {
      commonParams.category = incomeCategoryValue
    }

    if (selectedType !== '全部') {
      commonParams.record_type = selectedType
    }

    const params = {
      page: page.value,
      ...commonParams
    }

    const listKey = buildListCacheKey()
    const cached = getCache(listKey, EXPENSES_CACHE_TTL)
    if (cached && Array.isArray(cached.items)) {
      records.value = cached.items
      total.value = cached.total || cached.items.length || 0
      applyFilters()
    } else {
      try {
        const res = await api.get('/expenses/transactions', { params })
        if (res.data && res.data.success) {
          const data = res.data.data || {}
          const items = Array.isArray(data.items) ? data.items : []
          records.value = items
          total.value = data.total || items.length || 0
          setCache(listKey, { items, total: total.value })
          applyFilters()
        } else {
          const msg = (res.data && res.data.message) || '加载记录失败'
          ElMessage.error(msg)
        }
      } catch (e) {
        const msg = e && e.response && e.response.data && e.response.data.message
          ? e.response.data.message
          : (e.message || '加载记录失败')
        if (e && e.response && e.response.status === 403) {
          ElMessage.error(msg || '您没有查看收支的权限')
        } else {
          ElMessage.error(msg)
        }
      }
    }
  } catch (e) {
    const msg = e && e.message ? e.message : '加载记录失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const loadTrend = async () => {
  try {
    const dateParams = getDateRange()
    const periodType = ['本年', '全部'].includes(selectedPeriod.value) ? 'month' : 'day'
    const params = {
      ...dateParams,
      period: periodType
    }
    const trendKey = buildTrendCacheKey(dateParams)
    let raw = []
    const cached = getCache(trendKey, EXPENSES_CACHE_TTL)
    if (cached && Array.isArray(cached)) {
      raw = cached
    } else {
      try {
        const res = await api.get('/expenses/trend', { params })
        const payload = res.data || {}
        raw = Array.isArray(payload.data) ? payload.data : []
        setCache(trendKey, raw)
      } catch (e) {
        const msg = e && e.response && e.response.data && e.response.data.message
          ? e.response.data.message
          : (e.message || '加载趋势失败')
        if (e && e.response && e.response.status === 403) {
          ElMessage.error(msg || '您没有查看收支的权限')
        } else {
          ElMessage.error(msg)
        }
        raw = []
      }
    }

    let data = raw

    if (selectedPeriod.value !== '全部') {
      const map = {}
      raw.forEach(item => {
        if (item && item.date) {
          map[item.date] = item
        }
      })

      if (periodType === 'day' && dateParams.start_date && dateParams.end_date) {
        const start = new Date(dateParams.start_date + 'T00:00:00')
        const end = new Date(dateParams.end_date + 'T00:00:00')
        const list = []
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const key = `${y}-${m}-${day}`
          const found = map[key] || {}
          list.push({
            date: key,
            income: Number(found.income || 0),
            expense: Number(found.expense || 0),
            net: Number(found.net || 0)
          })
        }
        data = list
      } else if (periodType === 'month') {
        const now = new Date()
        const year = now.getFullYear()
        const list = []
        for (let m = 1; m <= 12; m++) {
          const mm = String(m).padStart(2, '0')
          const key = `${year}-${mm}`
          const found = map[key] || {}
          list.push({
            date: key,
            income: Number(found.income || 0),
            expense: Number(found.expense || 0),
            net: Number(found.net || 0)
          })
        }
        data = list
      }
    }

    trendData.value = data

    const xAxisData = data.map(item => item.date)
    const incomeSeries = data.map(item => Number(item.income || 0))
    const expenseSeries = data.map(item => Number(item.expense || 0))
    const netSeries = data.map(item => Number(item.net || 0))
    const maxVal = Math.max(
      incomeSeries.reduce((m, v) => Math.max(m, v || 0), 0),
      expenseSeries.reduce((m, v) => Math.max(m, v || 0), 0),
      0
    ) || 1

    chartOption.value = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        top: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: '#4b5563'
        },
        data: ['收入', '支出', '净收益']
      },
      grid: {
        top: 40,
        left: '3%',
        right: '4%',
        bottom: '3%',
        outerBoundsMode: 'same',
        outerBoundsContain: 'axisLabel'
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b7280',
          interval: 0,
          formatter: (value) => {
            const period = selectedPeriod.value
            if (period === '本年') {
              const mm = String(value).split('-')[1] || ''
              const m = parseInt(mm, 10)
              return (isFinite(m) && m > 0) ? `${m}月` : value
            }
            if (period === '本月') {
              const dd = String(value).split('-')[2] || ''
              const num = parseInt(dd, 10)
              if (isFinite(num) && num % 2 === 0) return ''
              return dd || value
            }
            if (period === '本周') {
              const d = new Date(String(value) + 'T00:00:00')
              const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
              const idx = d.getDay()
              return typeof idx === 'number' ? map[idx] : value
            }
            return value
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      series: [
        {
          name: '占位',
          type: 'bar',
          data: xAxisData.map(() => maxVal),
          itemStyle: {
            color: 'rgba(16, 185, 129, 0.12)',
            borderRadius: [12, 12, 4, 4]
          },
          barGap: '-100%',
          silent: true,
          emphasis: { disabled: true }
        },
        {
          name: '收入',
          type: 'bar',
          data: incomeSeries,
          itemStyle: {
            color: '#064e3b',
            borderRadius: [12, 12, 4, 4]
          }
        },
        {
          name: '支出',
          type: 'bar',
          data: expenseSeries,
          itemStyle: {
            color: '#a3e635',
            borderRadius: [12, 12, 4, 4]
          }
        },
        {
          name: '净收益',
          type: 'line',
          smooth: true,
          data: netSeries,
          showSymbol: false,
          symbol: 'none',
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3, color: '#10b981' }
        }
      ]
    }
  } catch (error) {
    trendData.value = []
    const msg = error && error.message ? error.message : '加载趋势失败'
    ElMessage.error(msg)
  }
}

const loadStats = async () => {
  try {
    const dateParams = getDateRange()
    const selectedType = recordType.value
    const categoryValue = getSelectedCategoryValue()
    const params = {
      ...dateParams,
      record_type: selectedType === '全部' ? '全部' : selectedType
    }
    if (categoryValue) {
      params.category = categoryValue
    }
    const statsKey = buildStatsCacheKey()
    const cached = getCache(statsKey, EXPENSES_CACHE_TTL)
    if (cached && typeof cached === 'object') {
      stats.value.totalExpense = cached.totalExpense || 0
      stats.value.totalIncome = cached.totalIncome || 0
      stats.value.netIncome = cached.netIncome || 0
    } else {
      try {
        const res = await api.get('/expenses/summary', { params })
        if (res.data && res.data.success) {
          const data = res.data.data || {}
          stats.value.totalExpense = data.totalExpense || 0
          stats.value.totalIncome = data.totalIncome || 0
          stats.value.netIncome = data.netIncome || 0
          setCache(statsKey, {
            totalExpense: stats.value.totalExpense,
            totalIncome: stats.value.totalIncome,
            netIncome: stats.value.netIncome
          })
        }
      } catch (e) {
        const msg = e && e.response && e.response.data && e.response.data.message
          ? e.response.data.message
          : (e.message || '加载统计数据失败')
        if (e && e.response && e.response.status === 403) {
          ElMessage.error(msg || '您没有查看收支的权限')
        } else {
          ElMessage.error(msg)
        }
      }
    }
  } catch (e) {
    ElMessage.error('加载统计数据失败')
  }
}

const applyFilters = () => {
  const type = recordType.value
  const categoryLabel = selectedCategory.value
  const keyword = (searchKeyword.value || '').trim().toLowerCase()

  const list = Array.isArray(records.value) ? records.value : []
  const filtered = list.filter((rec) => {
    const typeMatch = type === '全部' ? true : rec.type === type
    if (!typeMatch) return false

    const categoryText = rec.category_text || categoryMap[rec.category] || rec.category
    const categoryMatch = categoryLabel === '全部' ? true : categoryText === categoryLabel
    if (!categoryMatch) return false

    if (!keyword) return true
    const haystack = `${rec.type || ''} ${categoryText || ''} ${rec.description || ''} ${rec.date || ''} ${rec.created_at || ''}`.toLowerCase()
    return haystack.includes(keyword)
  })

  filteredRecords.value = filtered
  displayTotalCount.value = filtered.length
}

const onRecordTypeChange = () => {
  updateCategoryOptions()
  page.value = 1
  loadExpenses()
  loadStats()
}

const onCategoryTagClick = (category) => {
  selectedCategory.value = category
  onCategoryChange()
}

const onCategoryChange = () => {
  page.value = 1
  loadExpenses()
  loadStats()
}

const filterByStat = (type) => {
  if (recordType.value === type) return
  recordType.value = type
  updateCategoryOptions()
  selectedCategory.value = '全部'
  page.value = 1
  loadExpenses()
  loadStats()
}

const onSearch = () => {
  applyFilters()
}

const onPageChange = (p) => {
  page.value = p
  loadExpenses()
}

const setSelectedPeriod = (p) => {
  selectedPeriod.value = p
  selectedStartDate.value = ''
  selectedEndDate.value = ''
  const now = new Date()
  trendCurrentDateObj.value = now.getTime()
  if (p === '本年') trendPickerDate.value = String(now.getFullYear())
  else if (p === '本月') trendPickerDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`
  else if (p === '今天' || p === '本周') trendPickerDate.value = formatDate(now)
  page.value = 1
  loadExpenses()
  loadStats()
  loadTrend()
  loadExpenseAnalysis()
}

const refresh = () => {
  loadExpenses()
  loadStats()
  loadTrend()
}

const openDialog = async () => {
  editingRecord.value = null
  const mode = localStorage.getItem('user_mode') || 'personal'
  if (mode === 'team') {
    try { await (authStore.refreshProfile && authStore.refreshProfile()) } catch(_) {}
    const uid = (authStore.user || {}).id
    try {
      const tc = await api.get('/teams/current')
      const tid = tc.data && tc.data.success ? (tc.data.data || {}).id : null
      if (tid && uid) {
        const r = await api.get(`/teams/${tid}/members/${uid}/effective-permissions`)
        const perms = (r.data && r.data.success) ? (r.data.data || {}) : {}
        if (!(perms['finance.create'] || perms['all'])) {
          showPermissionModal.value = true
          return
        }
      }
    } catch (e) {
      const msg = e && e.response && e.response.data && e.response.data.message
        ? e.response.data.message
        : (e.message || '权限校验失败')
      if (e && e.response && e.response.status === 403) {
        showPermissionModal.value = true
        return
      }
    }
  }
  dialogVisible.value = true
}

const openEdit = (row) => {
  editingRecord.value = row
  dialogVisible.value = true
}

const onModalSuccess = () => {
	loadExpenses()
	loadStats()
	loadTrend()
	loadExpenseAnalysis()
}

const remove = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除这条${row.type}记录吗？`, '提示', {
      type: 'warning'
    })
  } catch (e) {
    return
  }

  try {
    const actualId = String(row.id).replace(/^(expense_|income_)/, '')
		const isIncome = row.type === '收入'
		const url = isIncome ? `/expenses/incomes/${actualId}` : `/expenses/${actualId}`
		const res = await api.delete(url)
		if (res.data && res.data.success) {
			ElMessage.success('删除成功')
			loadExpenses()
			loadStats()
			loadTrend()
			loadExpenseAnalysis()
		} else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const iso = String(dateTimeStr).replace(' ', 'T')
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const formatAmount = (val) => {
  const num = Number(val || 0)
  return num.toFixed(2)
}

const loadExpenseAnalysis = async () => {
  analysisLoading.value = true
  try {
    const isIncome = analysisType.value === '收入'
    const key = buildAnalysisCacheKey()
    const cached = getCache(key, EXPENSES_CACHE_TTL)
    if (cached && Array.isArray(cached)) {
      const total = cached.reduce((sum, it) => sum + (Number(it.amount || it.total_amount) || 0), 0)
      const mapped = cached.map((it, idx) => ({
        category: it.category || 'other',
        categoryLabel: it.categoryLabel || it.category_text || (isIncome ? incomeCategoryLabelMap[it.category] || '其他收入' : categoryMap[it.category] || '其他'),
        amount: Number(it.amount || it.total_amount) || 0,
        percentage: total > 0 ? ((Number(it.amount || it.total_amount) || 0) / total) * 100 : 0,
        color: pieColors[idx % pieColors.length]
      })).sort((a, b) => b.amount - a.amount)
      expenseAnalysis.value = mapped
      selectedExpenseIndex.value = -1
      await nextTick()
      drawExpensePieChart()
      return
    }

    const dr = getDateRange()
    if (dr.start_date && dr.end_date) {
      const per = 500
      let pageIdx = 1
      const collected = []
      while (pageIdx <= 20) {
        const params = {
          page: pageIdx,
          per_page: per,
          start_date: dr.start_date,
          end_date: dr.end_date,
          record_type: isIncome ? '收入' : '支出'
        }
        const res = await api.get('/expenses/transactions', { params })
        const data = res.data?.data || {}
        const items = Array.isArray(data.items) ? data.items : []
        if (!items.length) break
        collected.push(...items)
        if (items.length < per) break
        pageIdx += 1
      }
      const mapAgg = {}
      for (let i = 0; i < collected.length; i++) {
        const r = collected[i] || {}
        const keyCat = r.category || 'other'
        const labelCat = r.category_text || (isIncome ? incomeCategoryLabelMap[keyCat] || '其他收入' : categoryMap[keyCat] || '其他')
        const amt = Number(r.amount || 0) || 0
        if (!mapAgg[keyCat]) mapAgg[keyCat] = { category: keyCat, categoryLabel: labelCat, amount: 0 }
        mapAgg[keyCat].amount += amt
      }
      const arr = Object.values(mapAgg)
      const total = arr.reduce((s, it) => s + (it.amount || 0), 0)
      const result = arr.map((it, idx) => ({
        category: it.category,
        categoryLabel: it.categoryLabel,
        amount: it.amount,
        percentage: total > 0 ? (it.amount / total) * 100 : 0,
        color: pieColors[idx % pieColors.length]
      })).sort((a, b) => b.amount - a.amount)
      setCache(key, result)
      expenseAnalysis.value = result
      selectedExpenseIndex.value = -1
      await nextTick()
      drawExpensePieChart()
    } else {
      const isIncome2 = isIncome
      const url = isIncome2 ? '/statistics/income-analysis' : '/statistics/expense-analysis'
      const res = await api.get(url, { params: {} })
      const data = res.data?.data || {}
      const rawList = isIncome2
        ? Array.isArray(data.category_incomes) ? data.category_incomes : []
        : Array.isArray(data.category_expenses) ? data.category_expenses : []
      const total = rawList.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0)
      const mapped = rawList.map((it, idx) => {
        const amount = Number(it.total_amount) || 0
        const categoryKey = it.category || 'other'
        const label = isIncome2 ? incomeCategoryLabelMap[categoryKey] || '其他收入' : categoryMap[categoryKey] || '其他'
        const pct = total > 0 ? (amount / total) * 100 : 0
        return {
          category: categoryKey,
          categoryLabel: label,
          amount,
          percentage: pct,
          color: pieColors[idx % pieColors.length]
        }
      }).sort((a, b) => b.amount - a.amount)
      setCache(key, mapped)
      expenseAnalysis.value = mapped
      selectedExpenseIndex.value = -1
      await nextTick()
      drawExpensePieChart()
    }
  } catch (e) {
    expenseAnalysis.value = []
    selectedExpenseIndex.value = -1
  } finally {
    analysisLoading.value = false
  }
}

const drawExpensePieChart = () => {
  const el = expensePieCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const rectW = Math.max(240, Math.floor(rect.width))
  const rectH = Math.max(180, Math.floor(rect.height))
  const dpr = window.devicePixelRatio || 1
  el.width = Math.floor(rectW * dpr)
  el.height = Math.floor(rectH * dpr)
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rectW, rectH)

  const data = expenseAnalysis.value || []
  if (!data.length) {
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '14px sans-serif'
    const emptyText = analysisType.value === '收入' ? '暂无收入数据' : '暂无支出数据'
    ctx.fillText(emptyText, rectW / 2, rectH / 2)
    return
  }

  const cx = rectW / 2
  const cy = rectH / 2
  const baseR = Math.min(rectW, rectH) / 2 - 16
  const innerR = baseR * 0.55
  let start = -Math.PI / 2
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const angle = (item.percentage / 100) * Math.PI * 2
    const end = start + angle
    const isSelected = i === selectedExpenseIndex.value
    const outerR = isSelected ? baseR + 6 : baseR
    if (angle > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, outerR, start, end)
      ctx.arc(cx, cy, innerR, end, start, true)
      ctx.closePath()
      ctx.fillStyle = item.color
      if (selectedExpenseIndex.value !== -1 && !isSelected) ctx.globalAlpha = 0.3
      else ctx.globalAlpha = 1.0
      ctx.fill()
      if (isSelected) {
        ctx.lineWidth = 2
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }
    }
    start = end
  }
  ctx.globalAlpha = 1.0

  const totalAmount = data.reduce((s, it) => s + (it.amount || 0), 0)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (selectedExpenseIndex.value !== -1) {
    const sel = data[selectedExpenseIndex.value]
    ctx.fillStyle = sel.color
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(sel.categoryLabel, cx, cy - 16)
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('¥' + formatAmount(sel.amount), cx, cy + 6)
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.fillText(sel.percentage.toFixed(1) + '%', cx, cy + 24)
  } else {
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    const totalLabel = analysisType.value === '收入' ? '总收入' : '总支出'
    ctx.fillText(totalLabel, cx, cy - 16)
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('¥' + formatAmount(totalAmount), cx, cy + 6)
  }
}

const applyExpenseAnalysisFilter = (label) => {
	recordType.value = analysisType.value
	updateCategoryOptions()
	selectedCategory.value = label
	page.value = 1
	loadExpenses()
	loadStats()
}

const onAnalysisLegendClick = (item) => {
  const idx = (expenseAnalysis.value || []).findIndex(it => it.categoryLabel === item.categoryLabel)
  selectedExpenseIndex.value = (selectedExpenseIndex.value === idx) ? -1 : idx
  drawExpensePieChart()
  if (selectedExpenseIndex.value !== -1) applyExpenseAnalysisFilter(item.categoryLabel)
  else clearExpenseAnalysisFilter()
}

const handleExpensePieClick = (e) => {
  const el = expensePieCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = rect.width
  const h = rect.height
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) / 2 - 16
  const innerR = r * 0.55
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < innerR || dist > r) return
  let ang = Math.atan2(dy, dx)
  if (ang < -Math.PI / 2) ang += Math.PI * 2
  const data = expenseAnalysis.value || []
  let start = -Math.PI / 2
  for (let i = 0; i < data.length; i++) {
    const angle = (data[i].percentage / 100) * Math.PI * 2
    const end = start + angle
    if (ang >= start && ang <= end) {
      const newIdx = (selectedExpenseIndex.value === i) ? -1 : i
      selectedExpenseIndex.value = newIdx
      drawExpensePieChart()
      if (newIdx !== -1) applyExpenseAnalysisFilter(data[i].categoryLabel)
      else clearExpenseAnalysisFilter()
      break
    }
    start = end
  }
}

const clearExpenseAnalysisFilter = () => {
	recordType.value = analysisType.value
	updateCategoryOptions()
	selectedCategory.value = '全部'
	page.value = 1
	loadExpenses()
	loadStats()
}

const setAnalysisType = (type) => {
	if (analysisType.value === type) return
	analysisType.value = type
	selectedExpenseIndex.value = -1
	loadExpenseAnalysis()
}

onMounted(() => {
  updateCategoryOptions()
  loadExpenses()
  loadStats()
  loadExpenseAnalysis()
  loadTrend()
  const now = new Date()
  trendCurrentDateObj.value = now.getTime()
  trendPickerDate.value = formatDate(now)
})
</script>

<style scoped>
.expenses-page {}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.stats-card {
  margin-bottom: 16px;
}

.analysis-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.analysis-card {
  margin-bottom: 16px;
  flex: 1;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.card-title-row { display: flex; align-items: center; gap: 8px; }
.card-icon { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; background: #ede9fe; border-radius: 50%; flex-shrink: 0; }
.card-icon :deep(.el-icon) { font-size: 16px; color: #8b5cf6; }
.card-title-text { font-size: 16px; font-weight: 600; color: var(--text-primary); }

.trend-controls { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.controls-row { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.nav-btn { padding: 4px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; cursor: pointer; transition: background 0.2s; }
.nav-btn:hover { background: #f3f4f6; }
.nav-icon { width: 20px; height: 20px; filter: invert(56%) sepia(82%) saturate(452%) hue-rotate(106deg) brightness(91%) contrast(92%); }
.nav-icon.left { transform: rotate(180deg); }
.date-input { flex: 0 1 140px; min-width: 0; }
.date-input :deep(.el-date-editor) { width: 100%; min-width: 0; }
.date-input :deep(.el-input__wrapper) { height: 36px; padding: 0 8px; }
.date-input :deep(.el-input__inner) { line-height: 36px; text-align: center; }

@media (max-width: 768px) {
  .card-header-row { flex-wrap: wrap; gap: 8px; }
  .trend-controls { width: 100%; justify-content: center; }
  .controls-row { width: 100%; justify-content: center; }
  .date-input { flex: 1 1 140px; max-width: calc(100% - 96px); }
}


.analysis-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: 999px;
  background: #f3f4f6;
}

.analysis-tab {
  min-width: 44px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #4b5563;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.analysis-tab.active {
  background: linear-gradient(135deg, #10b981 0%, #22c55e 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
}

.analysis-content { padding: 4px 0; }
.analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; }
.legend-col { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: #f9fafb; }
.legend-item.clickable { cursor: pointer; transition: background-color 0.2s; }
.legend-item.clickable:hover { background: #f3f4f6; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-name { flex: 1; font-size: 13px; color: #374151; }
.legend-amount { display: inline-flex; align-items: baseline; gap: 6px; }
.legend-amount .amount { font-size: 14px; font-weight: 600; color: #111827; }
.legend-amount .percent { font-size: 12px; color: #6b7280; }
.chart-col { display: flex; align-items: center; justify-content: center; }
.pie-canvas { width: 100%; height: 200px; }
.empty-tip { padding: 12px; text-align: center; color: #6b7280; }

.trend-chart {
  width: 100%;
  height: 260px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card :deep(.el-card__body) {
  padding: 16px;
}

.stat-card.clickable {
  cursor: pointer;
  transition: transform 0.1s;
}
.stat-card.clickable:active {
  transform: translateY(1px);
}

.stat-content-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.icon-expense { background: #fef0f0; color: #f56c6c; }
.icon-income { background: #f0f9eb; color: #67c23a; }
.icon-net { background: #ecf5ff; color: #409eff; }
.icon-count { background: #f4f4f5; color: #909399; }

.stat-value.income {
  color: #16a34a;
}

.stat-value.expense {
  color: #dc2626;
}

.count-item .stat-value {
  color: #111827;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.category-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.category-tag {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 16px;
  background: #f3f4f6;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.category-tag:hover {
  background: #e5e7eb;
}
.category-tag.active {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
  font-weight: 500;
}

.search-input {
  width: 260px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.amount-income {
  color: #16a34a;
}

.amount-expense {
  color: #dc2626;
}

/* 时间范围标签样式，参考仪表盘 */
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
</style>
