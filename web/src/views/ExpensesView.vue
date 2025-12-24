<template>
  <div class="expenses-page">
    <div class="header">
      <h2>收支管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openDialog">添加收支记录</el-button>
      </div>
    </div>

    <el-card class="stats-card" shadow="never">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">总支出</div>
          <div class="stat-value expense">¥{{ formatAmount(stats.totalExpense) }}</div>
        </div>
        <div class="stat-item">
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

    <div class="toolbar">
      <div class="period-selector">
        <el-button
          v-for="p in periods"
          :key="p"
          size="small"
          :type="selectedPeriod === p ? 'primary' : 'default'"
          @click="setSelectedPeriod(p)"
        >
          {{ p }}
        </el-button>
      </div>
      <el-select
        v-model="recordType"
        class="filter-item"
        style="width: 120px"
        @change="onRecordTypeChange"
      >
        <el-option v-for="t in recordTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-select
        v-model="selectedCategory"
        class="filter-item"
        style="width: 160px"
        @change="onCategoryChange"
      >
        <el-option
          v-for="c in categoryOptions"
          :key="c"
          :label="c"
          :value="c"
        />
      </el-select>
      <el-input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索类型、类别、描述或鹦鹉名称"
        @input="onSearch"
        clearable
      />
      <div class="toolbar-right">
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
    >
      <el-form :model="form" label-width="96px">
        <el-form-item label="记录类型">
          <el-radio-group v-model="form.type" @change="onFormTypeChange">
            <el-radio-button label="支出" />
            <el-radio-button label="收入" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="form.category" style="width: 100%">
            <el-option
              v-for="opt in formCategoryOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="金额">
          <el-input v-model="form.amount" placeholder="请输入金额">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.description"
            type="textarea"
            rows="3"
            placeholder="可填写用途、来源等说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '@/api/axios'

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

const dialogVisible = ref(false)
const saving = ref(false)
const isEditing = ref(false)

const form = ref({
  id: '',
  type: '支出',
  category: '',
  amount: '',
  date: '',
  description: ''
})

const expenseCategoryOptionsForDialog = [
  { value: 'food', label: '食物' },
  { value: 'medical', label: '医疗' },
  { value: 'toys', label: '玩具' },
  { value: 'cage', label: '笼具' },
  { value: 'baby_bird', label: '幼鸟' },
  { value: 'breeding_bird', label: '种鸟' },
  { value: 'other', label: '其他' }
]

const incomeCategoryOptionsForDialog = [
  { value: 'breeding_sale', label: '繁殖销售' },
  { value: 'bird_sale', label: '鸟类销售' },
  { value: 'service', label: '服务收入' },
  { value: 'competition', label: '比赛奖金' },
  { value: 'other', label: '其他收入' }
]

const formCategoryOptions = computed(() => {
  return form.value.type === '收入' ? incomeCategoryOptionsForDialog : expenseCategoryOptionsForDialog
})

const dialogTitle = computed(() => (isEditing.value ? '编辑收支记录' : '添加收支记录'))

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

const onCategoryChange = () => {
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
  isEditing.value = false
  form.value = {
    id: '',
    type: '支出',
    category: 'food',
    amount: '',
    date: getToday(),
    description: ''
  }
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEditing.value = true
  form.value = {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: String(row.amount || ''),
    date: row.date,
    description: row.description || ''
  }
  dialogVisible.value = true
}

const onFormTypeChange = () => {
  if (form.value.type === '收入') {
    form.value.category = 'breeding_sale'
  } else {
    form.value.category = 'food'
  }
}

const submitForm = async () => {
  if (!form.value.amount || !form.value.category || !form.value.date) {
    ElMessage.error('请填写完整的记录信息')
    return
  }

  let amountNumber
  try {
    amountNumber = parseFloat(form.value.amount)
  } catch (e) {
    ElMessage.error('金额格式不正确')
    return
  }
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    ElMessage.error('金额必须大于0')
    return
  }

  const isIncome = form.value.type === '收入'
  const payload = {
    category: form.value.category,
    amount: amountNumber,
    description: form.value.description || ''
  }
  if (isIncome) {
    payload.income_date = form.value.date
  } else {
    payload.expense_date = form.value.date
  }

  saving.value = true
  try {
    if (isEditing.value && form.value.id) {
      const actualId = String(form.value.id).replace(/^(expense_|income_)/, '')
      const url = isIncome ? `/expenses/incomes/${actualId}` : `/expenses/${actualId}`
      const res = await api.put(url, payload)
      if (res.data && res.data.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        loadExpenses()
        loadStats()
      } else {
        ElMessage.error(res.data?.message || '更新失败')
      }
    } else {
      const url = isIncome ? '/expenses/incomes' : '/expenses'
      const res = await api.post(url, payload)
      if (res.data && res.data.success) {
        ElMessage.success('添加成功')
        dialogVisible.value = false
        loadExpenses()
        loadStats()
      } else {
        ElMessage.error(res.data?.message || '添加失败')
      }
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
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

onMounted(() => {
  updateCategoryOptions()
  form.value.date = getToday()
  loadExpenses()
  loadStats()
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

.header h2 {
  margin: 0;
  color: var(--text-primary);
}

.stats-card {
  margin-bottom: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-item {
  padding: 12px 16px;
  border-radius: 12px;
  background: #f9fafb;
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
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.period-selector {
  display: flex;
  gap: 8px;
}

.filter-item {
  flex-shrink: 0;
}

.search-input {
  flex: 1 1 260px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
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
</style>
