<template>
  <div class="parrots-container">
    <div class="header-actions">
      <h2>我的鹦鹉</h2>
      <el-button type="primary" :icon="Plus" class="add-btn" @click="handleAdd">添加新鹦鹉</el-button>
    </div>
    <div class="toolbar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="按名称/编号/脚环号搜索" 
        clearable 
        :prefix-icon="Search"
        class="search-input"
      />
      <div class="toolbar-right">
        <el-select v-model="selectedSpeciesId" placeholder="全部品种" clearable filterable class="filter-item">
          <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="selectedStatus" placeholder="全部状态" clearable class="filter-item">
          <el-option :label="'健康'" :value="'healthy'" />
          <el-option :label="'生病'" :value="'sick'" />
          <el-option :label="'康复中'" :value="'recovering'" />
          <el-option :label="'观察中'" :value="'observing'" />
        </el-select>
        <el-select v-model="selectedSort" placeholder="排序方式" class="filter-item">
          <el-option v-for="opt in sortOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
    </div>
    <div class="stats-overview">
      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-title">鹦鹉总数</div>
          <div class="stat-value">{{ total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">性别分布</div>
          <div class="stat-pills">
            <span class="pill pill-male">公 {{ stats.male }}</span>
            <span class="pill pill-female">母 {{ stats.female }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-title">健康状况</div>
          <div class="stat-pills">
            <span class="pill pill-healthy">健康 {{ stats.healthy }}</span>
            <span class="pill pill-sick">生病 {{ stats.sick }}</span>
            <span class="pill pill-recovering">康复中 {{ stats.recovering }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-title">平均体重</div>
          <div class="stat-value">{{ stats.avgWeight }}</div>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else class="parrot-list">
      <div v-for="parrot in parrots" :key="parrot.id" class="parrot-item" @click="handleEdit(parrot)">
        <div class="parrot-avatar-container">
          <img :src="getParrotImage(parrot)" class="parrot-avatar" @error="onAvatarError($event, parrot)" />
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
          <div class="parrot-extra-info">
            <span v-if="formatWeight(parrot.weight)" class="info-item">体重：{{ formatWeight(parrot.weight) }}</span>
            <span v-if="parrot.parrot_number" class="info-item">编号：{{ parrot.parrot_number }}</span>
            <span v-if="parrot.ring_number" class="info-item">脚环：{{ parrot.ring_number }}</span>
            <span v-if="formatDate(parrot.acquisition_date)" class="info-item">入住：{{ formatDate(parrot.acquisition_date) }}</span>
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
import { ref, onMounted, computed, watch } from 'vue'
import { Plus, Male, Female, ArrowRight, Search } from '@element-plus/icons-vue'
import api from '../api/axios'
import ParrotModal from '../components/ParrotModal.vue'

const parrots = ref([])
const loading = ref(false)
const showModal = ref(false)
const selectedParrot = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
let searchTimer = null
const speciesList = ref([])
const selectedSpeciesId = ref('')
const selectedStatus = ref('')
const selectedSort = ref('created_desc')
const sortOptions = [
  { label: '最新添加', value: 'created_desc', by: 'created_at', order: 'desc' },
  { label: '名称 A-Z', value: 'name_asc', by: 'name', order: 'asc' },
  { label: '名称 Z-A', value: 'name_desc', by: 'name', order: 'desc' },
  { label: '年龄从小到大', value: 'age_asc', by: 'birth_date', order: 'desc' },
  { label: '年龄从大到小', value: 'age_desc', by: 'birth_date', order: 'asc' }
]

const fetchParrots = async () => {
  loading.value = true
  try {
    const res = await api.get('/parrots', {
      params: {
        page: currentPage.value,
        per_page: pageSize.value,
        search: searchKeyword.value,
        species_id: selectedSpeciesId.value || undefined,
        health_status: selectedStatus.value || undefined,
        sort_by: sortOptions.find(o => o.value === selectedSort.value)?.by || 'created_at',
        sort_order: sortOptions.find(o => o.value === selectedSort.value)?.order || 'desc'
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
    recovering: '康复中',
    observing: '观察中'
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

const stats = computed(() => {
  const list = parrots.value || []
  const male = list.filter(p => p.gender === 'male').length
  const female = list.filter(p => p.gender === 'female').length
  const healthy = list.filter(p => p.health_status === 'healthy').length
  const sick = list.filter(p => p.health_status === 'sick').length
  const recovering = list.filter(p => p.health_status === 'recovering').length
  const weights = list.map(p => {
    const w = p.weight
    if (w === null || w === undefined || w === '') return null
    const n = typeof w === 'number' ? w : parseFloat(String(w))
    return isNaN(n) ? null : n
  }).filter(v => v !== null && isFinite(v))
  const avg = weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length) : 0
  const avgStr = avg ? `${Math.round(avg * 10) / 10} g` : '未知'
  return { male, female, healthy, sick, recovering, avgWeight: avgStr }
})

const formatWeight = (w) => {
  if (w === null || w === undefined || w === '') return ''
  const n = typeof w === 'number' ? w : parseFloat(String(w))
  if (isNaN(n) || !isFinite(n)) return ''
  return `${Math.round(n * 10) / 10} g`
}

const formatDate = (d) => {
  if (!d) return ''
  const t = new Date(d)
  if (isNaN(t.getTime())) return ''
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const getParrotImage = (parrot) => {
  const raw = parrot.avatar_url || parrot.photo_url || ''
  if (!raw) return getRandomAvatar(parrot.id)
  let url = String(raw).replace(/\\/g, '/').trim()
  if (!url) return getRandomAvatar(parrot.id)
  if (/^https?:\//.test(url)) return url
  if (url.startsWith('data:')) return url
  if (/\/uploads\//.test(url)) {
    const parts = url.split('/uploads/')
    const suffix = parts[1] || ''
    return `/uploads/${suffix.replace(/^images\//, '')}`
  }
  if (/^\/?uploads\//.test(url)) {
    const normalized = url.replace(/^\//, '').replace(/^uploads\/images\//, 'uploads/').replace(/^uploads\//, 'uploads/')
    return `/${normalized}`
  }
  if (/^\/?images\/parrot-avatar-/.test(url)) {
    return `/${url.replace(/^\/?images\//, '')}`
  }
  if (/^\/?images\//.test(url)) {
    return `/${url.replace(/^\/?images\//, '')}`
  }
  if (/^\/?parrot-avatar-/.test(url)) return url.startsWith('/') ? url : `/${url}`
  return `/uploads/${url.replace(/^\//, '').replace(/^images\//, '')}`
}

const onAvatarError = (e, parrot) => {
  if (e && e.target) {
    e.target.src = getRandomAvatar(parrot.id)
  }
}

onMounted(() => {
  fetchParrots()
  loadSpecies()
})

const loadSpecies = async () => {
  try {
    const res = await api.get('/parrots/species')
    if (res.data && res.data.success) {
      speciesList.value = res.data.data || []
    }
  } catch (_) {}
}

watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchParrots()
  }, 300)
})

watch([selectedSpeciesId, selectedStatus, selectedSort], () => {
  currentPage.value = 1
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

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.search-input { flex: 1 1 360px; min-width: 260px; }
.toolbar-right { display: flex; gap: 12px; }
.filter-item { min-width: 150px; }

.stats-overview {
  margin-bottom: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.stat-card.stat-primary {
  background: linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%);
  color: #ffffff;
}
.stat-title {
  font-size: 13px;
  color: #909399;
}
.stat-card.stat-primary .stat-title {
  color: rgba(255,255,255,0.9);
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-card.stat-primary .stat-value {
  color: #ffffff;
}
.stat-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.pill {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f5f7fa;
  color: #606266;
}
.pill-healthy { background: #f0f9eb; color: #67c23a; }
.pill-sick { background: #fef0f0; color: #f56c6c; }
.pill-recovering { background: #fdf6ec; color: #e6a23c; }
.pill-male { background: #ecf5ff; color: #409eff; }
.pill-female { background: #fef0f0; color: #f56c6c; }

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
.parrot-status-tag.observing { background: #ecf5ff; color: #409eff; }

.parrot-sub-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.parrot-extra-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
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
