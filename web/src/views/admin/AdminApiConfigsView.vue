<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>API配置管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="save" :loading="saving">保存配置</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card class="cfg-card" shadow="never">
        <template #header><div class="section-title">核心配置</div></template>
        <el-form :model="form" label-width="180px">
          <el-form-item label="RemoveBG API Key"><el-input v-model="form.remove_bg_api_key" placeholder="不展示原值，请重新填写以更新" /></el-form-item>
          <el-form-item label="RemoveBG API URL"><el-input v-model="form.remove_bg_api_url" /></el-form-item>
          <el-form-item label="阿里云 API Key"><el-input v-model="form.aliyun_api_key" placeholder="不展示原值，请重新填写以更新" /></el-form-item>
          <el-form-item label="阿里云 Base URL"><el-input v-model="form.aliyun_base_url" /></el-form-item>
          <el-form-item label="阿里云模型"><el-input v-model="form.aliyun_model" /></el-form-item>
        </el-form>
      </el-card>
      <el-card class="cfg-card" shadow="never">
        <template #header><div class="section-title">RemoveBG 列表</div></template>
        <div class="list-actions"><el-button type="primary" @click="addRemoveItem">新增条目</el-button></div>
        <div v-for="(it,idx) in removeList" :key="idx" class="cfg-item">
          <el-input v-model="it.api_key" placeholder="API Key" />
          <el-input v-model="it.api_url" placeholder="API URL" />
          <el-input v-model="it.tag" placeholder="标记" />
          <el-button type="danger" @click="removeRemoveItem(idx)" link>移除</el-button>
        </div>
      </el-card>
      <el-card class="cfg-card" shadow="never">
        <template #header><div class="section-title">阿里云 列表</div></template>
        <div class="list-actions"><el-button type="primary" @click="addAliItem">新增条目</el-button></div>
        <div v-for="(it,idx) in aliyunList" :key="idx" class="cfg-item">
          <el-input v-model="it.api_key" placeholder="API Key" />
          <el-input v-model="it.base_url" placeholder="Base URL" />
          <el-input v-model="it.model" placeholder="模型" />
          <el-input v-model="it.tag" placeholder="标记" />
          <el-button type="danger" @click="removeAliItem(idx)" link>移除</el-button>
        </div>
      </el-card>
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
const loading = ref(false)
const saving = ref(false)
const form = ref({ remove_bg_api_key:'', remove_bg_api_url:'', aliyun_api_key:'', aliyun_base_url:'', aliyun_model:'' })
const removeList = ref([])
const aliyunList = ref([])

const fetchConfigs = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/api-configs')
    if (r.data?.success) {
      const d = r.data.data || {}
      const cfg = d.configs || {}
      form.value.remove_bg_api_url = (cfg.REMOVE_BG_API_URL||{}).value_masked ? '' : ''
      form.value.aliyun_base_url = (cfg.ALIYUN_BASE_URL||{}).value_masked ? '' : ''
      form.value.aliyun_model = (cfg.ALIYUN_MODEL||{}).value_masked ? '' : ''
      const lists = d.lists || {}
      removeList.value = (lists.remove_bg_list||[]).map(x => ({ api_key: x.api_key || '', api_url: x.api_url || '', tag: x.tag || '' }))
      aliyunList.value = (lists.aliyun_list||[]).map(x => ({ api_key: x.api_key || '', base_url: x.base_url || '', model: x.model || '', tag: x.tag || '' }))
    } else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}

const addRemoveItem = () => removeList.value.push({ api_key:'', api_url:'', tag:'' })
const removeRemoveItem = (idx) => removeList.value.splice(idx,1)
const addAliItem = () => aliyunList.value.push({ api_key:'', base_url:'', model:'', tag:'' })
const removeAliItem = (idx) => aliyunList.value.splice(idx,1)

const save = async () => {
  saving.value = true
  try {
    const payload = { ...form.value, remove_bg_list: removeList.value, aliyun_list: aliyunList.value }
    const r = await api.put('/admin/api-configs', payload)
    if (r.data?.success) ElMessage.success('配置已更新')
    else ElMessage.error(r.data?.message||'保存失败')
  } catch (_) { ElMessage.error('保存失败') } finally { saving.value = false }
}

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchConfigs() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.cfg-card { margin-bottom: 12px; }
.section-title { font-weight: 600; color: var(--text-primary); }
.cfg-item { display:flex; gap:8px; margin-bottom:8px; }
.list-actions { margin-bottom:8px; }
</style>
