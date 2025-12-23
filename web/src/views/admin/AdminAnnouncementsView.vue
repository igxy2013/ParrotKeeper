<template>
  <div class="admin-page">
    <div class="header">
      <div class="header-left">
        <el-button link @click="goBack">返回</el-button>
        <h2>系统公告发布</h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新建公告</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-table :data="items" v-loading="loading" style="width:100%">
        <el-table-column prop="title" label="标题" width="240" />
        <el-table-column prop="content" label="内容" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="scheduled_at" label="发布时间" width="180" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button link type="success" @click="openEdit(scope.row)" :disabled="scope.row.status==='published'">编辑</el-button>
            <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="showDialog" :title="editing?'编辑公告':'新建公告'" width="640px">
        <el-form :model="form" label-width="120px">
          <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="内容"><el-input type="textarea" v-model="form.content" :rows="6" /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="定时发布" value="scheduled" />
            </el-select>
          </el-form-item>
          <el-form-item label="发布时间" v-if="form.status==='scheduled'">
            <el-date-picker v-model="form.scheduled_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选择发布时间" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showDialog=false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const items = ref([])
const loading = ref(false)
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ id:null, title:'', content:'', status:'draft', scheduled_at:'' })

const fetchList = async () => {
  loading.value = true
  try { const r = await api.get('/admin/announcements'); if (r.data?.success) items.value = (r.data.data?.announcements)||[]; else ElMessage.error(r.data?.message||'加载失败') } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const openCreate = () => { editing.value=false; form.value={ id:null, title:'', content:'', status:'draft', scheduled_at:'' }; showDialog.value=true }
const openEdit = (row) => { editing.value=true; form.value={ ...row }; showDialog.value=true }
const save = async () => {
  try {
    const payload = { ...form.value }
    if (editing.value) {
      const r = await api.put(`/admin/announcements/${payload.id}`, payload)
      if (r.data?.success) { ElMessage.success('更新成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'更新失败')
    } else {
      const r = await api.post('/admin/announcements', payload)
      if (r.data?.success) { ElMessage.success('创建成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'创建失败')
    }
  } catch (_) { ElMessage.error('保存失败') }
}
const remove = async (id) => { try { await ElMessageBox.confirm('确认删除该公告？', '提示', { type:'warning' }); const r = await api.delete(`/admin/announcements/${id}`); if (r.data?.success) { ElMessage.success('已删除'); fetchList() } else ElMessage.error(r.data?.message||'删除失败') } catch (_) {} }

const goBack = () => { router.push('/admin') }

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
</style>
