<template>
  <el-dialog v-model="visible" width="520px" :close-on-click-modal="false" :show-close="true" custom-class="profile-dialog">
    <template #header>
      <div class="dialog-title">编辑个人资料</div>
    </template>
    <div class="profile-body">
      <div class="avatar-section" @click="triggerUpload">
        <div class="avatar-wrapper">
          <img v-if="form.avatar_url" :src="form.avatar_url" class="avatar-img" @error="onAvatarError" />
          <div v-else class="upload-area">
            <el-icon class="upload-icon"><UserFilled /></el-icon>
            <span class="upload-text">点击上传头像</span>
          </div>
        </div>
        <div class="photo-tip">点击图片更换</div>
      </div>
      <div class="form-section">
        <el-form :model="form" label-width="90px">
          <el-form-item label="昵称">
            <el-input v-model="form.nickname" maxlength="20" placeholder="请输入昵称" />
          </el-form-item>
        </el-form>
      </div>
    </div>
    <template #footer>
      <div class="footer-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </template>
    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileChange" />
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => { emit('update:modelValue', v) })

const authStore = useAuthStore()
const saving = ref(false)
const fileInput = ref(null)

const form = ref({
  nickname: '',
  avatar_url: ''
})

onMounted(() => {
  const u = authStore.user || {}
  form.value.nickname = u.nickname || ''
  form.value.avatar_url = resolveAvatar(u.avatar_url)
})

const resolveAvatar = (url) => {
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
}

const triggerUpload = () => {
  if (fileInput.value) fileInput.value.click()
}

const onAvatarError = () => {
  form.value.avatar_url = '/profile.png'
}

const handleFileChange = async (e) => {
  const files = e.target.files
  if (!files || !files[0]) return
  const file = files[0]
  try {
    saving.value = true
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', 'avatars')
    const headers = {
      'X-OpenID': 'account_' + (localStorage.getItem('user_id') || ''),
      'X-User-Mode': localStorage.getItem('user_mode') || 'personal'
    }
    const res = await fetch('/api/upload/image', { method: 'POST', body: fd, headers })
    const data = await res.json()
    if (data && data.success && data.data && data.data.url) {
      form.value.avatar_url = '/uploads/' + data.data.url
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error((data && data.message) || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  } finally {
    saving.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleCancel = () => {
  visible.value = false
}

const handleSave = async () => {
  if (!form.value.nickname) {
    ElMessage.warning('请输入昵称')
    return
  }
  try {
    saving.value = true
    const payload = {
      nickname: form.value.nickname,
      avatar_url: form.value.avatar_url
    }
    const res = await api.put('/auth/profile', payload)
    if (res.data && res.data.success) {
      const userData = res.data.data
      authStore.user = userData
      localStorage.setItem('user', JSON.stringify(userData))
      ElMessage.success('保存成功')
      visible.value = false
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-dialog :deep(.el-dialog__header) { margin: 0; padding: 16px 20px; }
.dialog-title { font-size: 16px; font-weight: 600; }
.profile-body { display: flex; gap: 20px; }
.avatar-section { width: 200px; display: flex; flex-direction: column; align-items: center; }
.avatar-wrapper { width: 160px; height: 160px; border-radius: 12px; background: #f5f7fa; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: inset 0 0 0 1px #ebeef5; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; }
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-text { font-size: 13px; }
.photo-tip { margin-top: 8px; font-size: 12px; color: #909399; }
.form-section { flex: 1; }
.footer-actions { display: flex; justify-content: flex-end; gap: 12px; }
.hidden-input { display: none; }
</style>
