<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>API配置管理</h2>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card class="cfg-card" shadow="never">
        <template #header><div class="section-title">移除背景 API（remove.bg）</div></template>
        <div v-for="(it,idx) in removeList" :key="idx" class="api-item">
          <div class="api-item-info">
            <span class="badge">{{ it.tag || '未标记' }}</span>
            <span class="api-key-mask">{{ it.api_key_masked || '未设置' }}</span>
            <span class="quota">剩余额度 {{ it.remaining_quota || 50 }}/50</span>
          </div>
          <div class="api-item-actions">
            <el-button size="small" :type="it.is_top ? 'primary' : 'default'" @click="toggleTop('remove', idx)">{{ it.is_top ? '置顶' : '设为置顶' }}</el-button>
            <el-button size="small" @click="openEditModal('remove', idx)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteItem('remove', idx)">删除</el-button>
          </div>
        </div>
        <div class="list-actions"><el-button type="primary" @click="openAddModal('remove')">添加API</el-button></div>
      </el-card>

      <el-card class="cfg-card" shadow="never">
        <template #header><div class="section-title">阿里云通义大模型</div></template>
        <div v-for="(it,idx) in aliyunList" :key="idx" class="api-item">
          <div class="api-item-info">
            <span class="badge">{{ it.tag || '未标记' }}</span>
            <span class="api-key-mask">{{ it.api_key_masked || '未设置' }}</span>
            <span class="quota">{{ it.model || it.base_url ? (it.model || it.base_url) : '' }}</span>
          </div>
          <div class="api-item-actions">
            <el-button size="small" :type="it.is_top ? 'primary' : 'default'" @click="toggleTop('aliyun', idx)">{{ it.is_top ? '置顶' : '设为置顶' }}</el-button>
            <el-button size="small" @click="openEditModal('aliyun', idx)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteItem('aliyun', idx)">删除</el-button>
          </div>
        </div>
        <div class="list-actions"><el-button type="primary" @click="openAddModal('aliyun')">添加API</el-button></div>
      </el-card>

      <el-dialog v-model="showAddModal" :title="currentGroup==='remove'?'添加移除背景API':'添加阿里云API'" width="520px">
        <div class="form-grid">
          <el-form :model="addForm" label-width="120px">
            <el-form-item label="API标签"><el-input v-model="addForm.tag" placeholder="用于标记不同API" /></el-form-item>
            <el-form-item label="API Key"><el-input v-model="addForm.api_key" placeholder="示例：sk_xxx" /></el-form-item>
            <template v-if="currentGroup==='remove'">
              <el-form-item label="API URL"><el-input v-model="addForm.api_url" placeholder="https://api.remove.bg/v1.0/removebg" /></el-form-item>
            </template>
            <template v-else>
              <el-form-item label="Base URL"><el-input v-model="addForm.base_url" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" /></el-form-item>
              <el-form-item label="Model">
                <el-select v-model="addForm.model" placeholder="请选择模型">
                  <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </template>
          </el-form>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showAddModal=false">取消</el-button>
            <el-button type="primary" @click="submitAdd">{{ editingIndex!==null ? '保存' : '添加' }}</el-button>
          </span>
        </template>
      </el-dialog>
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
const removeList = ref([])
const aliyunList = ref([])
const showAddModal = ref(false)
const currentGroup = ref('remove')
const addForm = ref({ tag: '', api_key: '', api_url: '', base_url: '', model: '' })
const editingIndex = ref(null)
const modelOptions = ref(['qwen3-coder-plus','qwen-flash','deepseek-v3.2','qwen3-omni-flash-2025-12-01'])

const fetchConfigs = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/api-configs')
    if (r.data?.success) {
      const d = r.data.data || {}
      const lists = d.lists || {}
      removeList.value = (lists.remove_bg_list||[]).map(x => ({ tag: x.tag || '', api_key: x.api_key || '', api_key_masked: x.api_key_masked || '', api_url: x.api_url || '', remaining_quota: typeof x.remaining_quota==='number' ? x.remaining_quota : 50, is_top: x.is_top || false }))
      aliyunList.value = (lists.aliyun_list||[]).map(x => ({ tag: x.tag || '', api_key: x.api_key || '', api_key_masked: x.api_key_masked || '', base_url: x.base_url || '', model: x.model || '', is_top: x.is_top || false }))
      removeList.value.sort((a,b) => (b.is_top?1:0)-(a.is_top?1:0))
      aliyunList.value.sort((a,b) => (b.is_top?1:0)-(a.is_top?1:0))
    } else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}

const openAddModal = (group) => {
  currentGroup.value = group
  addForm.value = group==='remove' ? { tag:'', api_key:'', api_url:'https://api.remove.bg/v1.0/removebg', base_url:'', model:'' } : { tag:'', api_key:'', api_url:'', base_url:'https://dashscope.aliyuncs.com/compatible-mode/v1', model:'' }
  editingIndex.value = null
  showAddModal.value = true
}
const openEditModal = (group, index) => {
  currentGroup.value = group
  editingIndex.value = index
  if (group==='remove') {
    const item = removeList.value[index]
    addForm.value = { tag: item.tag || '', api_key: item.api_key || '', api_url: item.api_url || '', base_url:'', model:'' }
  } else {
    const item = aliyunList.value[index]
    addForm.value = { tag: item.tag || '', api_key: item.api_key || '', api_url:'', base_url: item.base_url || '', model: item.model || '' }
  }
  showAddModal.value = true
}
const deleteItem = async (group, index) => {
  if (group==='remove') {
    const list = removeList.value.slice()
    list.splice(index,1)
    await saveLists(list, aliyunList.value)
  } else {
    const list = aliyunList.value.slice()
    list.splice(index,1)
    await saveLists(removeList.value, list)
  }
  fetchConfigs()
}
const submitAdd = async () => {
  const g = currentGroup.value
  const f = addForm.value
  const idx = editingIndex.value
  if (g==='remove') {
    if (!String(f.api_key||'').trim() || !String(f.api_url||'').trim()) { ElMessage.warning('请填写API Key与URL'); return }
    const list = removeList.value.slice()
    const item = { tag:String(f.tag||'').trim(), api_key:String(f.api_key||'').trim(), api_url:String(f.api_url||'').trim(), is_top: (list[idx]?.is_top)||false }
    if (idx!==null && list[idx]) list[idx] = item; else list.push(item)
    await saveLists(list, aliyunList.value)
  } else {
    if (!String(f.api_key||'').trim() || (!String(f.base_url||'').trim() && !String(f.model||'').trim())) { ElMessage.warning('请填写API Key与Base URL或Model'); return }
    const list = aliyunList.value.slice()
    const item = { tag:String(f.tag||'').trim(), api_key:String(f.api_key||'').trim(), base_url:String(f.base_url||'').trim(), model:String(f.model||'').trim(), is_top: (list[idx]?.is_top)||false }
    if (idx!==null && list[idx]) list[idx] = item; else list.push(item)
    await saveLists(removeList.value, list)
  }
  showAddModal.value = false
  editingIndex.value = null
  fetchConfigs()
}
const toggleTop = async (group, index) => {
  let remove = removeList.value.slice()
  let aliyun = aliyunList.value.slice()
  if (group==='remove') {
    const item = remove[index]
    item.is_top = !item.is_top
    if (item.is_top) remove.forEach((it,idx)=>{ if(idx!==index) it.is_top=false })
    remove.sort((a,b)=>(b.is_top?1:0)-(a.is_top?1:0))
  } else {
    const item = aliyun[index]
    item.is_top = !item.is_top
    if (item.is_top) aliyun.forEach((it,idx)=>{ if(idx!==index) it.is_top=false })
    aliyun.sort((a,b)=>(b.is_top?1:0)-(a.is_top?1:0))
  }
  removeList.value = remove
  aliyunList.value = aliyun
  await saveLists(remove, aliyun)
  fetchConfigs()
}
const saveLists = async (remove, aliyun) => {
  try {
    const payload = {
      remove_bg_list: (remove||[]).map(it => ({ tag: it.tag||'', api_key: it.api_key||'', api_url: it.api_url||'', is_top: it.is_top||false })),
      aliyun_list: (aliyun||[]).map(it => ({ tag: it.tag||'', api_key: it.api_key||'', base_url: it.base_url||'', model: it.model||'', is_top: it.is_top||false }))
    }
    const r = await api.put('/admin/api-configs', payload)
    if (r.data?.success) ElMessage.success('操作成功')
    else ElMessage.error(r.data?.message||'保存失败')
  } catch (_) { ElMessage.error('保存失败') }
}

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
.api-item { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-top:1px solid #f0f0f0; }
.api-item:first-child { border-top:none; }
.api-item-info { display:flex; align-items:center; gap:12px; }
.badge { background:#eef2ff; color:#6366f1; padding:2px 8px; border-radius:10px; font-size:12px; }
.api-key-mask { color:#606266; }
.quota { color:#909399; font-size:12px; }
.api-item-actions { display:flex; align-items:center; gap:8px; }
.list-actions { margin-top:8px; }
.form-grid { padding-top:8px; }
</style>
