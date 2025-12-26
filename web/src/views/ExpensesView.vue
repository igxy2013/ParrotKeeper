<template>
  <div class="expenses-page">
    <div class="header">
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

    <el-card class="stats-card" shadow="never">
      <div class="stats-grid">
        <div class="stat-item clickable" @click="filterByStat('支出')">
          <div class="stat-label">总支出</div>
          <div class="stat-value expense">¥{{ formatAmount(stats.totalExpense) }}</div>
        </div>
        <div class="stat-item clickable" @click="filterByStat('收入')">
          <div class="stat-label">总收入</div>
          <div class="stat-value income">¥{{ formatAmount(stats.totalIncome) }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">净收入</div>
          <div class="stat-value" :class="stats.netIncome >= 0 ? 'income' : 'expense'">
            ¥{{ formatAmount(stats.netIncome) }}
          </div>
        </div>
        <div class="stat-item count-item">
          <div class="stat-label">当前列表记录数</div>
          <div class="stat-value">{{ displayTotalCount }}</div>
        </div>
      </div>
    </el-card>

    <el-card class="analysis-card" shadow="never">
      <div class="card-header-row">
        <div class="card-title-row">
          <span class="card-icon"><el-icon><Wallet /></el-icon></span>
          <span class="card-title-text">支出分析</span>
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
        <div class="empty-tip" v-else>暂无支出数据</div>
      </div>
    </el-card>

    <div class="toolbar">
      <div class="filter-group">
        <el-radio-group v-model="recordType" size="default" @change="onRecordTypeChange">
          <el-radio-button v-for="t in recordTypeOptions" :key="t" :label="t">{{ t }}</el-radio-button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Wallet } from '@element-plus/icons-vue'
import api from '@/api/axios'
import ExpenseModal from '../components/ExpenseModal.vue'

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

const displayTotalCount = ref(0)
const searchKeyword = ref('')

// 支出分析
const analysisLoading = ref(false)
const expenseAnalysis = ref([])
const selectedExpenseIndex = ref(-1)
const expensePieCanvas = ref(null)
const pieColors = ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#22AA99', '#FF66CC']

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
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const rawWeekStart = new Date(now.getFullYear(), now.getMonth(), diff)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      startDate = rawWeekStart < monthStart ? monthStart : rawWeekStart
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      endDate = tomorrow < monthEnd ? tomorrow : monthEnd
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

    const res = await api.get('/expenses/transactions', { params })
    if (res.data && res.data.success) {
      const data = res.data.data || {}
      const items = Array.isArray(data.items) ? data.items : []
      records.value = items
      total.value = data.total || items.length || 0
      applyFilters()
    } else {
      ElMessage.error(res.data?.message || '加载记录失败')
    }
  } catch (e) {
    ElMessage.error('加载记录失败')
  } finally {
    loading.value = false
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
    const res = await api.get('/expenses/summary', { params })
    if (res.data && res.data.success) {
      const data = res.data.data || {}
      stats.value.totalExpense = data.totalExpense || 0
      stats.value.totalIncome = data.totalIncome || 0
      stats.value.netIncome = data.netIncome || 0
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
  page.value = 1
  loadExpenses()
  loadStats()
}

const refresh = () => {
  loadExpenses()
  loadStats()
}

const openDialog = () => {
  editingRecord.value = null
  dialogVisible.value = true
}

const openEdit = (row) => {
  editingRecord.value = row
  dialogVisible.value = true
}

const onModalSuccess = () => {
  loadExpenses()
  loadStats()
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
    const res = await api.get('/statistics/expense-analysis', { params: { months: 6 } })
    const data = res.data?.data || {}
    const list = Array.isArray(data.category_expenses) ? data.category_expenses : []
    const total = list.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0)
    const mapped = list
      .map((it, idx) => {
        const amount = Number(it.total_amount) || 0
        const categoryKey = it.category || 'other'
        const label = categoryMap[categoryKey] || '其他'
        const pct = total > 0 ? (amount / total) * 100 : 0
        return {
          category: categoryKey,
          categoryLabel: label,
          amount,
          percentage: pct,
          color: pieColors[idx % pieColors.length]
        }
      })
      .sort((a, b) => b.amount - a.amount)
    expenseAnalysis.value = mapped
    selectedExpenseIndex.value = -1
    await nextTick()
    drawExpensePieChart()
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
    ctx.fillText('暂无支出数据', rectW / 2, rectH / 2)
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
    ctx.fillText('总支出', cx, cy - 16)
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('¥' + formatAmount(totalAmount), cx, cy + 6)
  }
}

const applyExpenseAnalysisFilter = (label) => {
  recordType.value = '支出'
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
  recordType.value = '支出'
  updateCategoryOptions()
  selectedCategory.value = '全部'
  page.value = 1
  loadExpenses()
  loadStats()
}

onMounted(() => {
  updateCategoryOptions()
  loadExpenses()
  loadStats()
  loadExpenseAnalysis()
})
</script>

<style scoped>
.expenses-page {
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.header h2 {
  margin: 0;
  color: var(--text-primary);
}

.stats-card {
  margin-bottom: 16px;
}

.analysis-card {
  margin-bottom: 16px;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f9fafb;
}

.stat-item.clickable {
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}
.stat-item.clickable:hover {
  background: #f3f4f6;
}
.stat-item.clickable:active {
  background: #e5e7eb;
  transform: translateY(1px);
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
}

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
