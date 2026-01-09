<template>
  <div class="side-nav" :class="{ 'is-collapsed': isCollapse }">
    <!-- Logo Area -->
    <div class="logo-area">
      <img src="/logo.png" alt="Logo" class="logo-img" />
      <span class="logo-text" v-show="!isCollapse">鹦鹉管家</span>
    </div>

    <!-- Version Switcher (Only visible when expanded) -->
    <div class="version-switcher" v-show="!isCollapse">
      <div 
        class="switcher-item" 
        :class="{ active: currentMode === 'personal' }"
        @click="switchMode('personal')"
      >
        个人版
      </div>
      <div 
        class="switcher-item" 
        :class="{ active: currentMode === 'team' }"
        @click="switchMode('team')"
      >
        企业版
      </div>
    </div>

    <!-- Navigation Menu -->
    <div class="nav-menu">
      <template v-for="item in menuItems" :key="item.path">
        <!-- Leaf Item -->
        <router-link 
          v-if="(!item.children || item.children.length === 0) && (!item.adminOnly || isSuperAdmin)"
          :to="item.path" 
          class="nav-item" 
          :class="{ active: activeMenu === item.path }"
          @click="expandedMenus = []"
        >
          <div class="nav-icon-wrapper">
             <el-icon :size="20"><component :is="item.icon" /></el-icon>
          </div>
          <span class="nav-label" v-show="!isCollapse">{{ item.label }}</span>
          
          <!-- Badges (Mockup logic based on image) -->
          <span v-if="!isCollapse && item.badge" class="nav-badge" :class="item.badgeColor">
            {{ item.badge }}
          </span>
          <span v-if="isCollapse && item.badge" class="nav-dot" :class="item.badgeColor"></span>
        </router-link>

        <!-- Parent Item (Group) -->
        <div 
          v-else-if="(!item.adminOnly || isSuperAdmin)"
          class="nav-item-group"
        >
          <div 
            class="nav-item parent" 
            :class="{ active: isChildActive(item) }"
            @click="toggleMenu(item.path)"
          >
             <div class="nav-icon-wrapper">
               <el-icon :size="20"><component :is="item.icon" /></el-icon>
             </div>
             <span class="nav-label" v-show="!isCollapse">{{ item.label }}</span>
             <el-icon v-show="!isCollapse" class="expand-icon" :class="{ rotated: expandedMenus.includes(item.path) }"><ArrowRight /></el-icon>
          </div>
          
          <!-- Children -->
          <div class="submenu" v-show="expandedMenus.includes(item.path) && !isCollapse">
             <router-link 
               v-for="child in item.children"
               :key="child.path"
               :to="child.path"
               class="nav-item child"
               :class="{ active: activeMenu === child.path }"
             >
                <div class="nav-icon-wrapper small">
                   <el-icon :size="18"><component :is="child.icon" /></el-icon>
                </div>
                <span class="nav-label">{{ child.label }}</span>
             </router-link>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom Actions -->
    <div class="bottom-actions">
      <!-- User Profile -->
      <div class="user-profile" @click="goAccount">
        <img :src="userAvatar" class="avatar" alt="User" />
        <div class="user-info" v-show="!isCollapse">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">{{ userRole }}</div>
        </div>
        <el-icon class="more-btn" v-show="!isCollapse"><MoreFilled /></el-icon>
      </div>
    </div>
  </div>
  <SettingsAccountModal v-model="showAccountModal" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import SettingsAccountModal from '@/components/SettingsAccountModal.vue'
import { 
  Odometer, 
  Files, 
  TrendCharts, 
  Notebook,
  Reading, 
  Sunny, 
  Connection, 
  Bell, 
  Setting,
  MoreFilled,
  ChatLineSquare,
  Edit,
  Notification,
  ArrowRight,
  Download,
  InfoFilled,
  User,
  OfficeBuilding
} from '@element-plus/icons-vue'

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentMode = ref(localStorage.getItem('user_mode') || 'personal')
const messageCount = ref(0)
const membershipEnabled = ref(true)
const expandedMenus = ref([]) // Default empty

const calculateMessageCount = (announcements) => {
  try {
    const readIds = JSON.parse(localStorage.getItem('read_announcements') || '[]')
    const unread = announcements.filter(a => !readIds.includes(a.id))
    messageCount.value = unread.length
  } catch (e) {
    messageCount.value = announcements.length
  }
}

const switchMode = (mode) => {
  if (currentMode.value === mode) return
  currentMode.value = mode
  localStorage.setItem('user_mode', mode)
  // Reload page to ensure all components refresh with new mode
  window.location.reload()
}

const toggleMenu = (path) => {
  const index = expandedMenus.value.indexOf(path)
  if (index > -1) {
    expandedMenus.value.splice(index, 1)
  } else {
    expandedMenus.value.push(path)
  }
}

const activeMenu = computed(() => route.path)
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const userName = computed(() => authStore.user?.nickname || '用户')
const userRole = computed(() => {
    const role = (authStore.user || {}).role || 'user'
    return role === 'super_admin' ? '超级管理员' : (role === 'admin' ? '管理员' : '普通用户')
})
const userAvatar = computed(() => {
  const u = authStore.user || {}
  const url = u.avatar_url
  if (!url) return '/profile.png'
  const s = String(url)
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '')
}) 

const showAccountModal = ref(false)
const goAccount = () => { showAccountModal.value = true }

const isChildActive = (item) => {
  if (!item.children) return false
  return item.children.some(child => child.path === route.path)
}

const hasTeam = ref(false)

const menuItems = computed(() => [
  { path: '/', label: '概览', icon: Odometer },
  { path: '/parrots', label: '我的鹦鹉', icon: Files }, 
  { path: '/records', label: '饲养记录', icon: Notebook },
  { path: '/expenses', label: '收支管理', icon: TrendCharts },
  { path: '/care-guide', label: '护理指南', icon: Reading }, 
  { path: '/incubation', label: '人工孵化', icon: Sunny },
  { path: '/pairing', label: '配对计算器', icon: Connection },
  {path: '/reports',label: '报表导出',icon: Download},
  { path: '/announcements', label: '公告中心', icon: Bell, badge: messageCount.value > 0 ? (messageCount.value > 99 ? '99+' : messageCount.value) : null, badgeColor: 'green' },
  ...(membershipEnabled.value ? [{ path: '/membership', label: '会员中心', icon: User }] : []),
  {path: '/about',label: '关于我们',icon: InfoFilled},
  ...(currentMode.value === 'team' ? [
    {
      path: '/team',
      label: '团队协作',
      icon: OfficeBuilding,
      children: [
        { path: '/team/current', label: '当前团队', icon: User },
        ...(hasTeam.value ? [] : [
          { path: '/team/join', label: '加入团队', icon: Connection },
          { path: '/team/create', label: '创建团队', icon: Edit }
        ]),
        { path: '/team/manage', label: '团队管理', icon: Setting }
      ]
    }
  ] : []),
  {
    path: '/settings', 
    label: '设置', 
    icon: Setting,
    children: [
      { path: '/settings/notification', label: '通知设置', icon: Notification },
      { path: '/settings/categories', label: '收支类别', icon: TrendCharts },
      { path: '/settings/feed-types', label: '食物类型', icon: Files },
      
    ]
  },
  { 
    path: '/admin', 
    label: '后台管理', 
    icon: Setting, 
    adminOnly: true,
    children: [
       { path: '/admin/users', label: '用户管理', icon: User },
       { path: '/admin/feedbacks', label: '反馈管理', icon: ChatLineSquare },
       { path: '/admin/incubation-suggestions', label: '孵化建议', icon: Sunny },
       { path: '/admin/market-prices', label: '参考价格', icon: TrendCharts },
      { path: '/admin/parrot-species', label: '品种管理', icon: Files },
      { path: '/admin/announcements', label: '系统公告', icon: Notification },
      { path: '/admin/api-configs', label: 'API配置', icon: Setting },
      { path: '/admin/backup', label: '备份与同步', icon: Setting },
      { path: '/admin/invitation-codes', label: '邀请码管理', icon: Setting },
      { path: '/admin/membership-mode', label: '会员模式管理', icon: Setting },
      { path: '/admin/redeem-codes', label: '会员兑换码', icon: Setting },
      { path: '/admin/members-management', label: '会员管理', icon: Setting },
      { path: '/admin/reset-requests', label: '密码重置核验', icon: Notification },
    ]
  },
])

onMounted(async () => {
  try {
    // 获取公告数量，这里尝试获取前100条来计算数量，作为"未读"或"总数"的替代方案
    // 实际生产环境应该有一个 dedicated 的 endpoint 来获取未读数量
    const r = await api.get('/announcements', { params: { limit: 100 } })
    const list = (r.data && r.data.data && r.data.data.announcements) || []
    
    // Initial calculation
    calculateMessageCount(list)

    // Listen for read events
    window.addEventListener('announcement-read', () => {
       calculateMessageCount(list)
    })
  } catch (e) {
    console.error('Failed to fetch announcements count', e)
  }
  try {
    const r2 = await api.get('/teams')
    if (r2.data && r2.data.success) {
      const list = r2.data.data || []
      hasTeam.value = list.length > 0
    }
  } catch (_) {}
  try {
    const t = await api.get('/admin/membership-toggle')
    if (t.data && t.data.success) membershipEnabled.value = !!t.data.data.enabled
  } catch (_) {}
})
</script>

<style scoped>
.side-nav {
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  width: 100%;
  padding: 24px 16px;
  box-sizing: border-box;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.side-nav.is-collapsed {
  padding: 24px 12px;
}

/* Logo */
.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  padding-left: 8px;
  height: 40px;
}

.logo-img {
  width: 32px;
  height: 32px;
}

.logo-text {
  font-weight: 800;
  font-size: 18px;
  color: #1a1a1a;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* Version Switcher */
.version-switcher {
  display: flex;
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 30px;
  flex-shrink: 0;
}

.switcher-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.3s;
}

.switcher-item.active {
  background-color: #10b981; /* Theme Green */
  color: white;
  box-shadow: 0 2px 8px rgba(38, 166, 154, 0.3);
  font-weight: 500;
}

/* Menu */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  color: #666;
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: #f9fafb;
}

.nav-item.active {
  background-color: #10b981;
  color: white;
}

.nav-item.active .el-icon {
  color: white; 
}

.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.is-collapsed .nav-icon-wrapper {
  margin-right: 0;
  width: 100%;
}

.nav-label {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
}

/* Badges */
.nav-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: white;
  font-weight: bold;
}

.nav-badge.red { background-color: #ff6b6b; }
.nav-badge.green { background-color: #2ecc71; }

.nav-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid white;
}
.nav-dot.red { background-color: #ff6b6b; }
.nav-dot.green { background-color: #2ecc71; }


/* Bottom Actions */
.bottom-actions {
  margin-top: 20px;
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
  flex-shrink: 0;
}

.mode-switcher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  color: #666;
  font-size: 14px;
  padding: 0 8px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-profile:hover {
  background-color: #f9fafb;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #eee;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.more-btn {
  color: #ccc;
  flex-shrink: 0;
}

/* Scrollbar hide */
.nav-menu::-webkit-scrollbar {
  width: 4px;
}
.nav-menu::-webkit-scrollbar-thumb {
  background: #eee; 
  border-radius: 2px;
}

/* Submenu Styles */
.nav-item.parent {
  cursor: pointer;
  justify-content: space-between;
}

.nav-item.parent.active {
  background-color: transparent;
  color: #26A69A;
}

.nav-item.parent.active .el-icon {
  color: #26A69A;
}

.nav-item.parent:hover {
  background-color: #f9fafb;
}

.expand-icon {
  transition: transform 0.3s;
  color: #999;
  font-size: 14px;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

.submenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  overflow: hidden;
}

.nav-item.child {
  padding-left: 48px;
  font-size: 14px;
}

.nav-item.child .nav-icon-wrapper {
   width: 20px;
   margin-right: 8px;
}

.nav-item.child .nav-label {
  font-size: 14px;
}
</style>
