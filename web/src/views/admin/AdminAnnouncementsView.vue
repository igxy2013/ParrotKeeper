<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>系统公告发布</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新建公告</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-table :data="items" v-loading="loading" style="width:100%">
        <el-table-column prop="title" label="标题" width="240" />
        <el-table-column label="图片" width="100">
          <template #default="scope">
            <el-image 
              v-if="scope.row.image_url" 
              style="width: 50px; height: 50px" 
              :src="resolveUrl(scope.row.image_url)" 
              :preview-src-list="[resolveUrl(scope.row.image_url)]" 
              fit="cover"
              preview-teleported
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" />
        <el-table-column label="状态" width="120">
          <template #default="scope">{{ statusLabel(scope.row.status) }}</template>
        </el-table-column>
        <el-table-column prop="scheduled_at" label="发布时间" width="180" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="primary" size="small" @click="useTemplate(scope.row)">模板发布</el-button>
            <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="showDialog" :title="editing?'编辑公告':'新建公告'" width="640px">
        <el-form :model="form" label-width="120px">
          <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="内容"><el-input type="textarea" v-model="form.content" :rows="6" /></el-form-item>
          <el-form-item label="配图（可选）">
            <el-upload
              class="avatar-uploader"
              :file-list="uploadList"
              list-type="picture-card"
              :http-request="uploadRequest"
              :limit="9"
              multiple
              accept="image/*"
              :on-remove="handleRemove"
              :on-exceed="onExceed"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="remove-image" v-if="uploadList.length" @click="clearImages">清空图片</div>
          </el-form-item>
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { Plus } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const { user } = storeToRefs(authStore)
const isSuperAdmin = computed(() => String(((user.value || {}).role || 'user')) === 'super_admin')
const items = ref([])
const loading = ref(false)
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ id:null, title:'', content:'', status:'draft', scheduled_at:'' })
const uploadList = ref([])
const uploading = ref(false)

const resolveUrl = (url) => {
  if (!url) return ''
  const s = String(url).replace(/\\/g, '/').trim()
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  if (s.includes('/uploads/')) {
    const suffix = s.split('/uploads/')[1] || ''
    return '/uploads/' + suffix.replace(/^images\//, '')
  }
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '').replace(/^images\//, '')
}

const statusLabel = (s) => (s==='published' ? '已发布' : (s==='scheduled' ? '定时发布' : (s==='draft' ? '草稿' : String(s||''))))

const formatNowIso = () => {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0'+n : ''+n)
  const Y = d.getFullYear()
  const M = pad(d.getMonth()+1)
  const D = pad(d.getDate())
  const h = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${Y}-${M}-${D}T${h}:${m}:${s}`
}

watch(() => form.value.status, (val) => {
  if (val === 'scheduled' && !form.value.scheduled_at) {
    form.value.scheduled_at = formatNowIso()
  }
})

const uploadRequest = async (option) => {
  const file = option.file
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', 'announcements')
  uploading.value = true
  try {
    const r = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const data = r.data?.data
    if (r.data?.success && data?.url) {
      const raw = String(data.url)
      const preview = resolveUrl(raw)
      uploadList.value.push({ name: file.name, url: preview })
      const raws = Array.isArray(form.value.image_urls) ? [...form.value.image_urls] : []
      raws.push(raw)
      form.value.image_urls = raws
      if (!form.value.image_url) form.value.image_url = raw
      option.onSuccess && option.onSuccess(data)
    } else {
      ElMessage.error(r.data?.message || '上传失败')
      option.onError && option.onError(new Error('upload failed'))
    }
  } catch (e) {
    ElMessage.error('上传失败')
    option.onError && option.onError(e)
  } finally {
    uploading.value = false
  }
}

const handleRemove = (file, fileList) => {
  uploadList.value = fileList
  const previewUrl = file.url
  const idx = (form.value.image_urls || []).findIndex(u => resolveUrl(u) === previewUrl)
  if (idx >= 0) {
    const arr = [...form.value.image_urls]
    arr.splice(idx, 1)
    form.value.image_urls = arr
  }
  if (form.value.image_url && resolveUrl(form.value.image_url) === previewUrl) {
    form.value.image_url = (form.value.image_urls || [])[0] || ''
  }
}

const onExceed = () => ElMessage.warning('最多上传9张图片')
const clearImages = () => { uploadList.value = []; form.value.image_urls = []; form.value.image_url = '' }

const fetchList = async () => {
  loading.value = true
  try { const r = await api.get('/admin/announcements'); if (r.data?.success) items.value = (r.data.data?.announcements)||[]; else ElMessage.error(r.data?.message||'加载失败') } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const openCreate = () => { editing.value=false; form.value={ id:null, title:'', content:'', status:'draft', scheduled_at:'', image_url:'', image_urls:[] }; uploadList.value=[]; showDialog.value=true }
const useTemplate = (row) => { editing.value=false; form.value={ id:null, title:row.title||'', content:row.content||'', status:'published', scheduled_at:'', image_url:(row.image_urls&&row.image_urls[0])||row.image_url||'', image_urls:row.image_urls||[] }; uploadList.value=(Array.isArray(row.image_urls)?row.image_urls:[]).map(u=>({ name:'image', url: resolveUrl(u) })); showDialog.value=true }
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

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}
.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}
.avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
}
.remove-image {
  margin-top: 8px;
  color: var(--el-color-danger);
  cursor: pointer;
  font-size: 12px;
}
</style>
