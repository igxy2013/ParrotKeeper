<template>
  <div>
    <h2>记录</h2>
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="喂食" name="feeding">
        <el-table :data="feedingRecords" v-loading="loading">
          <el-table-column prop="feeding_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.feeding_time) }}
            </template>
          </el-table-column>
          <el-table-column label="鹦鹉" min-width="200">
             <template #default="scope">
                <el-tag v-for="p in scope.row.parrots" :key="p.id" size="small" style="margin-right: 5px">{{ p.name }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="food_type" label="食物类型" width="150" />
          <el-table-column prop="amount" label="数量" width="100">
            <template #default="scope">
              {{ scope.row.amount ? scope.row.amount + 'g' : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="健康" name="health">
        <el-table :data="healthRecords" v-loading="loading">
          <el-table-column prop="record_date" label="日期" width="120">
             <template #default="scope">
              {{ formatDate(scope.row.record_date, 'YYYY-MM-DD') }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="120" />
          <el-table-column prop="health_status" label="状态" width="120">
             <template #default="scope">
                <el-tag :type="getHealthType(scope.row.health_status)">{{ getHealthLabel(scope.row.health_status) }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="清洁" name="cleaning">
        <el-table :data="cleaningRecords" v-loading="loading">
          <el-table-column prop="cleaning_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.cleaning_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="120" />
          <el-table-column prop="cleaning_type" label="类型" width="150" />
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="繁殖" name="breeding">
          <el-empty description="繁殖记录暂未实现" />
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
import { ref, onMounted, watch } from 'vue'
import api from '../api/axios'

const activeTab = ref('feeding')
const loading = ref(false)
const feedingRecords = ref([])
const healthRecords = ref([])
const cleaningRecords = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const fetchRecords = async () => {
  loading.value = true
  try {
    let url = `/records/${activeTab.value}`
    const res = await api.get(url, {
      params: {
        page: currentPage.value,
        per_page: pageSize.value
      }
    })
    
    if (res.data.success) {
      if (activeTab.value === 'feeding') {
        feedingRecords.value = res.data.data.items || res.data.data.records || []
      } else if (activeTab.value === 'health') {
        healthRecords.value = res.data.data.items || res.data.data.records || []
      } else if (activeTab.value === 'cleaning') {
        cleaningRecords.value = res.data.data.items || res.data.data.records || []
      }
      total.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTabClick = () => {
  currentPage.value = 1
  fetchRecords()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchRecords()
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

onMounted(() => {
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
</style>
