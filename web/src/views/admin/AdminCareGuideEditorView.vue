<template>
  <div class="admin-page">
    <div class="header">
      <div class="header-left">
        <el-button link @click="goBack">返回</el-button>
        <h2>护理指南编辑</h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-alert type="info" title="请以JSON结构编辑，至少包含 sections 数组" show-icon />
      <el-input type="textarea" v-model="raw" :rows="20" placeholder="在此粘贴或编辑配置JSON" />
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
const raw = ref('')
const saving = ref(false)

const fetchConfig = async () => {
  try {
    const res = await api.get('/care-guide')
    if (res.data && res.data.success) raw.value = JSON.stringify(res.data.data, null, 2)
  } catch (_) {}
}

const save = async () => {
  saving.value = true
  try {
    let data
    try { data = JSON.parse(raw.value || '{}') } catch (e) { ElMessage.error('JSON格式错误'); saving.value = false; return }
    const res = await api.post('/care-guide', data)
    if (res.data && res.data.success) ElMessage.success('保存成功')
    else ElMessage.error(res.data?.message || '保存失败')
  } catch (_) { ElMessage.error('保存失败') } finally { saving.value = false }
}

const goBack = () => { router.push('/admin') }

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchConfig() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
</style>
