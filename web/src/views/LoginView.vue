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
              <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password />
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
              <el-input v-model="registerForm.nickname" placeholder="昵称" :prefix-icon="UserFilled" />
            </el-form-item>
            <el-button type="success" :loading="loading" class="w-100" @click="handleRegister">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api/axios'

const authStore = useAuthStore()
const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  nickname: ''
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
  background: var(--primary-gradient);
}
.login-card {
  width: 400px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.card-header {
  text-align: center;
}
.card-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: 24px;
}
.logo-img {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}
.w-100 {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  margin-top: 10px;
}
:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
}
:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}
</style>
