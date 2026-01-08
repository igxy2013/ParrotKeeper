<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>密码重置核验</h2>
      <div class="header-actions">
        <el-tag type="info">管理员或超级管理员可访问</el-tag>
      </div>
    </div>
    <div v-if="!isAdminOrSuper" class="no-access">仅管理员或超级管理员可访问该页面</div>
    <div v-else>
      <div class="toolbar">
        <el-input v-model="username" placeholder="输入账号用户名" style="width:240px" />
        <el-button type="primary" @click="fetchRequest" :loading="loading">查询</el-button>
      </div>
      <el-card shadow="never">
        <div class="result-row" v-if="request">
          <div class="result-col">
            <div class="label">用户名</div>
            <div class="value">{{ request.username }}</div>
          </div>
          <div class="result-col">
            <div class="label">验证码</div>
            <div class="value code">{{ request.code || '—' }}</div>
          </div>
          <div class="result-col">
            <div class="label">绑定手机号</div>
            <div class="value">{{ request.masked_phone || '未绑定' }}</div>
          </div>
          <div class="result-col">
            <div class="label">过期时间</div>
            <div class="value">{{ request.expire_at || '—' }}</div>
          </div>
          <div class="result-col">
            <div class="label">已使用</div>
            <div class="value">{{ request.used ? '是' : '否' }}</div>
          </div>
          <div class="actions">
            <el-button type="primary" link @click="copyCode" :disabled="!canCopy">复制验证码</el-button>
            <el-button link @click="refresh" :loading="loading">刷新</el-button>
          </div>
        </div>
        <div v-else class="empty">暂无重置请求</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isAdminOrSuper = computed(() => {
  const r = String((authStore.user || {}).role || 'user')
  return r === 'admin' || r === 'super_admin'
})

const username = ref('')
const loading = ref(false)
const request = ref(null)

const fetchRequest = async () => {
  if (!username.value) { ElMessage.warning('请输入用户名'); return }
  loading.value = true
  try {
    const res = await api.get('/admin/reset-requests', { params: { username: username.value } })
    if (res.data && res.data.success) {
      request.value = res.data.data?.request || null
      if (!request.value) ElMessage.info('暂无重置请求')
    } else {
      ElMessage.error(res.data?.message || '查询失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

const canCopy = computed(() => {
  if (!request.value || !request.value.code) return false
  if (request.value.used) return false
  try {
    if (!request.value.expire_at) return true
    const exp = new Date(request.value.expire_at)
    return exp.getTime() > Date.now()
  } catch (_) { return true }
})

const copyCode = async () => {
  if (!canCopy.value) { ElMessage.warning('验证码不可用'); return }
  try {
    const text = String(request.value.code || '')
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制验证码')
  } catch (_) {
    try {
      const ta = document.createElement('textarea')
      ta.value = String(request.value.code || '')
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ElMessage.success('已复制验证码')
    } catch (e) {
      ElMessage.error('复制失败')
    }
  }
}

const refresh = () => { fetchRequest() }
</script>

<style scoped>
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { display:flex; gap:12px; margin-bottom:12px; }
.result-row { display:flex; align-items:flex-end; gap:16px; }
.result-col { display:flex; flex-direction:column; gap:4px; }
.label { font-size:13px; color:#909399; }
.value { font-weight:600; color:#1f2937; }
.value.code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
.empty { color:#909399; padding:12px; }
</style>

