<template>
  <div class="parrots-container">
    <div class="header-actions">
      <h2>我的鹦鹉</h2>
      <el-button type="primary" :icon="Plus" class="add-btn" @click="handleAdd">添加新鹦鹉</el-button>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else class="parrot-list">
      <div v-for="parrot in parrots" :key="parrot.id" class="parrot-item" @click="handleEdit(parrot)">
        <div class="parrot-avatar-container">
          <img :src="getParrotImage(parrot)" class="parrot-avatar" />
        </div>
        <div class="parrot-content">
          <div class="parrot-main-info">
            <span class="parrot-name">{{ parrot.name }}</span>
            <el-icon v-if="parrot.gender === 'male'" class="gender-icon male"><Male /></el-icon>
            <el-icon v-else-if="parrot.gender === 'female'" class="gender-icon female"><Female /></el-icon>
            <span class="parrot-status-tag" :class="parrot.health_status">
              {{ getHealthLabel(parrot.health_status) }}
            </span>
          </div>
          <div class="parrot-sub-info">
            <span class="info-item">{{ parrot.species?.name || '未知品种' }}</span>
            <span class="divider">|</span>
            <span class="info-item">{{ calculateAge(parrot.birth_date) }}</span>
          </div>
        </div>
        <div class="parrot-action">
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <el-pagination
      v-if="total > 0"
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="handlePageChange"
      class="pagination"
    />

    <ParrotModal 
      v-model="showModal" 
      :parrot="selectedParrot"
      @success="fetchParrots" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Male, Female, ArrowRight } from '@element-plus/icons-vue'
import api from '../api/axios'
import ParrotModal from '../components/ParrotModal.vue'

const parrots = ref([])
const loading = ref(false)
const showModal = ref(false)
const selectedParrot = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const fetchParrots = async () => {
  loading.value = true
  try {
    const res = await api.get('/parrots', {
      params: {
        page: currentPage.value,
        per_page: pageSize.value
      }
    })
    if (res.data.success) {
      parrots.value = res.data.data.parrots || []
      total.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
	selectedParrot.value = null
	showModal.value = true
}

const handleEdit = (parrot) => {
  selectedParrot.value = parrot
  showModal.value = true
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchParrots()
}

const calculateAge = (birthDate) => {
  if (!birthDate) return '年龄未知'
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--
  }
  if (years === 0) {
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
      return `${months} 个月`
  }
  return `${years} 岁`
}

const getHealthLabel = (status) => {
  const map = {
    healthy: '健康',
    sick: '生病',
    recovering: '康复中'
  }
  return map[status] || status
}

const getRandomAvatar = (id) => {
  const avatars = [
    '/parrot-avatar-blue.svg',
    '/parrot-avatar-green.svg',
    '/parrot-avatar-orange.svg',
    '/parrot-avatar-purple.svg',
    '/parrot-avatar-red.svg',
    '/parrot-avatar-yellow.svg'
  ]
  const index = id % avatars.length
  return avatars[index]
}

const getParrotImage = (parrot) => {
  if (parrot.avatar_url) {
    if (parrot.avatar_url.startsWith('http')) return parrot.avatar_url
    return `/uploads/${parrot.avatar_url}`
  }
  return getRandomAvatar(parrot.id)
}

onMounted(() => {
  fetchParrots()
})
</script>

<style scoped>
.parrots-container {
  padding-bottom: 20px;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.header-actions h2 {
  margin: 0;
  color: var(--text-primary);
}
.add-btn {
  background: var(--primary-gradient);
  border: none;
}

.parrot-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.parrot-item {
  display: flex;
  align-items: center;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.parrot-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.parrot-avatar-container {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 16px;
  background: #f5f7fa;
  flex-shrink: 0;
}

.parrot-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.parrot-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.parrot-main-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parrot-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.gender-icon {
  font-size: 16px;
}
.gender-icon.male { color: #409eff; }
.gender-icon.female { color: #f56c6c; }

.parrot-status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f0f9eb;
  color: #67c23a;
}
.parrot-status-tag.sick { background: #fef0f0; color: #f56c6c; }
.parrot-status-tag.recovering { background: #fdf6ec; color: #e6a23c; }

.parrot-sub-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.divider {
  color: #dcdfe6;
}

.parrot-action {
  color: #c0c4cc;
  margin-left: 16px;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
}
</style>
