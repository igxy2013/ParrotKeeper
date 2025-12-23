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
        <el-menu-item index="/incubation">
          <el-icon class="menu-icon-el"><Sunny /></el-icon>
          <span>人工孵化</span>
        </el-menu-item>
        <el-menu-item index="/pairing">
          <el-icon class="menu-icon-el"><Connection /></el-icon>
          <span>配对计算器</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon class="menu-icon-el"><Setting /></el-icon>
          <span>模式设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="user-area" @click="openProfile">
            <img :src="avatarSrc" class="header-avatar" @error="onHeaderAvatarError" />
            <span>{{ authStore.user?.nickname || '未命名用户' }}</span>
          </div>
          <el-button link @click="handleLogout">退出登录</el-button>
        </div>
        <UserProfileModal v-model="showProfile" />
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UserProfileModal from '@/components/UserProfileModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showProfile = ref(false)

const activeMenu = computed(() => route.path)

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
const openProfile = () => { showProfile.value = true }
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
.user-area { display: flex; align-items: center; gap: 10px; cursor: pointer; }
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
</style>
