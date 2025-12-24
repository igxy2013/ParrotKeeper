<template>
  <div>
    <h2>记录</h2>
    <div class="toolbar">
      <el-select v-model="selectedParrotId" placeholder="全部鹦鹉" clearable filterable class="filter-item" @change="handleFilterChange">
        <el-option :label="'全部鹦鹉'" :value="null" />
        <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" class="filter-item" @change="handleFilterChange" />
      <el-input v-model="searchQuery" placeholder="搜索描述/备注" class="search-input" @input="handleSearch" />
      <div class="toolbar-right">
        <el-button @click="refresh" :loading="loading">刷新</el-button>
      </div>
    </div>
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="喂食" name="feeding">
        <el-table :data="feedingRecordsFiltered" v-loading="loading">
          <el-table-column prop="feeding_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.feeding_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="feed_type_name" label="食物类型" width="180">
            <template #default="scope">{{ scope.row.feed_type?.name || scope.row.feed_type_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="amount" label="数量" width="120">
            <template #default="scope">{{ scope.row.amount ? scope.row.amount + (scope.row.feed_type?.unit || 'g') : '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="健康" name="health">
        <el-table :data="healthRecordsFiltered" v-loading="loading">
          <el-table-column prop="record_date" label="日期" width="120">
             <template #default="scope">
              {{ formatDate(scope.row.record_date, 'YYYY-MM-DD') }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="weight" label="体重(g)" width="120">
            <template #default="scope">{{ scope.row.weight ? scope.row.weight + ' g' : '-' }}</template>
          </el-table-column>
          <el-table-column prop="health_status" label="状态" width="120">
             <template #default="scope">
                <el-tag :type="getHealthType(scope.row.health_status)">{{ getHealthLabel(scope.row.health_status) }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="清洁" name="cleaning">
        <el-table :data="cleaningRecordsFiltered" v-loading="loading">
          <el-table-column prop="cleaning_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.cleaning_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="cleaning_type_text" label="类型" width="180">
            <template #default="scope">{{ scope.row.cleaning_type_text || scope.row.cleaning_type || '-' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="繁殖" name="breeding">
        <el-table :data="breedingRecordsFiltered" v-loading="loading">
          <el-table-column prop="mating_date" label="配对日期" width="140">
            <template #default="scope">{{ formatDate(scope.row.mating_date, 'YYYY-MM-DD') }}</template>
          </el-table-column>
          <el-table-column prop="male_parrot_name" label="公鸟" width="160">
            <template #default="scope">{{ scope.row.male_parrot?.name || scope.row.male_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="female_parrot_name" label="母鸟" width="160">
            <template #default="scope">{{ scope.row.female_parrot?.name || scope.row.female_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="egg_count" label="产蛋数" width="100" />
          <el-table-column prop="chick_count" label="雏鸟数" width="100" />
          <el-table-column prop="success_rate" label="成功率(%)" width="120">
            <template #default="scope">{{ scope.row.success_rate ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-pagination
      v-if="total > 0"
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="handlePageChange"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import api from '../api/axios'

const activeTab = ref('feeding')
const loading = ref(false)
const feedingRecords = ref([])
const healthRecords = ref([])
const cleaningRecords = ref([])
const breedingRecords = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const parrots = ref([])
const selectedParrotId = ref(null)
const dateRange = ref([])
const searchQuery = ref('')

const fetchRecords = async () => {
  loading.value = true
  try {
    let url = `/records/${activeTab.value}`
    const params = {
      page: currentPage.value,
      per_page: pageSize.value
    }
    if (activeTab.value === 'feeding' || activeTab.value === 'health' || activeTab.value === 'cleaning') {
      if (selectedParrotId.value) params.parrot_id = selectedParrotId.value
    }
    if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    if (activeTab.value === 'breeding') {
      if (selectedParrotId.value) params.male_parrot_id = selectedParrotId.value
    }
    const res = await api.get(url, { params })
    
    if (res.data.success) {
      const d = res.data.data
      if (activeTab.value === 'feeding') {
        feedingRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'health') {
        healthRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'cleaning') {
        cleaningRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'breeding') {
        breedingRecords.value = d.items || d.records || []
      }
      total.value = d.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTabClick = () => {
  currentPage.value = 1
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchRecords()
}

const handleFilterChange = () => {
  currentPage.value = 1
  fetchRecords()
}

const handleSearch = () => {
  applyClientFilter()
}

const formatDate = (dateStr, format) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (format === 'YYYY-MM-DD') {
    return date.toLocaleDateString()
  }
  return date.toLocaleString()
}

const getHealthType = (status) => {
  if (status === 'healthy') return 'success'
  if (status === 'sick') return 'danger'
  if (status === 'recovering') return 'warning'
  return 'info'
}

const getHealthLabel = (status) => {
  const map = {
    healthy: '健康',
    sick: '生病',
    recovering: '康复中'
  }
  return map[status] || status
}

const refresh = () => fetchRecords()

const feedingRecordsFiltered = ref([])
const healthRecordsFiltered = ref([])
const cleaningRecordsFiltered = ref([])
const breedingRecordsFiltered = ref([])

const applyClientFilter = () => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (activeTab.value === 'feeding') {
    const list = Array.isArray(feedingRecords.value) ? feedingRecords.value : []
    feedingRecordsFiltered.value = q ? list.filter(r => String(r.notes || '').toLowerCase().includes(q) || String(r.feed_type_name || (r.feed_type && r.feed_type.name) || '').toLowerCase().includes(q)) : list
  } else if (activeTab.value === 'health') {
    const list = Array.isArray(healthRecords.value) ? healthRecords.value : []
    healthRecordsFiltered.value = q ? list.filter(r => String(r.description || '').toLowerCase().includes(q)) : list
  } else if (activeTab.value === 'cleaning') {
    const list = Array.isArray(cleaningRecords.value) ? cleaningRecords.value : []
    cleaningRecordsFiltered.value = q ? list.filter(r => String(r.description || '').toLowerCase().includes(q) || String(r.cleaning_type_text || r.cleaning_type || '').toLowerCase().includes(q)) : list
  } else if (activeTab.value === 'breeding') {
    const list = Array.isArray(breedingRecords.value) ? breedingRecords.value : []
    breedingRecordsFiltered.value = q ? list.filter(r => String(r.notes || '').toLowerCase().includes(q)) : list
  }
}

watch([feedingRecords, healthRecords, cleaningRecords, breedingRecords, activeTab], () => {
  applyClientFilter()
})

watch(activeTab, () => {
  currentPage.value = 1
  fetchRecords()
})

const loadParrots = async () => {
  try {
    const r = await api.get('/parrots')
    if (r.data && r.data.success) {
      const arr = Array.isArray(r.data.data) ? r.data.data : (r.data.data?.items || [])
      parrots.value = arr
    }
  } catch (_) {}
}

onMounted(() => {
  loadParrots()
  fetchRecords()
})
</script>

<style scoped>
h2 {
  color: var(--text-primary);
  margin-bottom: 24px;
}
:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}
:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}
:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  --el-table-header-bg-color: #f8f9fa;
}
:deep(.el-tag--small) {
  border-radius: 6px;
}
.pagination {
  margin-top: 20px;
  justify-content: center;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.search-input { flex: 1 1 360px; min-width: 260px; }
.toolbar-right { display: flex; gap: 12px; align-items: center; flex-wrap: nowrap; }
.filter-item { min-width: 200px; }
</style>
