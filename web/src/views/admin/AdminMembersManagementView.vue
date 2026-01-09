<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>会员管理</h2>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card class="toolbar" shadow="never">
        <div class="filters">
          <el-input v-model="keyword" placeholder="按昵称或OpenID搜索" clearable style="width:240px" @clear="fetchList" @keyup.enter="fetchList" />
          <el-select v-model="tierFilter" placeholder="会员等级" style="width:180px" @change="applyFilter">
            <el-option label="全部会员" value="all" />
            <el-option label="专业版 Pro" value="pro" />
            <el-option label="团队版 Team" value="team" />
          </el-select>
          <el-button @click="fetchList" :loading="loading">查询</el-button>
        </div>
      </el-card>

      <el-card shadow="never">
        <el-table :data="filteredItems" v-loading="loading" style="width: 100%">
          <el-table-column label="头像" width="80">
            <template #default="s">
              <el-avatar :size="32" :src="avatarSrc(s.row)" />
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="昵称" min-width="140" />
          <el-table-column prop="openid" label="OpenID" min-width="200" />
          <el-table-column label="会员等级" width="140">
            <template #default="s">
              <el-tag :type="tierTagType(s.row.subscription_tier)">{{ tierLabel(s.row.subscription_tier) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="subscription_expire_at" label="过期时间" min-width="180" />
          <el-table-column label="操作" min-width="320">
            <template #default="s">
              <div class="actions">
                <el-button size="small" @click="setTier(s.row, 'pro')">设为Pro</el-button>
                <el-button size="small" @click="setTier(s.row, 'team')">设为Team</el-button>
                <el-button size="small" type="primary" @click="extendDays(s.row, 30)">延期30天</el-button>
                <el-button size="small" type="danger" @click="cancelMembership(s.row)">取消会员</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination">
          <el-pagination
            background layout="prev, pager, next"
            :total="total" :page-size="perPage" :current-page="page"
            @current-change="onPageChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')

const loading = ref(false)
const items = ref([])
const keyword = ref('')
const tierFilter = ref('all')
const page = ref(1)
const perPage = ref(50)
const total = ref(0)

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/users', { params: { page: page.value, per_page: perPage.value, keyword: keyword.value } })
    if (r.data?.success) {
      items.value = (r.data.data?.items || [])
      total.value = r.data.data?.pagination?.total || 0
    } else {
      ElMessage.error(r.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载失败')
  } finally { loading.value = false }
}

onMounted(async () => { authStore.refreshProfile && authStore.refreshProfile(); if (isSuperAdmin.value) fetchList() })

const filteredItems = computed(() => {
  if (tierFilter.value === 'all') return items.value
  return items.value.filter(x => String(x.subscription_tier || 'free') === tierFilter.value)
})

const applyFilter = () => {}

const tierLabel = (t) => {
  const v = String(t || 'free')
  if (v === 'pro') return '专业版 Pro'
  if (v === 'team') return '团队版 Team'
  return '免费版 Free'
}
const tierTagType = (t) => {
  const v = String(t || 'free')
  if (v === 'pro') return 'success'
  if (v === 'team') return 'warning'
  return 'info'
}

const avatarSrc = (u) => {
  const url = u.avatar_url
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
}

const setTier = async (row, tier) => {
  try {
    const r = await api.put(`/admin/users/${row.id}`, { subscription_tier: tier })
    if (r.data?.success) { ElMessage.success('已更新'); fetchList() }
    else ElMessage.error(r.data?.message || '更新失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '更新失败') }
}

const extendDays = async (row, days) => {
  try {
    const r = await api.put(`/admin/users/${row.id}`, { subscription_extend_days: days })
    if (r.data?.success) { ElMessage.success('已延期'); fetchList() }
    else ElMessage.error(r.data?.message || '操作失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '操作失败') }
}

const cancelMembership = async (row) => {
  try {
    const r = await api.put(`/admin/users/${row.id}`, { subscription_cancel: true })
    if (r.data?.success) { ElMessage.success('已取消'); fetchList() }
    else ElMessage.error(r.data?.message || '操作失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '操作失败') }
}

const onPageChange = (p) => { page.value = p; fetchList() }
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { margin-bottom: 12px; }
.filters { display:flex; align-items:center; gap:12px; }
.actions { display:flex; align-items:center; gap:8px; }
.pagination { display:flex; justify-content:flex-end; padding:12px 0; }
</style>

