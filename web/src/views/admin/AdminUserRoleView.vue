<template>
  <div class="admin-page">
    <div class="header">
      <h2>用户与角色管理</h2>
      <div class="header-actions">
        <el-input v-model="keyword" placeholder="按昵称/用户名/手机号搜索" style="width:280px" />
        <el-button @click="fetchUsers" :loading="loading">搜索</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-table :data="users" v-loading="loading" style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="s"><img :src="avatar(s.row)" class="avatar"/></template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="160" />
        <el-table-column prop="username" label="用户名" width="160" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="role" label="角色" width="160">
          <template #default="s">
            <el-select v-model="roleMap[s.row.id]" @change="val=>updateRole(s.row.id,val)" style="width:140px">
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="parrot_count" label="鹦鹉数量" width="120" />
        <el-table-column prop="total_expense" label="总支出" width="120" />
        <el-table-column prop="created_at" label="加入时间" width="180" />
      </el-table>
      <div class="pager">
        <el-pagination layout="prev, pager, next" :total="total" :page-size="perPage" :current-page="page" @current-change="changePage" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const users = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const roleMap = ref({})

const avatar = (u) => { const s = String(u.avatar_url||''); if (!s) return '/profile.png'; if (/^https?:\/\//.test(s)) return s; if (s.startsWith('/uploads/')) return s; return '/uploads/'+s.replace(/^\/?uploads\/?/,'') }

const fetchUsers = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/users', { params: { page: page.value, per_page: perPage.value, q: keyword.value||undefined } })
    if (r.data?.success) {
      const d = r.data.data || {}
      users.value = d.users || []
      total.value = d.total || 0
      roleMap.value = {}
      for (const u of users.value) roleMap.value[u.id] = u.role
    } else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const changePage = (p) => { page.value = p; fetchUsers() }
const updateRole = async (id, role) => {
  try {
    const r = await api.put(`/admin/users/${id}/role`, { role })
    if (r.data?.success) ElMessage.success('角色更新成功')
    else ElMessage.error(r.data?.message||'更新失败')
  } catch (_) { ElMessage.error('更新失败') }
}

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchUsers() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.pager { margin-top: 12px; display:flex; justify-content:center; }
</style>
