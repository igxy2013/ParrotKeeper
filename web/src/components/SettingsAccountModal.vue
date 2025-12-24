<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-card">
        <div class="modal-header-gradient">
          <div class="modal-header-row">
            <span class="modal-title">账号管理</span>
            <div class="modal-close-btn" @click="handleClose">
              <el-icon class="modal-close-icon"><Close /></el-icon>
            </div>
          </div>
        </div>

        <div class="modal-scroll">
          <div class="form-section">
            <div v-if="!isEditingProfile" class="profile-row">
              <div class="profile-avatar">
                <img :src="avatarSrc" class="avatar" @error="onAvatarError" />
              </div>
              <div class="profile-main">
                <div class="profile-name">{{ displayNickname }}</div>
                <div class="profile-meta">
                  <span class="meta-label">用户名：</span>
                  <span class="meta-value">{{ username || '未设置' }}</span>
                </div>
              </div>
              <div class="profile-actions">
                <el-button type="primary" @click="openProfile">编辑头像与昵称</el-button>
              </div>
            </div>

            <div v-else class="profile-edit">
              <div class="profile-body">
                <div class="avatar-section" @click="triggerUpload">
                  <div class="avatar-wrapper">
                    <img v-if="editForm.avatar_url" :src="editForm.avatar_url" class="avatar-img" @error="onAvatarErrorEdit" />
                    <div v-else class="upload-area">
                      <el-icon class="upload-icon"><UserFilled /></el-icon>
                      <span class="upload-text">点击上传头像</span>
                    </div>
                  </div>
                  <div class="photo-tip">点击图片更换</div>
                </div>
                <div class="form-section">
                  <el-form :model="editForm" label-width="90px">
                    <el-form-item label="昵称">
                      <el-input v-model="editForm.nickname" maxlength="20" placeholder="请输入昵称" />
                    </el-form-item>
                    <div class="footer-actions">
                      <el-button @click="cancelProfileEdit">取消</el-button>
                      <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
                    </div>
                  </el-form>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileChange" />
            </div>

            <div class="password-title">修改密码</div>
            <el-form label-width="90px" class="password-form">
              <el-form-item label="当前密码">
                <el-input v-model="currentPassword" type="password" placeholder="请输入当前密码" />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="newPassword" type="password" placeholder="至少6位" />
              </el-form-item>
              <el-form-item label="确认密码">
                <el-input v-model="confirmPassword" type="password" placeholder="再次输入新密码" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="changing" @click="changePassword">修改密码</el-button>
              </el-form-item>
            </el-form>

          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
  
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, UserFilled } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => { emit('update:modelValue', v) })

const authStore = useAuthStore()

const username = ref('')
const isEditingProfile = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changing = ref(false)
const saving = ref(false)
const fileInput = ref(null)

const editForm = ref({ nickname: '', avatar_url: '' })

const avatarSrc = computed(() => {
  const u = authStore.user || {}
  const url = u.avatar_url
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
})

const displayNickname = computed(() => {
  const u = authStore.user || {}
  return u.nickname || '未命名用户'
})

const fetchProfile = async () => {
  try {
    const res = await api.get('/auth/profile')
    const ok = res.data && res.data.success
    if (ok && res.data.data) {
      username.value = res.data.data.username || ''
      const u = res.data.data
      authStore.user = u
      if (u && u.id) {
        authStore.userId = u.id
        localStorage.setItem('user', JSON.stringify(u))
        localStorage.setItem('user_id', u.id)
      }
      editForm.value.nickname = u.nickname || ''
      editForm.value.avatar_url = resolveAvatar(u.avatar_url)
    }
  } catch (_) {
  }
}

const resolveAvatar = (url) => {
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
}

const openProfile = () => { isEditingProfile.value = true }
const cancelProfileEdit = () => { isEditingProfile.value = false }
const onAvatarError = () => {}
const onAvatarErrorEdit = () => { editForm.value.avatar_url = '/profile.png' }

const triggerUpload = () => { if (fileInput.value) fileInput.value.click() }
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
      editForm.value.avatar_url = '/uploads/' + data.data.url
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

const saveProfile = async () => {
  if (!editForm.value.nickname) {
    ElMessage.warning('请输入昵称')
    return
  }
  try {
    saving.value = true
    const payload = { nickname: editForm.value.nickname, avatar_url: editForm.value.avatar_url }
    const res = await api.put('/auth/profile', payload)
    if (res.data && res.data.success) {
      const userData = res.data.data
      authStore.user = userData
      localStorage.setItem('user', JSON.stringify(userData))
      ElMessage.success('保存成功')
      isEditingProfile.value = false
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (newPassword.value.length < 6) {
    ElMessage.warning('新密码至少6位')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  changing.value = true
  try {
    const res = await api.put('/auth/change-password', {
      old_password: currentPassword.value,
      new_password: newPassword.value
    })
    const ok = res.data && (res.data.success || res.status === 200)
    if (ok) {
      ElMessage.success('密码修改成功')
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } else {
      ElMessage.error((res.data && res.data.message) || '修改失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '修改失败')
  } finally {
    changing.value = false
  }
}

const handleClose = () => { visible.value = false }

onMounted(() => { fetchProfile() })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.modal-header-gradient {
  background: linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%);
  padding: 16px 20px;
  flex-shrink: 0;
}
.modal-header-row { display: flex; align-items: center; justify-content: space-between; }
.modal-title { color: #ffffff; font-size: 18px; font-weight: bold; }
.modal-close-btn { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.modal-close-btn:hover { background: rgba(255,255,255,0.3); }
.modal-close-icon { color: #ffffff; font-size: 16px; }

.modal-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.form-section { padding: 24px; }

.profile-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.profile-avatar { flex-shrink: 0; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; background: #e9eef3; }
.profile-main { flex: 1; }
.profile-name { font-size: 16px; font-weight: 600; }
.profile-meta { margin-top: 4px; font-size: 13px; color: #666; }
.meta-label { color: #999; }
.meta-value { color: #333; }
.profile-actions { flex-shrink: 0; }

.profile-body { display: flex; gap: 20px; }
.avatar-section { width: 200px; display: flex; flex-direction: column; align-items: center; }
.avatar-wrapper { width: 160px; height: 160px; border-radius: 12px; background: #f5f7fa; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: inset 0 0 0 1px #ebeef5; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; }
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-text { font-size: 13px; }
.photo-tip { margin-top: 8px; font-size: 12px; color: #909399; }
.footer-actions { display: flex; justify-content: flex-end; gap: 12px; }
.hidden-input { display: none; }

.password-title { font-weight: 600; margin: 12px 0; }
.password-form { max-width: 420px; }

.modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 12px; background: #ffffff; }
.btn-secondary { padding: 8px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; font-size: 14px; cursor: pointer; }
.btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; }

@media (max-width: 768px) {
  .modal-card { width: 100%; height: 100%; max-width: 100%; max-height: 100%; border-radius: 0; }
}
</style>

