<template>
  <div class="report-export-page">
    <div class="header">
      <h2>报表导出</h2>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="exportExcel" :loading="exportLoading">
          <el-icon class="el-icon--left"><Download /></el-icon>导出 Excel
        </el-button>
        <el-button type="primary" size="large" @click="printReport" :disabled="!tableData.rows.length">
          <el-icon class="el-icon--left"><Printer /></el-icon>打印报表
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="report-tabs">
      <el-tab-pane 
        v-for="(config, type) in reportTypes" 
        :key="type" 
        :label="config.title" 
        :name="type"
      />
    </el-tabs>

    <div class="filter-bar">
      <!-- Parrots specific -->
      <template v-if="activeTab === 'parrots'">
        <el-select v-model="speciesId" placeholder="品种" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="gender" placeholder="性别" clearable class="filter-item" @change="handleFilterChange">
          <el-option label="公" value="male" />
          <el-option label="母" value="female" />
          <el-option label="未知" value="unknown" />
        </el-select>
        <el-select v-model="healthStatus" placeholder="健康状态" clearable class="filter-item" @change="handleFilterChange">
          <el-option label="健康" value="healthy" />
          <el-option label="生病" value="sick" />
          <el-option label="康复中" value="recovering" />
          <el-option label="观察中" value="observation" />
        </el-select>
      </template>

      <!-- Expenses specific -->
      <template v-else-if="activeTab === 'expenses'">
        <el-select v-model="flow" placeholder="收支类型" clearable class="filter-item" @change="onFlowChange">
          <el-option label="支出" value="expense" />
          <el-option label="收入" value="income" />
        </el-select>
        <el-select v-model="category" :placeholder="flow === 'income' ? '收入类别' : '支出类别'" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="c in categoryOptions" :key="c.name" :label="toChineseCategory(c.name)" :value="c.name" />
        </el-select>
      </template>

      <!-- Feeding specific -->
      <template v-else-if="activeTab === 'feeding'">
        <el-select v-model="parrotId" placeholder="鹦鹉" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="p in parrotsList" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="feedTypeId" placeholder="食物类型" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="f in feedTypes" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
      </template>

      <!-- Health specific -->
      <template v-else-if="activeTab === 'health'">
        <el-select v-model="parrotId" placeholder="鹦鹉" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="p in parrotsList" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="recordType" placeholder="记录类型" clearable class="filter-item" @change="handleFilterChange">
          <el-option label="常规检查" value="checkup" />
          <el-option label="生病" value="illness" />
          <el-option label="治疗" value="treatment" />
          <el-option label="疫苗" value="vaccination" />
          <el-option label="称重" value="weight" />
        </el-select>
        <el-select v-model="healthStatus" placeholder="健康状态" clearable class="filter-item" @change="handleFilterChange">
          <el-option label="健康" value="healthy" />
          <el-option label="生病" value="sick" />
          <el-option label="康复中" value="recovering" />
          <el-option label="观察中" value="observation" />
        </el-select>
      </template>

      <!-- Cleaning specific -->
      <template v-else-if="activeTab === 'cleaning'">
        <el-select v-model="parrotId" placeholder="鹦鹉" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="p in parrotsList" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="cleaningType" placeholder="清洁类型" clearable class="filter-item" @change="handleFilterChange">
          <el-option v-for="ct in cleaningTypes" :key="ct.value" :label="ct.label" :value="ct.value" />
        </el-select>
      </template>

      <!-- Breeding specific -->
      <template v-else-if="activeTab === 'breeding'">
        <el-select v-model="maleParrotId" placeholder="种公" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="p in maleParrotOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="femaleParrotId" placeholder="种母" clearable filterable class="filter-item" @change="handleFilterChange">
          <el-option v-for="p in femaleParrotOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </template>
    </div>

    

    <div class="report-container" v-loading="dataLoading">
      <div class="print-area">
        <div class="print-header">
          <h1>{{ currentReportTitle }}</h1>
          <p>打印日期: {{ new Date().toLocaleDateString() }}</p>
        </div>
        
        <el-empty v-if="!tableData.rows.length && !dataLoading" description="暂无数据" />
        
        <template v-else>
          <!-- 屏幕显示用 Element 表格 -->
          <el-table 
            :data="tableData.rows" 
            border 
            stripe 
            style="width: 100%" 
            height="calc(100vh - 300px)"
            class="report-table screen-only"
          >
            <el-table-column 
              v-for="(h, index) in tableData.header" 
              :key="index" 
              :label="h"
              min-width="120">
              <template #default="scope">
                {{ scope.row[index] }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 打印专用原生表格 -->
          <div class="print-only">
            <table class="native-print-table">
              <thead>
                <tr>
                  <th v-for="(h, index) in tableData.header" :key="index">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rIndex) in tableData.rows" :key="rIndex">
                  <td v-for="(cell, cIndex) in row" :key="cIndex">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Printer } from '@element-plus/icons-vue'
import api from '@/api/axios'

const reportTypes = {
  parrots: { title: '鹦鹉档案', desc: '导出所有鹦鹉的基本信息、环号、品种等数据。' },
  expenses: { title: '收支记录', desc: '导出所有收入和支出记录明细。' },
  feeding: { title: '喂食记录', desc: '导出所有喂食操作记录。' },
  health: { title: '健康记录', desc: '导出所有健康检查和医疗记录。' },
  cleaning: { title: '清洁记录', desc: '导出所有清洁和消毒记录。' },
  breeding: { title: '繁殖记录', desc: '导出所有繁殖相关的记录。' }
}

const activeTab = ref('parrots')
const dataLoading = ref(false)
const exportLoading = ref(false)
const tableData = reactive({ header: [], rows: [] })

// type-specific filter states
const speciesId = ref('')
const gender = ref('')
const healthStatus = ref('')
const flow = ref('') // expense/income
const category = ref('')
const parrotId = ref('')
const feedTypeId = ref('')
const recordType = ref('')
const cleaningType = ref('')
const maleParrotId = ref('')
const femaleParrotId = ref('')

// options lists
const speciesList = ref([])
const feedTypes = ref([])
const expenseCategories = ref([])
const incomeCategories = ref([])
const parrotsList = ref([])

const cleaningTypes = [
  { label: '笼舍', value: 'cage' },
  { label: '玩具', value: 'toys' },
  { label: '站架', value: 'perches' },
  { label: '食具水具', value: 'food_water' },
  { label: '环境消毒', value: 'disinfection' },
  { label: '换水', value: 'water_change' },
  { label: '清洗水碗', value: 'water_bowl_clean' },
  { label: '洗澡', value: 'bath' },
]

const categoryOptions = computed(() => flow.value === 'income' ? incomeCategories.value : expenseCategories.value)
const categoryLabelMap = {
  food: '食物', toys: '玩具', medical: '医疗', cage: '笼舍', supplies: '用品', other: '其他',
  sales: '销售', breeding: '繁殖', salary: '工资', bonus: '奖金', investment: '投资',
  baby_bird: '幼鸟', breeding_bird: '种鸟', breeding_sale: '繁殖销售', bird_sale: '鸟类销售',
  service: '服务收入', competition: '比赛奖金'
}
const toChineseCategory = (name) => categoryLabelMap[name] || name
const maleParrotOptions = computed(() => (parrotsList.value || []).filter(p => p.gender === 'male'))
const femaleParrotOptions = computed(() => (parrotsList.value || []).filter(p => p.gender === 'female'))

const currentReportTitle = computed(() => {
  return reportTypes[activeTab.value]?.title || ''
})

const fetchReportData = async (type) => {
  dataLoading.value = true
  try {
    const params = {}
    // 无搜索关键字
    // type-specific params
    if (activeTab.value === 'parrots') {
      if (speciesId.value) params.species_id = speciesId.value
      if (gender.value) params.gender = gender.value
      if (healthStatus.value) params.health_status = healthStatus.value
    } else if (activeTab.value === 'expenses') {
      if (flow.value) params.flow = flow.value
      if (category.value) params.category = category.value
    } else if (activeTab.value === 'feeding') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (feedTypeId.value) params.feed_type_id = feedTypeId.value
    } else if (activeTab.value === 'health') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (recordType.value) params.record_type = recordType.value
      if (healthStatus.value) params.health_status = healthStatus.value
    } else if (activeTab.value === 'cleaning') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (cleaningType.value) params.cleaning_type = cleaningType.value
    } else if (activeTab.value === 'breeding') {
      if (maleParrotId.value) params.male_parrot_id = maleParrotId.value
      if (femaleParrotId.value) params.female_parrot_id = femaleParrotId.value
    }
    
    const response = await api.get(`/reports/data/${type}`, { params })
    tableData.header = response.data.header
    tableData.rows = response.data.rows
  } catch (error) {
    console.error('Fetch data failed:', error)
    ElMessage.error('数据加载失败')
  } finally {
    dataLoading.value = false
  }
}

const handleTabChange = (tabName) => {
  // 切换标签时重置过滤器
  fetchReportData(tabName)
}

const handleFilterChange = () => {
  fetchReportData(activeTab.value)
}

const exportExcel = async () => {
  const type = activeTab.value
  exportLoading.value = true
  try {
    const params = {}
    // 无搜索关键字
    // type-specific params
    if (activeTab.value === 'parrots') {
      if (speciesId.value) params.species_id = speciesId.value
      if (gender.value) params.gender = gender.value
      if (healthStatus.value) params.health_status = healthStatus.value
    } else if (activeTab.value === 'expenses') {
      if (flow.value) params.flow = flow.value
      if (category.value) params.category = category.value
    } else if (activeTab.value === 'feeding') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (feedTypeId.value) params.feed_type_id = feedTypeId.value
    } else if (activeTab.value === 'health') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (recordType.value) params.record_type = recordType.value
      if (healthStatus.value) params.health_status = healthStatus.value
    } else if (activeTab.value === 'cleaning') {
      if (parrotId.value) params.parrot_id = parrotId.value
      if (cleaningType.value) params.cleaning_type = cleaningType.value
    } else if (activeTab.value === 'breeding') {
      if (maleParrotId.value) params.male_parrot_id = maleParrotId.value
      if (femaleParrotId.value) params.female_parrot_id = femaleParrotId.value
    }

    const response = await api.get(`/reports/export/${type}`, {
      params,
      responseType: 'blob'
    })
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${reportTypes[type].title}_${date}.xls`
    link.setAttribute('download', filename)
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('Export failed:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    exportLoading.value = false
  }
}

const printReport = () => {
  if (!tableData.rows.length) {
    ElMessage.warning('暂无数据可打印')
    return
  }
  
  // 保存原始标题
  const originalTitle = document.title
  // 设置打印标题（这将成为 PDF 默认文件名）
  const date = new Date().toISOString().slice(0, 10)
  document.title = `${currentReportTitle.value}_${date}`
  
  window.print()
  
  // 恢复原始标题
  // 由于 print() 在某些浏览器可能是异步或非阻塞的，使用 setTimeout 确保在对话框关闭后执行
  setTimeout(() => {
    document.title = originalTitle
  }, 1000)
}


onMounted(async () => {
  fetchReportData(activeTab.value)
  try {
    const [speciesRes, feedTypeRes, expenseCatRes, incomeCatRes, parrotsRes] = await Promise.all([
      api.get('/parrots/species'),
      api.get('/categories/feed-types'),
      api.get('/categories/transactions', { params: { type: 'expense' } }),
      api.get('/categories/transactions', { params: { type: 'income' } }),
      api.get('/parrots', { params: { page: 1, per_page: 1000 } })
    ])
    speciesList.value = speciesRes.data.data || speciesRes.data || []
    feedTypes.value = (feedTypeRes.data.data || feedTypeRes.data || [])
    expenseCategories.value = (expenseCatRes.data.data || expenseCatRes.data || [])
    incomeCategories.value = (incomeCatRes.data.data || incomeCatRes.data || [])
    const parrotsData = parrotsRes.data.data?.parrots || parrotsRes.data?.parrots || []
    parrotsList.value = parrotsData
  } catch (e) {
    console.warn('加载过滤器选项失败', e)
  }
})

const onFlowChange = () => {
  category.value = ''
  handleFilterChange()
}
</script>

<style scoped>
.report-export-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  color: #1a1a1a;
}

.report-tabs {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.filter-item {
  width: 160px;
}

/* 统一圆角为与日期选择器一致 */
:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-date-editor) {
  border-radius: 8px !important;
}

.report-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.print-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.report-table {
  flex: 1;
}

.print-only {
  display: none;
}

/* Print Styles */
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  
  /* Reset Layout */
  body * { visibility: hidden; }
  
  .report-export-page, 
  .report-container { 
    margin: 0 !important; 
    padding: 0 !important; 
    height: auto !important; 
    box-shadow: none !important; 
    background: transparent !important; 
    display: block !important; 
    overflow: visible !important;
    border: none !important;
  }
  
  .print-area { 
    position: fixed;
    left: 0; 
    top: 0; 
    width: 100%; 
    margin: 0; 
    padding: 0; 
    background: white; 
    display: block !important; 
    overflow: visible !important; 
    visibility: visible !important;
    z-index: 9999;
  }
  
  .print-area * { visibility: visible !important; }

  /* Hide Screen Elements */
  .screen-only, 
  .header, 
  .report-tabs,
  .el-tabs,
  .action-footer { 
    display: none !important; 
  }

  /* Show Print Elements */
  .print-only {
    display: block !important;
    width: 100%;
  }

  .print-header {
    display: block !important;
    text-align: center;
    margin-bottom: 20px;
  }
  
  .print-header h1 { margin: 0 0 10px 0; font-size: 24px; }

  /* Native Table Styling */
  .native-print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    table-layout: auto; /* Allow auto width for better fit */
  }

  .native-print-table th,
  .native-print-table td {
    border: 1px solid #000;
    padding: 4px 8px;
    text-align: left;
    word-break: break-word;
  }

  .native-print-table th {
    background-color: #f0f0f0;
    font-weight: bold;
    white-space: nowrap; /* Keep headers on one line if possible */
  }
}
</style>
