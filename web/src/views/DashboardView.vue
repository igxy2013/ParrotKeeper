<template>
  <div>
    <h2>仪表盘</h2>
    <el-row :gutter="20" v-loading="loading">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>鹦鹉总数</span>
            </div>
          </template>
          <div class="statistic-value">{{ stats.total_parrots || 0 }}</div>
        </el-card>
      </el-col>
       <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>本月支出</span>
            </div>
          </template>
          <div class="statistic-value">¥{{ stats.monthly_expense || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>本月收入</span>
            </div>
          </template>
          <div class="statistic-value income">¥{{ stats.monthly_income || 0 }}</div>
        </el-card>
      </el-col>
       <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>健康状况</span>
            </div>
          </template>
          <div class="health-stats">
             <el-tag type="success">健康: {{ stats.health_status?.healthy || 0 }}</el-tag>
             <el-tag type="danger" v-if="stats.health_status?.sick">生病: {{ stats.health_status?.sick }}</el-tag>
             <el-tag type="warning" v-if="stats.health_status?.recovering">康复中: {{ stats.health_status?.recovering }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/axios'

const stats = ref({})
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/statistics/overview')
    if (res.data.success) {
      stats.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.statistic-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--primary-color);
  background: var(--primary-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.statistic-value.income {
    background: var(--theme-blue);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.health-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
h2 {
  color: var(--text-primary);
  margin-bottom: 24px;
}
.card-header {
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
