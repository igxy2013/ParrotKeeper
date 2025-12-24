<template>
  <div class="settings-page">
    <div class="header">
      <h2>账号管理</h2>
    </div>

    <el-card class="section-card" shadow="never">
      <div class="profile-row">
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
    </el-card>

    <el-card class="section-card" shadow="never">
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
    </el-card>

    <UserProfileModal v-model="showProfile" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import UserProfileModal from '@/components/UserProfileModal.vue'

const authStore = useAuthStore()

const username = ref('')
const loading = ref(false)

const showProfile = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changing = ref(false)

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
  loading.value = true
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
    }
  } catch (_) {
  } finally {
    loading.value = false
  }
}

const openProfile = () => {
  showProfile.value = true
}

const onAvatarError = () => {
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

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-card {
  margin-bottom: 16px;
}
.profile-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.profile-label {
  color: #666;
}
.profile-value {
  font-weight: 500;
}
.profile-avatar {
  flex-shrink: 0;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: #e9eef3;
}
.profile-main {
  flex: 1;
}
.profile-name {
  font-size: 16px;
  font-weight: 600;
}
.profile-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #666;
}
.meta-label {
  color: #999;
}
.meta-value {
  color: #333;
}
.profile-actions {
  flex-shrink: 0;
}
.password-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.password-form {
  max-width: 420px;
}
</style>
