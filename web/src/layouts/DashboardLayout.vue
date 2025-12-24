<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '80px' : '260px'" class="aside-container">
      <SideNav :is-collapse="isCollapse" />
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="left-zone">
            <el-button class="collapse-btn" @click="toggleCollapse" text circle>
              <el-icon :size="20">
                <Fold v-if="!isCollapse" />
                <Expand v-else />
              </el-icon>
            </el-button>
          </div>
          <div class="right-zone">
            <!-- User info moved to sidebar, keeping logout for accessibility or fallback -->
            <div class="user-area" v-if="false">
              <img :src="avatarSrc" class="header-avatar" @error="onHeaderAvatarError" />
              <div class="user-info">
                <span class="nickname">{{ authStore.user?.nickname || '未命名用户' }}</span>
                <el-tag class="role-tag" size="small" :type="roleTagType" effect="dark">{{ roleLabel }}</el-tag>
              </div>
            </div>
            <el-button link @click="handleLogout">退出登录</el-button>
          </div>
        </div>
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
import { Notebook, Sunny, Connection, Setting, Notification, Fold, Expand } from '@element-plus/icons-vue'
import SideNav from '../components/SideNav.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapse = ref(false)
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

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
.aside-container {
  transition: width 0.3s ease;
  overflow: hidden;
  background-color: #fff;
  /* border is handled by SideNav */
}

.el-header {
  background: var(--primary-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 20px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
  height: 64px !important;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: space-between;
  width: 100%;
  font-weight: 500;
}

.left-zone { display:flex; align-items:center; }
.right-zone { display:flex; align-items:center; gap: 20px; }

.collapse-btn {
  margin-right: 12px;
  color: white !important;
  transition: all 0.3s ease;
}
.collapse-btn:hover {
  background-color: rgba(255,255,255,0.2) !important;
  transform: scale(1.1);
}

.user-area { display: flex; align-items: center; gap: 10px; }
.mode-tag { align-self: center; }
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
</style>
