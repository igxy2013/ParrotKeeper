<template>
  <el-container class="layout-container">
    <el-aside width="240px">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
      >
        <div class="logo">
          <img src="/logo.png" alt="Logo" class="logo-img" />
          <span>鹦鹉管家</span>
        </div>
        <el-menu-item index="/">
          <img src="/home.png" class="menu-icon" />
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/parrots">
          <img src="/parrot.png" class="menu-icon" />
          <span>我的鹦鹉</span>
        </el-menu-item>
        <el-menu-item index="/records">
          <img src="/chart.png" class="menu-icon" />
          <span>记录</span>
        </el-menu-item>
        <el-menu-item index="/care-guide">
          <el-icon class="menu-icon-el"><Notebook /></el-icon>
          <span>护理指南</span>
        </el-menu-item>
        <el-menu-item index="/incubation">
          <el-icon class="menu-icon-el"><Sunny /></el-icon>
          <span>人工孵化</span>
        </el-menu-item>
        <el-menu-item index="/pairing">
          <el-icon class="menu-icon-el"><Connection /></el-icon>
          <span>配对计算器</span>
        </el-menu-item>
        <el-menu-item index="/announcements">
          <el-icon class="menu-icon-el"><Notification /></el-icon>
          <span>公告中心</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <img src="/profile.png" class="menu-icon" />
          <span>个人中心</span>
        </el-menu-item>
        <el-menu-item v-if="isSuperAdmin" index="/admin">
          <el-icon class="menu-icon-el"><Setting /></el-icon>
          <span>后台管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="user-area">
            <img :src="avatarSrc" class="header-avatar" @error="onHeaderAvatarError" />
            <div class="user-info">
              <span class="nickname">{{ authStore.user?.nickname || '未命名用户' }}</span>
              <el-tag class="role-tag" size="small" :type="roleTagType" effect="dark">{{ roleLabel }}</el-tag>
            </div>
          </div>
          <el-button link @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Notebook, Sunny, Connection, Setting, Notification } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')

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

const handleLogout = () => {
  authStore.logout()
}

onMounted(() => {
  authStore.refreshProfile && authStore.refreshProfile()
})

const avatarSrc = computed(() => {
  const u = authStore.user || {}
  const url = u.avatar_url
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
})

const onHeaderAvatarError = () => {}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.el-aside {
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  border-bottom: 1px solid #f0f0f0;
}
.logo-img {
  width: 32px;
  height: 32px;
  margin-right: 12px;
}
.menu-icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  object-fit: contain;
}
.menu-icon-el {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  font-size: 20px;
  vertical-align: middle;
}
.el-header {
  background: var(--primary-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 20px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
  height: 64px !important;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  font-weight: 500;
}
.user-area { display: flex; align-items: center; gap: 10px; }
.user-info { display:flex; flex-direction:column; line-height: 1.2; }
.nickname { color: #fff; }
.role-tag { margin-top: 2px; align-self: flex-start; }
.header-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: rgba(255,255,255,0.3); }
.header-content .el-button {
  color: rgba(255, 255, 255, 0.9);
}
.header-content .el-button:hover {
  color: white;
}
.el-main {
  background-color: #f8f9fa;
  padding: 24px;
}
:deep(.el-menu-vertical) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
:deep(.el-menu-vertical .el-menu-item:last-child) {
  margin-top: auto;
  border-top: 1px solid #f0f0f0;
}
</style>
