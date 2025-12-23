<template>
  <div class="settings-container">
    <div class="user-card">
      <div class="user-left" @click="openProfile">
        <img :src="avatarSrc" class="user-avatar" @error="onAvatarError" />
        <div class="user-main">
          <div class="user-name-row">
            <span class="user-name">{{ authStore.user?.nickname || '未命名用户' }}</span>
            <el-tag size="small" :type="roleTagType">{{ roleLabel }}</el-tag>
          </div>
          <div class="user-meta">
            <span>加入时间：{{ joinDate }}</span>
            <span class="divider">|</span>
            <span>积分：{{ points }}</span>
            <span class="divider">|</span>
            <span>当前模式：{{ modeDisplay }}</span>
          </div>
        </div>
      </div>
      <div class="user-actions">
        <el-button class="edit-btn" @click="openProfile">编辑资料</el-button>
      </div>
      <UserProfileModal v-model="showProfile" />
    </div>

    <h2>个人中心</h2>
    <div class="settings-content">
      <el-form label-width="120px">
        <el-form-item label="当前模式">
          <el-radio-group v-model="mode">
            <el-radio-button label="personal">个人模式</el-radio-button>
            <el-radio-button label="team">团队模式</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <div class="mode-description">
          <p v-if="mode === 'personal'">当前处于<strong>个人模式</strong>。您将看到您个人的鹦鹉数据和记录。</p>
          <p v-else>当前处于<strong>团队模式</strong>。您将看到团队共享的鹦鹉数据和记录。</p>
        </div>

        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving">保存并应用</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import UserProfileModal from '@/components/UserProfileModal.vue'

const authStore = useAuthStore()
const showProfile = ref(false)
const mode = ref('personal')
const saving = ref(false)

onMounted(async () => {
  const savedMode = localStorage.getItem('user_mode')
  if (savedMode && ['personal', 'team'].includes(savedMode)) mode.value = savedMode
  await (authStore.refreshProfile && authStore.refreshProfile())
})

const saveSettings = () => {
  saving.value = true
  try {
    localStorage.setItem('user_mode', mode.value)
    ElMessage.success('设置已保存，正在切换模式...')
    setTimeout(() => { window.location.reload() }, 1000)
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const avatarSrc = computed(() => {
  const u = authStore.user || {}
  const url = u.avatar_url
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
})
const onAvatarError = () => {}
const openProfile = () => { showProfile.value = true }

const roleLabel = computed(() => {
  const r = String((authStore.user || {}).role || 'user')
  if (r === 'super_admin') return '超级管理员'
  if (r === 'admin') return '管理员'
  return '普通用户'
})
const roleTagType = computed(() => {
  const r = String((authStore.user || {}).role || 'user')
  if (r === 'super_admin') return 'danger'
  if (r === 'admin') return 'warning'
  return 'info'
})
const joinDate = computed(() => {
  const d = (authStore.user || {}).created_at
  if (!d) return '未知'
  try { return new Date(d).toLocaleDateString('zh-CN') } catch (_) { return '未知' }
})
const points = computed(() => {
  const p = (authStore.user || {}).points
  return typeof p === 'number' ? p : 0
})
const modeDisplay = computed(() => mode.value === 'team' ? '团队模式' : '个人模式')
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  min-height: 400px;
}
.user-card { display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; padding: 16px; border-radius: 10px; margin-bottom: 16px; }
.user-left { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.user-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #e9eef3; }
.user-main { display: flex; flex-direction: column; }
.user-name-row { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 16px; font-weight: 600; }
.user-meta { display: flex; gap: 8px; color: #666; font-size: 13px; margin-top: 4px; }
.divider { color: #dcdfe6; }
.user-actions { display: flex; align-items: center; }
.edit-btn { background: linear-gradient(135deg, #4CAF50, #26A69A); color: #ffffff; border: none; }
.edit-btn:hover { box-shadow: 0 4px 12px rgba(38, 166, 154, 0.3); }
.settings-content {
  margin-top: 24px;
  max-width: 600px;
}
.mode-description {
  margin-left: 120px;
  margin-bottom: 24px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
</style>
