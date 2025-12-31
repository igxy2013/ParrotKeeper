<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <img src="/logo.png" alt="Logo" class="logo-img" />
          <h2>鹦鹉管家</h2>
        </div>
      </template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" label-width="0">
            <el-form-item>
              <el-input v-model="loginForm.username" placeholder="用户名" :prefix-icon="User" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-button type="primary" :loading="loading" class="w-100" @click="handleLogin">登录</el-button>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" label-width="0">
            <el-form-item>
              <el-input v-model="registerForm.username" placeholder="用户名" :prefix-icon="User" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.confirm_password" type="password" placeholder="确认密码" :prefix-icon="Lock" show-password />
            </el-form-item>
             <el-form-item>
              <el-input v-model="registerForm.nickname" placeholder="昵称" :prefix-icon="UserFilled" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.invitation_code" placeholder="邀请码（必填）" />
            </el-form-item>
            <el-button type="primary" :loading="loading" class="w-100" @click="handleRegister">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api/axios'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const activeTab = ref('login')
const loading = ref(false)

onMounted(() => {
  if (route.query.tab === 'register') {
    activeTab.value = 'register'
  }
})

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  nickname: '',
  confirm_password: '',
  invitation_code: ''
})

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  if (!registerForm.confirm_password) {
    ElMessage.warning('请再次输入密码')
    return
  }
  if (registerForm.password !== registerForm.confirm_password) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (!registerForm.invitation_code) {
    ElMessage.warning('请输入邀请码')
    return
  }
  loading.value = true
  try {
    const response = await api.post('/auth/register', registerForm)
    if (response.data.success) {
      ElMessage.success('注册成功，请登录')
      activeTab.value = 'login'
      loginForm.username = registerForm.username
      loginForm.password = registerForm.password
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8f9fa;
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.08), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(0, 188, 212, 0.08), transparent 25%);
}

.login-card {
  width: 420px;
  border-radius: 20px;
  border: none;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.card-header {
  text-align: center;
  padding: 10px 0;
}

.card-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.logo-img {
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

.w-100 {
  width: 100%;
  padding: 20px 0;
  font-size: 15px;
  font-weight: 600;
  margin-top: 16px;
  border-radius: 12px;
  height: 44px;
}

/* 覆盖 Element Plus 样式 */
:deep(.el-card__header) {
  border-bottom: none;
  padding-bottom: 0;
}

:deep(.el-card__body) {
  padding: 30px 40px 40px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #e5e7eb inset;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: #f9fafb;
  transition: all 0.2s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #d1d5db inset;
  background-color: #fff;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--primary-color) inset !important;
  background-color: #fff;
}

:deep(.el-input__inner) {
  height: 24px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f3f4f6;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
  height: 3px;
  border-radius: 3px;
}

:deep(.el-button--primary) {
  --el-button-bg-color: var(--primary-gradient);
  --el-button-border-color: transparent;
  --el-button-hover-bg-color: var(--primary-gradient);
  --el-button-hover-border-color: transparent;
  background: var(--primary-gradient);
  border: none;
  transition: opacity 0.2s, transform 0.2s;
}

:deep(.el-button--primary:hover) {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
