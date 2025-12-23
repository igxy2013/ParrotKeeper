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
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-content">
          <span>欢迎, {{ authStore.user?.nickname }}</span>
          <el-button type="text" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

const handleLogout = () => {
  authStore.logout()
}
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
