<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>备份与同步</h2>
      <div class="header-actions">
        <el-button type="primary" @click="triggerBackup" :loading="runningBackup">立即备份</el-button>
        <el-button @click="triggerSync" :loading="runningSync">立即同步</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card shadow="never" class="cfg-card">
        <template #header><div class="section-title">服务器配置</div></template>
        <el-form :model="form" label-width="180px">
          <el-form-item label="启用每日备份"><el-switch v-model="form.backup_enabled" /></el-form-item>
          <el-form-item label="启用增量同步"><el-switch v-model="form.sync_enabled" /></el-form-item>
          <el-form-item label="远程主机"><el-input v-model="form.remote_host" placeholder="aibim.xyz" /></el-form-item>
          <el-form-item label="远程端口"><el-input v-model.number="form.remote_port" placeholder="3306" /></el-form-item>
          <el-form-item label="远程用户"><el-input v-model="form.remote_user" /></el-form-item>
          <el-form-item label="远程密码"><el-input v-model="form.remote_password" type="password" placeholder="不展示原值，请重新填写以更新" /></el-form-item>
          <el-form-item label="目标库名"><el-input v-model="form.remote_db_name" /></el-form-item>
          <el-form-item label="备份库前缀"><el-input v-model="form.remote_db_prefix" placeholder="parrot_breeding_backup_" /></el-form-item>
          <el-form-item label="每日备份小时"><el-input v-model.number="form.backup_schedule_hour" placeholder="3" /></el-form-item>
          <el-form-item label="同步触发分钟"><el-input v-model.number="form.sync_schedule_minute" placeholder="0" /></el-form-item>
          <el-form-item label="保留天数"><el-input v-model.number="form.retention_days" placeholder="7" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
            <el-button @click="loadConfig">重新加载</el-button>
          </el-form-item>
        </el-form>
      </el-card>
      <el-card shadow="never" class="stat-card">
        <template #header><div class="section-title">当前状态</div></template>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="label">最近备份</div>
            <div class="value">{{ status.last_backup.time || '—' }}</div>
            <div class="desc">{{ status.last_backup.status || '—' }} • {{ status.last_backup.target_db || '' }}</div>
          </div>
          <div class="stat-item">
            <div class="label">最近同步</div>
            <div class="value">{{ status.last_sync.time || '—' }}</div>
            <div class="desc">{{ status.last_sync.status || '—' }}</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="never">
        <template #header><div class="section-title">操作日志</div></template>
        <el-table :data="logs" v-loading="loading" style="width: 100%">
          <el-table-column prop="op_type" label="类型" width="100" />
          <el-table-column prop="status" label="状态" width="110" />
          <el-table-column prop="target_db" label="目标库" width="220" />
          <el-table-column prop="message" label="信息" />
          <el-table-column prop="started_at" label="开始时间" width="180" />
          <el-table-column prop="finished_at" label="结束时间" width="180" />
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const loading = ref(false)
const runningBackup = ref(false)
const runningSync = ref(false)
const logs = ref([])
const status = ref({ last_backup: {}, last_sync: {}, last_sync_ts: null })
const form = ref({ backup_enabled: false, sync_enabled: false, remote_host:'', remote_port:3306, remote_user:'', remote_password:'', remote_db_name:'', remote_db_prefix:'', backup_schedule_hour:3, sync_schedule_minute:0, retention_days:7 })
const saving = ref(false)

const fetchStatus = async () => {
  try {
    const r = await api.get('/admin/backup/status')
    if (r.data?.success) status.value = r.data.data
  } catch (_) {}
}
const loadConfig = async () => {
  try {
    const r = await api.get('/admin/backup/config')
    if (r.data?.success) form.value = { ...form.value, ...r.data.data, remote_password: '' }
  } catch (_) {}
}
const saveConfig = async () => {
  saving.value = true
  try {
    const payload = { ...form.value }
    const r = await api.put('/admin/backup/config', payload)
    if (r.data?.success) ElMessage.success('配置已更新')
    else ElMessage.error(r.data?.message || '保存失败')
  } catch (_) { ElMessage.error('保存失败') } finally { saving.value = false }
}
const fetchLogs = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/backup/logs', { params: { limit: 100 } })
    if (r.data?.success) logs.value = r.data.data.logs || []
    else ElMessage.error(r.data?.message || '获取日志失败')
  } catch (_) { ElMessage.error('获取日志失败') } finally { loading.value = false }
}
const triggerBackup = async () => {
  runningBackup.value = true
  try {
    const r = await api.post('/admin/backup/run')
    if (r.data?.success) { ElMessage.success('已触发备份'); await fetchStatus(); await fetchLogs() }
    else ElMessage.error(r.data?.message || '触发失败')
  } catch (_) { ElMessage.error('触发失败') } finally { runningBackup.value = false }
}
const triggerSync = async () => {
  runningSync.value = true
  try {
    const r = await api.post('/admin/backup/sync')
    if (r.data?.success) { ElMessage.success('已触发同步'); await fetchStatus(); await fetchLogs() }
    else ElMessage.error(r.data?.message || '触发失败')
  } catch (_) { ElMessage.error('触发失败') } finally { runningSync.value = false }
}

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) { await loadConfig(); await fetchStatus(); await fetchLogs() } })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.cfg-card { margin-bottom: 12px; }
.stat-card { margin-bottom: 12px; }
.section-title { font-weight: 600; color: var(--text-primary); }
.stat-grid { display:flex; gap:12px; }
.stat-item { flex:1; }
.label { color:#909399; font-size:13px; }
.value { font-size:16px; font-weight:600; }
.desc { color:#606266; font-size:12px; }
</style>
