<template>
  <div class="page-container">
    <div class="page-header">
      <h2>我的团队</h2>
      <div class="header-actions" v-if="teams.length > 0">
        <el-button type="primary" @click="goCreate" :disabled="hasAnyTeam">创建新团队</el-button>
        <el-button plain @click="goJoin" :disabled="hasAnyTeam">加入团队</el-button>
      </div>
    </div>
    
    <div class="content-wrapper" v-loading="loading">
      <!-- 当前选中的团队详情 -->
      <div v-if="team" class="current-team-section">
        <el-card class="team-hero-card" shadow="hover">
          <div class="hero-content">
            <div class="team-avatar-wrapper">
              <el-avatar :size="100" :src="team.avatar_url || '/group-line-gray.png'" shape="square" class="team-avatar" />
            </div>
            <div class="team-info-main">
              <div class="team-header-row">
                <h1 class="team-title">{{ team.name || '未命名团队' }}</h1>
                <el-tag :type="roleTagType" effect="dark" class="role-tag">{{ roleLabel }}</el-tag>
              </div>
              <p class="team-desc">{{ team.description || '暂无描述' }}</p>
              
              <div class="team-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ (team.members || []).length }}</span>
                  <span class="stat-label">成员</span>
                </div>
                <el-divider direction="vertical" />
                <div class="stat-item">
                  <span class="stat-value">{{ team.invite_code || '—' }}</span>
                  <span class="stat-label">邀请码</span>
                </div>
              </div>
              
              <div class="team-actions">
                <el-button type="primary" size="large" @click="goManage">管理团队</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 如果没有当前团队，显示引导 -->
      <div v-else-if="teams.length === 0" class="empty-state">
        <el-empty description="您还没有加入任何团队">
          <div class="empty-actions">
            <el-button type="primary" size="large" @click="goCreate">创建团队</el-button>
            <el-button size="large" @click="goJoin">加入团队</el-button>
          </div>
        </el-empty>
      </div>

      <!-- 已加入的其他团队列表 -->
      <div class="other-teams-section" v-if="ownedTeams.length > 0">
        <div class="section-header">
          <h3>我创建的团队 ({{ ownedTeams.length }})</h3>
        </div>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="t in ownedTeams" :key="t.id">
            <el-card 
              class="team-grid-card" 
              :class="{ 'is-active': team && team.id === t.id }" 
              shadow="hover"
              @click="switchTo(t.id)"
            >
              <div class="card-body">
                <div class="card-top">
                  <el-avatar :size="48" :src="t.avatar_url || '/group-line-gray.png'" shape="square" />
                  <div class="card-status" v-if="team && team.id === t.id">
                    <el-icon color="#67C23A"><Check /></el-icon> 当前
                  </div>
                </div>
                <div class="card-info">
                  <div class="card-name text-ellipsis">{{ t.name }}</div>
                  <div class="card-meta">
                    <span>ID: {{ t.id }}</span>
                    <span>{{ t.member_count }} 成员</span>
                  </div>
                </div>
                <div class="card-hover-action">
                  <el-button type="primary" link v-if="team && team.id !== t.id">切换至此团队</el-button>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
import api from '@/api/axios'

const router = useRouter()
const loading = ref(false)
const team = ref(null)
const teams = ref([])

const ownedTeams = computed(() => {
  return teams.value.filter(t => t.role === 'owner')
})

const hasOwnedTeam = computed(() => {
  return teams.value.some(t => t.role === 'owner')
})

const hasAnyTeam = computed(() => teams.value.length > 0)

const roleLabel = computed(() => {
  const r = String((team.value || {}).user_role || (team.value || {}).role || '')
  if (r === 'owner') return '创建者'
  if (r === 'admin') return '管理员'
  if (r) return '成员'
  return '未加入'
})

const roleTagType = computed(() => {
  const r = String((team.value || {}).user_role || (team.value || {}).role || '')
  if (r === 'owner') return 'warning'
  if (r === 'admin') return 'success'
  return 'info'
})

const fetchCurrent = async () => {
  loading.value = true
  try {
    const r = await api.get('/teams/current')
    if (r.data && r.data.success) {
      team.value = r.data.data
      const id = team.value && team.value.id
      if (id) {
        const d = await api.get(`/teams/${id}`)
        if (d.data && d.data.success) {
          team.value = Object.assign({}, team.value || {}, d.data.data || {})
        }
      }
    } else {
      team.value = null
    }
  } catch (_) { team.value = null } finally { loading.value = false }
}

const fetchTeams = async () => {
  try {
    const r = await api.get('/teams')
    if (r.data && r.data.success) {
      teams.value = r.data.data || []
      // 如果没有当前团队且只有一个团队，自动切换
      if (!team.value && teams.value.length === 1) {
        await switchTo(teams.value[0].id)
      }
    } else { teams.value = [] }
  } catch (_) { teams.value = [] }
}

const goManage = () => router.push('/team/manage')
const goJoin = () => router.push('/team/join')
const goCreate = () => router.push('/team/create')

const switchTo = async (id) => {
  if (team.value && team.value.id === id) return
  try {
    loading.value = true
    const r = await api.post(`/teams/${id}/switch`)
    if (r.data && r.data.success) {
      await fetchCurrent()
    }
  } catch (_) {} finally { loading.value = false }
}

onMounted(async () => { await fetchCurrent(); await fetchTeams() })
</script>

<style scoped>
.page-container {
  padding: 0 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 顶部当前团队卡片 */
.team-hero-card {
  border: none;
  background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
  border-radius: 16px;
  overflow: hidden;
}

.hero-content {
  display: flex;
  gap: 32px;
  padding: 16px;
}

.team-avatar {
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.team-info-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.team-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.team-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.team-desc {
  color: #606266;
  font-size: 14px;
  margin: 0 0 24px 0;
  max-width: 600px;
  line-height: 1.5;
}

.team-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

/* 列表部分 */
.section-header h3 {
  font-size: 18px;
  color: #1a1a1a;
  margin-bottom: 16px;
  font-weight: 600;
}

.team-grid-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.team-grid-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  border-color: var(--el-color-primary-light-5);
}

.team-grid-card.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.card-body {
  padding: 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #67C23A;
  font-weight: 600;
  background: #f0f9eb;
  padding: 2px 8px;
  border-radius: 10px;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  
  .team-header-row {
    justify-content: center;
  }
  
  .team-stats {
    justify-content: center;
  }
  
  .team-actions {
    display: flex;
    justify-content: center;
  }
}
</style>
