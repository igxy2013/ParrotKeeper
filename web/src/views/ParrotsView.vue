<template>
  <div class="parrots-container page-container">
    <div class="page-header">
      <h2>我的鹦鹉</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" class="add-btn" @click="handleAdd">添加新鹦鹉</el-button>
      </div>
    
    </div>
    <div class="toolbar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="按名称/饲养人/脚环号搜索" 
        clearable 
        :prefix-icon="Search"
        class="search-input"
      />
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" class="view-toggle">
          <el-radio-button value="card"><el-icon><Grid /></el-icon></el-radio-button>
          <el-radio-button value="list"><el-icon><Tickets /></el-icon></el-radio-button>
        </el-radio-group>
        <el-select v-model="selectedSpeciesId" placeholder="全部品种" clearable filterable class="filter-item">
          <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="selectedGender" placeholder="全部性别" clearable class="filter-item">
          <el-option :label="'公'" :value="'male'" />
          <el-option :label="'母'" :value="'female'" />
          <el-option :label="'未知'" :value="'unknown'" />
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
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">鹦鹉总数</div>
              <div class="stat-value">{{ overviewStats.total_parrots || 0 }}</div>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-gender">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">性别分布</div>
              <div class="stat-value">
                <span class="pill pill-male">公 {{ overviewStats.gender_counts?.male || 0 }}</span>
                <span class="pill pill-female">母 {{ overviewStats.gender_counts?.female || 0 }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-health">
              <el-icon><FirstAidKit /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">健康状况</div>
              <div class="stat-value" style="display: flex; gap: 4px; flex-wrap: wrap;">
                <span class="pill pill-healthy">健康 {{ overviewStats.health_status?.healthy || 0 }}</span>
                <span class="pill pill-sick">生病 {{ overviewStats.health_status?.sick || 0 }}</span>
                <span class="pill pill-recovering">康复 {{ overviewStats.health_status?.recovering || 0 }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-weight">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">平均体重</div>
              <div class="stat-value">{{ formatAvgWeight(overviewStats.avg_weight) }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else class="parrot-list" :class="`view-${viewMode}`">
      <template v-if="viewMode === 'list'">
        <el-table :data="parrots" border stripe size="small" class="parrots-table" @row-click="onListRowClick">
          <el-table-column :key="'name'" label="名称" min-width="160">
            <template #default="{ row }">
              <span class="parrot-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column :key="'gender'" label="性别" min-width="140">
            <template #default="{ row }">
              <span>{{ getGenderLabel(row.gender) }}</span>
              <el-icon v-if="row.gender === 'male'" class="gender-icon male"><Male /></el-icon>
              <el-icon v-else-if="row.gender === 'female'" class="gender-icon female"><Female /></el-icon>
            </template>
          </el-table-column>
          <el-table-column :key="'species'" label="品种" min-width="140">
            <template #default="{ row }">{{ row.species?.name || '未知品种' }}</template>
          </el-table-column>
          <el-table-column :key="'color'" label="羽色" min-width="160">
            <template #default="{ row }">{{ decorateColorForDisplay(row.species?.name || row.species_name, row.color) || '-' }}</template>
          </el-table-column>
          <el-table-column :key="'age'" label="年龄" min-width="120">
            <template #default="{ row }">{{ calculateAge(row.birth_date) }}</template>
          </el-table-column>
          <el-table-column :key="'weight'" label="体重" min-width="100">
            <template #default="{ row }">{{ formatWeight(row.weight) || '-' }}</template>
          </el-table-column>
          <el-table-column :key="'owner'" label="饲养人" min-width="140">
            <template #default="{ row }">{{ getOwnerName(row) || '-' }}</template>
          </el-table-column>
          <el-table-column v-if="authStore.user?.user_mode === 'team'" :key="'group'" label="分组" min-width="120">
            <template #default="{ row }">{{ getGroupName(row) || '-' }}</template>
          </el-table-column>
          <el-table-column :key="'ring'" label="脚环号" min-width="120">
            <template #default="{ row }">{{ row.ring_number || '-' }}</template>
          </el-table-column>
          <el-table-column :key="'status'" label="状态" min-width="120">
            <template #default="{ row }">{{ getHealthLabel(row.health_status) }}</template>
          </el-table-column>
          <el-table-column :key="'actions'" label="操作" min-width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" class="view-btn" @click.stop="openDetailModal(row)">
                查看
                <el-icon style="margin-left:4px"><ArrowRight /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template v-else>
        <div v-for="parrot in parrots" :key="parrot.id" class="parrot-item" @click="openDetailModal(parrot)">
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
            <span v-if="getOwnerName(parrot)" class="info-item">饲养人：{{ getOwnerName(parrot) }}</span>
            <span v-if="parrot.ring_number" class="info-item">脚环号：{{ parrot.ring_number }}</span>
            <span v-if="parrot.color" class="info-item">羽色：{{ decorateColorForDisplay(parrot.species?.name || parrot.species_name, parrot.color) }}</span>
            <span v-if="formatDate(parrot.acquisition_date)" class="info-item">入住：{{ formatDate(parrot.acquisition_date) }}</span>
          </div>
          </div>
          <div class="parrot-action">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </template>
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
      :initial-mode="initialModalMode"
      @success="handleParrotsChanged" 
    />
    <ParrotDetailModal 
      v-model="showDetailModal" 
      :parrot-id="detailParrotId" 
      @deleted="handleDeleted"
      @edit="handleEditFromDetail"
    />

    <LimitModal 
      v-model="showLimitDialog" 
      :limit-count="limitCount" 
      :show-redeem="false"
      @upgrade="goToMembershipCenter"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Plus, Male, Female, ArrowRight, Search, Grid, Tickets, User, FirstAidKit, TrendCharts } from '@element-plus/icons-vue'
import api from '../api/axios'
import { getCache, setCache } from '@/utils/cache'
import ParrotModal from '../components/ParrotModal.vue'
import ParrotDetailModal from '../components/ParrotDetailModal.vue'
import { useAuthStore } from '../stores/auth'
import LimitModal from '../components/LimitModal.vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const parrots = ref([])
const loading = ref(false)
const showModal = ref(false)
const selectedParrot = ref(null)
const initialModalMode = ref('form')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
let searchTimer = null
const speciesList = ref([])
const selectedSpeciesId = ref('')
const selectedGender = ref('')
const selectedStatus = ref('')
const selectedSort = ref('created_desc')
const viewMode = ref('card')

const overviewStats = ref({})
const showLimitDialog = ref(false)
const limitCount = ref(0)
const router = useRouter()

const goToMembershipCenter = () => {
  showLimitDialog.value = false
  router.push('/membership')
}

const PARROTS_CACHE_KEY = 'parrots_list_default'
const PARROTS_CACHE_TTL = 60000

// Initialize viewMode from localStorage or user_mode
const initViewMode = () => {
  const mode = localStorage.getItem('user_mode')
  if (mode === 'team') {
    viewMode.value = 'list'
  } else {
    viewMode.value = 'card'
  }
}

onMounted(() => {
  initViewMode()
  fetchParrots()
  // ... other onMounted logic if any
  fetchOverview()
  loadTeamGroups()
})

// Watch for user mode changes via storage event or other mechanism if needed
// But since SideNav reloads the page on switchMode, initViewMode is sufficient on load.
// However, if we want to be safe in case page doesn't reload (future changes):
watch(() => authStore.user?.user_mode, (newMode) => {
   // This might not trigger if SideNav just sets localStorage and reloads without updating pinia state first
   // But let's keep it just in case
   if (newMode === 'team') {
     viewMode.value = 'list'
   } else {
     viewMode.value = 'card'
   }
})

const sortOptions = [
  { label: '最新添加', value: 'created_desc', by: 'created_at', order: 'desc' },
  { label: '名称 A-Z', value: 'name_asc', by: 'name', order: 'asc' },
  { label: '名称 Z-A', value: 'name_desc', by: 'name', order: 'desc' },
  { label: '年龄从小到大', value: 'age_asc', by: 'birth_date', order: 'desc' },
  { label: '年龄从大到小', value: 'age_desc', by: 'birth_date', order: 'asc' }
]

const fetchParrots = async (withLoading = true) => {
  if (withLoading) loading.value = true
  try {
    const res = await api.get('/parrots', {
      params: {
        page: currentPage.value,
        per_page: pageSize.value,
        search: searchKeyword.value,
        species_id: selectedSpeciesId.value || undefined,
        gender: selectedGender.value || undefined,
        health_status: selectedStatus.value || undefined,
        sort_by: sortOptions.find(o => o.value === selectedSort.value)?.by || 'created_at',
        sort_order: sortOptions.find(o => o.value === selectedSort.value)?.order || 'desc'
      }
    })
    if (res.data.success) {
      parrots.value = res.data.data.parrots || []
      total.value = res.data.data.total || 0
      const isDefaultQuery =
        currentPage.value === 1 &&
        !searchKeyword.value &&
        !selectedSpeciesId.value &&
        !selectedGender.value &&
        !selectedStatus.value &&
        selectedSort.value === 'created_desc'
      if (isDefaultQuery) {
        setCache(PARROTS_CACHE_KEY, {
          parrots: parrots.value,
          total: total.value,
          pageSize: pageSize.value
        })
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (withLoading) loading.value = false
  }
}

const fetchOverview = async () => {
  try {
    const res = await api.get('/statistics/overview')
    if (res.data && res.data.success) {
      overviewStats.value = res.data.data || {}
    }
  } catch (_) {}
}

const handleAdd = async () => {
  selectedParrot.value = null
  initialModalMode.value = 'form'

  const u = authStore.user || {}
  const membershipEnabled = (u.membership_enabled !== false)
  if (!membershipEnabled) { showModal.value = true; return }

  try { await (authStore.refreshProfile && authStore.refreshProfile()) } catch(_) {}
  const tier = String((authStore.user || {}).subscription_tier || 'free').toLowerCase()
  const mode = localStorage.getItem('user_mode') || 'personal'
  const teamLevel = String((authStore.user || {}).team_level || '').toLowerCase()

  let limits = { free_personal: 10, free_team: 20, pro_personal: 100, team_basic: 1000, team_advanced: 0 }
  try {
    const r = await api.get('/membership/limits')
    if (r.data && r.data.success) {
      const d = r.data.data || {}
      limits = {
        free_personal: Number(d.free_personal || 10),
        free_team: Number(d.free_team || 20),
        pro_personal: Number(d.pro_personal || 100),
        team_basic: Number(d.team_basic || 1000),
        team_advanced: Number(d.team_advanced || 0)
      }
    }
  } catch(_) {}

  let limit = 0
  if (tier === 'free') limit = (mode === 'team') ? limits.free_team : limits.free_personal
  else if (tier === 'pro') limit = limits.pro_personal
  else if (tier === 'team') limit = (teamLevel === 'basic' ? limits.team_basic : (limits.team_advanced || 0))

  let totalKnown = Number(overviewStats.value.total_parrots || 0)
  if (!totalKnown) {
    try {
      const res = await api.get('/statistics/overview')
      if (res.data && res.data.success) totalKnown = Number((res.data.data || {}).total_parrots || 0)
      else totalKnown = Math.max(Number(total.value || 0), Array.isArray(parrots.value) ? parrots.value.length : 0)
    } catch(_) {
      totalKnown = Math.max(Number(total.value || 0), Array.isArray(parrots.value) ? parrots.value.length : 0)
    }
  }

  if (limit && totalKnown >= limit) {
    limitCount.value = limit
    showLimitDialog.value = true
    return
  }

  showModal.value = true
}



const showDetailModal = ref(false)
const detailParrotId = ref('')

const openDetailModal = (parrot) => {
  if (!parrot || !parrot.id) return
  detailParrotId.value = String(parrot.id)
  showDetailModal.value = true
}

const handleDeleted = async () => {
  showDetailModal.value = false
  await handleParrotsChanged()
}

  const handleEditFromDetail = (p) => {
    selectedParrot.value = p || null
    showDetailModal.value = false
    showModal.value = true
  }

  const onListRowClick = (row) => {
    if (!row || !row.id) return
    openDetailModal(row)
  }

const handlePageChange = (page) => {
  currentPage.value = page
  fetchParrots()
}

const calculateAge = (birthDate) => {
  if (!birthDate) return '年龄未知'
  const birth = new Date(birthDate)
  const now = new Date()
  
  birth.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  
  if (birth > now) return '未出生'

  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()

  if (days < 0) {
    months--
    // Get days in previous month
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += lastMonth.getDate()
  }

  if (months < 0) {
    years--
    months += 12
  }

  let ageStr = ''
  if (years > 0) ageStr += `${years}岁`
  if (months > 0) ageStr += `${months}个月`
  if (days > 0) ageStr += `${days}天`
  
  if (!ageStr) ageStr = '0天'
  
  return ageStr
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

const getGenderLabel = (g) => {
  const map = {
    male: '雄性',
    female: '雌性',
    unknown: '未知'
  }
  return map[g] || '未知'
}

  const getOwnerName = (p) => {
    if (!p) return ''
    const o = p.owner || {}
    return p.owner_name || o.nickname || o.username || o.account_username || ''
  }

  const teamGroups = ref([])
  const getGroupName = (p) => {
    if (!p || !p.group_id) return ''
    const gid = String(p.group_id)
    const g = (teamGroups.value || []).find(it => String(it.id) === gid)
    return g && (g.name || '') || ''
  }

  const loadTeamGroups = async () => {
    try {
      const teamId = authStore.user && authStore.user.current_team_id
      if (!teamId) { teamGroups.value = []; return }
      const r = await api.get(`/teams/${teamId}/groups`)
      const data = r.data && (r.data.data || r.data)
      const arr = (data && (data.groups || data.items)) || (Array.isArray(data) ? data : [])
      teamGroups.value = Array.isArray(arr) ? arr : []
    } catch (_) {
      teamGroups.value = []
    }
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

const formatAvgWeight = (n) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n || ''))
  if (!v || !isFinite(v)) return '未知'
  return `${Math.round(v * 10) / 10} g`
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

const decorateColorForDisplay = (speciesName, name) => {
  const s = String(speciesName || '')
  const n = String(name || '')
  if (s === '牡丹鹦鹉') {
    if (n === '黄边桃' || n.includes('蓝腰黄桃')) return '黄边桃(蓝腰黄桃)'
  }
  return n
}

const getParrotImage = (parrot) => {
  const raw = parrot.photo_url || parrot.avatar_url || ''
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

const preloadFromCache = () => {
  try {
    const cached = getCache(PARROTS_CACHE_KEY, PARROTS_CACHE_TTL)
    if (!cached || !Array.isArray(cached.parrots)) return false
    parrots.value = cached.parrots
    total.value = cached.total || cached.parrots.length
    currentPage.value = 1
    selectedSort.value = 'created_desc'
    loading.value = false
    return true
  } catch (_) {
    return false
  }
}

onMounted(() => {
  initViewMode()
  const hasCache = preloadFromCache()
  if (!hasCache) {
    fetchParrots()
  } else {
    fetchParrots(false)
  }
  loadSpecies()
})

const loadSpecies = async () => {
  try {
    const res = await api.get('/parrots/species/owned')
    if (res.data && res.data.success) {
      speciesList.value = res.data.data || []
    }
  } catch (_) {}
}

const handleParrotsChanged = async () => {
  await fetchParrots()
  await loadSpecies()
}

watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchParrots()
  }, 300)
})

watch([selectedSpeciesId, selectedGender, selectedStatus, selectedSort], () => {
  currentPage.value = 1
  fetchParrots()
})
</script>

<style scoped>
.parrots-container { padding-bottom: 20px; }
.add-btn {
  background: var(--primary-gradient);
  border: none;
}

.view-btn {
  background: var(--primary-gradient);
  border: none;
  color: #ffffff;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
  overflow-x: auto;
}
.search-input { flex: 1 1 360px; min-width: 260px; }
.toolbar-right { display: flex; gap: 12px; align-items: center; flex-wrap: nowrap; }
.filter-item { min-width: 150px; }

.stats-overview { margin-bottom: 24px; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card :deep(.el-card__body) {
  padding: 16px;
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
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.icon-primary { background-color: #ecf5ff; color: #409eff; }
.icon-gender { background-color: #fdf6ec; color: #e6a23c; }
.icon-health { background-color: #f0f9eb; color: #67c23a; }
.icon-weight { background-color: #f4f4f5; color: #909399; }

.stat-pills { display: flex; gap: 4px; flex-wrap: wrap; }
.pill { font-size: 12px; padding: 2px 6px; border-radius: 4px; display: inline-block; line-height: 1.4; }
.pill-male { background: #eff6ff; color: #2563eb; }
.pill-female { background: #fff1f2; color: #e11d48; }
.pill-healthy { background: #f0fdf4; color: #16a34a; }
.pill-sick { background: #fef2f2; color: #dc2626; }
.pill-recovering { background: #fff7ed; color: #ea580c; }

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
  font-size: 13px;
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

/* View Mode Styles */
.view-toggle {
  display: inline-flex !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  margin-right: 12px;
  flex-shrink: 0;
}

/* Card View (Grid) */
  .parrot-list.view-card {
    display: grid !important;
    grid-template-columns: repeat(5, 1fr) !important;
    gap: 24px !important;
  }
  
  .parrot-list.view-card .parrot-item {
    width: auto !important;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 16px;
    height: auto;
    margin-bottom: 0 !important;
  }
  
  @media (max-width: 1400px) {
    .parrot-list.view-card { grid-template-columns: repeat(4, 1fr) !important; }
  }
  @media (max-width: 1100px) {
    .parrot-list.view-card { grid-template-columns: repeat(3, 1fr) !important; }
  }
  @media (max-width: 800px) {
    .parrot-list.view-card { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 500px) {
    .parrot-list.view-card { grid-template-columns: repeat(1, 1fr) !important; }
  }

.parrot-list.view-card .parrot-avatar-container {
  margin-right: 0;
  margin-bottom: 12px;
  width: 80px;
  height: 80px;
}

.parrot-list.view-card .parrot-content {
  width: 100%;
  align-items: center;
}

.parrot-list.view-card .parrot-main-info {
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.parrot-list.view-card .parrot-sub-info {
  justify-content: center;
}

.parrot-list.view-card .parrot-extra-info {
  justify-content: center;
  flex-wrap: wrap;
}

.parrot-list.view-card .parrot-action {
  display: none;
}

/* List View (Compact) */
.parrot-list.view-list {
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.parrots-table { width: 100%; }

.parrot-list.view-list .parrot-item {
  border-radius: 0;
  box-shadow: none;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 0;
}

.parrot-list.view-list .parrot-item:last-child {
  border-bottom: none;
}

.parrot-list.view-list .parrot-item:hover {
  background-color: #f9f9fa;
  transform: none;
  box-shadow: none;
}

.parrot-list.view-list .parrot-avatar-container {
  display: none;
}

.parrot-list.view-list .parrot-content { display: none; }

.parrot-list.view-list .parrot-main-info { display: none; }

.parrot-list.view-list .parrot-sub-info { display: none; }

.parrot-list.view-list .parrot-extra-info { display: none; }

.parrot-list.view-list .parrot-action {
  margin-left: 12px;
}

.limit-dialog :deep(.el-dialog) { border-radius: 12px; overflow: hidden; }
.limit-dialog :deep(.el-dialog__header) { padding: 0; margin: 0; }
.limit-dialog :deep(.el-dialog__body) { padding: 0; }
.limit-dialog :deep(.el-dialog__footer) { padding: 16px 24px; border-top: 1px solid #f3f4f6; }
.limit-header-gradient { background: linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%); padding: 16px 20px; }
.limit-header-row { display: flex; align-items: center; justify-content: space-between; }
.limit-title { color: #ffffff; font-size: 16px; font-weight: 700; }
.limit-body { padding: 20px 24px; text-align: center; }
.limit-tip { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
.limit-count-pill { display: inline-block; padding: 6px 12px; border-radius: 9999px; background: #f0fdf4; color: #16a34a; font-weight: 700; margin: 8px 0 12px; }
.limit-hint { font-size: 13px; color: #6b7280; }
.limit-btn { background: var(--primary-gradient); border: none; color: #ffffff; border-radius: 12px; }
</style>
