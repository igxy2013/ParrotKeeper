<template>
  <div class="admin-page">
    <div class="header">
      <h2>反馈管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="markAllRead" :loading="marking">标记全部已读</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-table :data="feedbacks" v-loading="loading" style="width: 100%">
        <el-table-column prop="user_nickname" label="用户" width="160" />
        <el-table-column prop="content" label="反馈内容" />
        <el-table-column prop="contact" label="联系方式" width="180" />
        <el-table-column label="图片" width="220">
          <template #default="scope">
            <div class="image-list">
              <img v-for="(url,idx) in (scope.row.image_urls || [])" :key="idx" :src="url" class="img" @click="preview(url)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="danger" link @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const feedbacks = ref([])
const loading = ref(false)
const marking = ref(false)
const showViewer = ref(false)
const viewerUrl = ref('')

const preview = (url) => { viewerUrl.value = url; showViewer.value = true }

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.get('/feedback')
    if (res.data && res.data.success) feedbacks.value = res.data.data || []
    else ElMessage.error(res.data?.message || '加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}

const remove = async (id) => {
  try {
    await ElMessageBox.confirm('确认删除该反馈？', '提示', { type: 'warning' })
    const res = await api.delete(`/feedback/${id}`)
    if (res.data && res.data.success) { ElMessage.success('删除成功'); fetchList() }
    else ElMessage.error(res.data?.message || '删除失败')
  } catch (_) {}
}

const markAllRead = async () => {
  marking.value = true
  try {
    const res = await api.put('/admin/feedbacks/read-all')
    if (res.data && res.data.success) { ElMessage.success('已标记全部已读'); fetchList() }
    else ElMessage.error(res.data?.message || '操作失败')
  } catch (_) { ElMessage.error('操作失败') } finally { marking.value = false }
}

onMounted(async () => {
  await (authStore.refreshProfile && authStore.refreshProfile())
  if (isSuperAdmin.value) fetchList()
})
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.image-list { display: flex; gap: 6px; flex-wrap: wrap; }
.img { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; cursor: pointer; }
</style>
