<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>会员兑换码</h2>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card class="toolbar" shadow="never">
        <el-form :inline="true">
          <el-form-item label="会员等级">
            <el-select v-model="form.tier" style="width:160px">
              <el-option label="专业版 Pro" value="pro" />
              <el-option label="团队版 Team" value="team" />
            </el-select>
          </el-form-item>
          <el-form-item label="团队级别" v-if="form.tier==='team'">
            <el-select v-model="form.team_level" style="width:160px">
              <el-option label="基础版" value="basic" />
              <el-option label="高级版" value="advanced" />
            </el-select>
          </el-form-item>
          <el-form-item label="有效天数">
            <el-input-number v-model="form.duration_days" :min="1" :max="36500" />
          </el-form-item>
          <el-form-item label="生成数量">
            <el-input-number v-model="form.count" :min="1" :max="100" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="creating" @click="createCodes">生成兑换码</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <div class="filters">
          <el-select v-model="status" placeholder="状态" clearable style="width:160px" @change="fetchList">
            <el-option label="全部" value="all" />
            <el-option label="可用" value="active" />
            <el-option label="已使用" value="used" />
            <el-option label="已过期" value="expired" />
          </el-select>
          <el-button @click="fetchList" :loading="loading">刷新</el-button>
        </div>
        <el-table :data="items" v-loading="loading" style="width: 100%">
          <el-table-column prop="code" label="兑换码" min-width="160" />
          <el-table-column label="等级" width="120">
            <template #default="s">{{ tierLabel(s.row.tier) }}</template>
          </el-table-column>
          <el-table-column label="团队级别" width="120">
            <template #default="s">{{ teamLevelLabel(s.row.team_level) }}</template>
          </el-table-column>
          <el-table-column prop="duration_days" label="天数" width="100" />
          <el-table-column label="状态" width="120">
            <template #default="s">
              <el-tag :type="statusTagType(s.row.status)">{{ statusLabel(s.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" min-width="180" />
          <el-table-column prop="used_at" label="使用时间" min-width="180" />
          <el-table-column label="操作" width="120">
            <template #default="s">
              <el-popconfirm title="确认删除该兑换码？" @confirm="removeCode(s.row)">
                <template #reference>
                  <el-button type="danger" link>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
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
const creating = ref(false)
const items = ref([])
const status = ref('all')
const form = ref({ tier: 'pro', team_level: 'basic', duration_days: 30, count: 1 })

const tierLabel = (t) => t==='team' ? '团队版' : '专业版'
const teamLevelLabel = (l) => l==='advanced' ? '高级版' : (l==='basic' ? '基础版' : '—')
const statusLabel = (s) => s==='active' ? '可用' : (s==='used' ? '已使用' : (s==='expired' ? '已过期' : '—'))
const statusTagType = (s) => s==='active' ? 'success' : (s==='used' ? 'info' : 'warning')

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/redemption/codes', { params: { status: status.value || 'all' } })
    if (r.data?.success) items.value = r.data.data?.items || []
    else ElMessage.error(r.data?.message || '加载失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '加载失败') }
  finally { loading.value = false }
}

const createCodes = async () => {
  if (creating.value) return
  creating.value = true
  try {
    const payload = { tier: form.value.tier, duration_days: form.value.duration_days, count: form.value.count }
    if (form.value.tier === 'team') payload.team_level = form.value.team_level
    const r = await api.post('/redemption/codes', payload)
    if (r.data?.success) { ElMessage.success(`已生成 ${r.data.data?.count || 0} 个兑换码`); fetchList() }
    else ElMessage.error(r.data?.message || '生成失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '生成失败') }
  finally { creating.value = false }
}

const removeCode = async (row) => {
  try {
    const r = await api.delete(`/redemption/codes/${row.code}`)
    if (r.data?.success) { ElMessage.success('已删除'); fetchList() }
    else ElMessage.error(r.data?.message || '删除失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '删除失败') }
}

onMounted(async () => { authStore.refreshProfile && authStore.refreshProfile(); if (isSuperAdmin.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { margin-bottom: 12px; }
.filters { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
</style>

