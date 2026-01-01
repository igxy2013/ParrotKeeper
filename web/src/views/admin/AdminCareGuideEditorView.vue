<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>饲养指南编辑</h2>
      <div class="header-actions">
        <el-button type="primary" @click="save" :loading="saving">保存修改</el-button>
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

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchConfig() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
</style>
