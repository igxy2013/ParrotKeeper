<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>用户管理</h2>
    </div>

    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <!-- Stats Cards -->
      <div class="stats-cards" v-loading="loadingStats">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">总用户</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">团队用户</div>
          <div class="stat-value">{{ stats.teamUsers }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">超级管理员</div>
          <div class="stat-value">{{ stats.roleSuperAdmin }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">管理员</div>
          <div class="stat-value">{{ stats.roleAdmin }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">普通用户</div>
          <div class="stat-value">{{ stats.roleUser }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">团队数量</div>
          <div class="stat-value">{{ stats.teamCount }}</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">平均成员</div>
          <div class="stat-value">{{ stats.avgMembers }}</div>
        </el-card>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索用户昵称/ID"
          clearable
          style="width: 200px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="modeFilter" placeholder="用户模式" style="width: 140px" @change="handleSearch">
          <el-option label="全部模式" value="all" />
          <el-option label="个人模式" value="personal" />
          <el-option label="团队模式" value="team" />
        </el-select>

        <el-select v-model="sortBy" placeholder="排序方式" style="width: 140px" @change="handleSortChange">
          <el-option label="按注册时间" value="created_at" />
          <el-option label="按鹦鹉数量" value="parrot_count" />
          <el-option label="按用户名称" value="nickname" />
          <el-option label="按积分数量" value="points" />
        </el-select>

        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <!-- User Table -->
      <el-table :data="users" v-loading="loadingList" style="width: 100%" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" min-width="180">
          <template #default="scope">
            <div class="user-cell">
              <el-avatar :size="32" :src="getAvatarUrl(scope.row.avatar_url)" />
              <span class="nickname">{{ scope.row.nickname || '未命名' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="120">
          <template #default="scope">
            <el-tag :type="getRoleType(scope.row.role)">{{ getRoleLabel(scope.row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="parrot_count" label="鹦鹉数量" width="100" sortable="custom" />
        <el-table-column prop="points" label="积分" width="100" sortable="custom" />
        <el-table-column prop="created_at" label="注册时间" width="180">
           <template #default="scope">
             {{ formatDate(scope.row.created_at) }}
           </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="perPage"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')

// Stats Data
const loadingStats = ref(false)
const stats = ref({
  totalUsers: 0,
  teamUsers: 0,
  roleSuperAdmin: 0,
  roleAdmin: 0,
  roleUser: 0,
  teamCount: 0,
  avgMembers: 0
})

// List Data
const loadingList = ref(false)
const users = ref([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const keyword = ref('')
const modeFilter = ref('all')
const sortBy = ref('created_at')
const sortOrder = ref('desc')

const getAvatarUrl = (url) => {
  if (!url) return '/profile.png' // Fallback image
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
}

const getRoleLabel = (role) => {
  if (role === 'super_admin') return '超级管理员'
  if (role === 'admin') return '管理员'
  return '普通用户'
}

const getRoleType = (role) => {
  if (role === 'super_admin') return 'danger'
  if (role === 'admin') return 'warning'
  return 'info'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const s = String(dateStr).trim()
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    const ms = s.length > 10 ? n : n * 1000
    const d = new Date(ms)
    return d.toLocaleString('zh-CN', { hour12: false })
  }
  let str = s.replace(' ', 'T')
  if (/[Zz]|[\+\-]\d{2}:?\d{2}$/.test(str)) {
    const d = new Date(str)
    return d.toLocaleString('zh-CN', { hour12: false })
  }
  const d = new Date(str + 'Z')
  return d.toLocaleString('zh-CN', { hour12: false })
}

// Fetch Stats
const fetchStats = async () => {
  loadingStats.value = true
  try {
    const res = await api.get('/admin/users/stats')
    if (res.data && res.data.success) {
      const d = res.data.data || {}
      const rc = d.role_counts || {}
      const ts = d.team_stats || {}
      stats.value = {
        totalUsers: typeof d.total_users === 'number' ? d.total_users : (d.total || 0),
        teamUsers: typeof d.team_users === 'number' ? d.team_users : (d.team || 0),
        roleSuperAdmin: rc.super_admin || 0,
        roleAdmin: rc.admin || 0,
        roleUser: rc.user || 0,
        teamCount: ts.team_count || 0,
        avgMembers: ts.avg_members || 0
      }
    } else {
       // Fallback handled silently or simplified
       console.warn('Stats API returned fail')
    }
  } catch (e) {
    console.error('Fetch stats error', e)
    ElMessage.error('获取统计数据失败')
  } finally {
    loadingStats.value = false
  }
}

// Fetch List
const fetchList = async () => {
  loadingList.value = true
  try {
    const params = {
      page: page.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (modeFilter.value && modeFilter.value !== 'all') params.user_mode = modeFilter.value

    const res = await api.get('/admin/users', { params })
    if (res.data && res.data.success) {
      users.value = res.data.data.items || []
      total.value = res.data.data.pagination?.total || users.value.length
    }
  } catch (e) {
    console.error('Fetch users error', e)
    ElMessage.error('获取用户列表失败')
  } finally {
    loadingList.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}

const handleSortChange = (val) => {
  if (val === 'nickname') {
    sortOrder.value = 'asc'
  } else {
    sortOrder.value = 'desc'
  }
  page.value = 1
  fetchList()
}

const handleSizeChange = (val) => {
  perPage.value = val
  page.value = 1
  fetchList()
}

const handlePageChange = (val) => {
  page.value = val
  fetchList()
}

onMounted(async () => {
  await (authStore.refreshProfile && authStore.refreshProfile())
  if (isSuperAdmin.value) {
    fetchStats()
    fetchList()
  }
})
</script>

<style scoped>
.admin-page {
  padding-bottom: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.no-access {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  color: #909399;
}
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card .stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-card .stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nickname {
  font-weight: 500;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
