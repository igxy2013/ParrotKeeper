<template>
  <div class="admin-container">
    <div class="header">
      <h2>后台管理</h2>
      <div class="header-actions">
        <el-tag type="info">仅超级管理员可访问</el-tag>
      </div>
    </div>

    <div v-if="!isSuperAdmin" class="no-access">
      仅超级管理员可访问该页面
    </div>
    <div v-else class="menu-sections">
      <el-card class="menu-card" shadow="never">
        <div class="section-title">
          <el-icon class="section-icon"><Setting /></el-icon>
          <span>后台管理</span>
        </div>
        <div class="menu-list">
          <div class="menu-item" @click="go('/admin/feedbacks')">
            <div class="menu-item-icon bg-amber"><el-icon><ChatLineSquare /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">反馈管理</div>
              <div class="menu-item-desc">查看与处理用户反馈</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="go('/admin/care-guide-editor')">
            <div class="menu-item-icon bg-green"><el-icon><Edit /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">护理指南编辑</div>
              <div class="menu-item-desc">编辑护理指南配置</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="go('/admin/incubation-suggestions')">
            <div class="menu-item-icon bg-purple"><el-icon><Edit /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">孵化建议管理</div>
              <div class="menu-item-desc">按品种编辑孵化建议</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="go('/admin/market-prices')">
            <div class="menu-item-icon bg-indigo"><el-icon><Setting /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">参考价格管理</div>
              <div class="menu-item-desc">维护鹦鹉羽色市场参考价</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="go('/admin/parrot-species')">
            <div class="menu-item-icon bg-green"><el-icon><Edit /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">鹦鹉品种管理</div>
              <div class="menu-item-desc">维护品种信息与养护难度</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>


          <div class="menu-item" @click="go('/admin/announcements')">
            <div class="menu-item-icon bg-indigo"><el-icon><Notification /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">系统公告发布</div>
              <div class="menu-item-desc">创建公告、设置投放范围与时效</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="go('/admin/api-configs')">
            <div class="menu-item-icon bg-indigo"><el-icon><Setting /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">API配置管理</div>
              <div class="menu-item-desc">查看与更新第三方API配置</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="go('/admin/invitation-codes')">
            <div class="menu-item-icon bg-green"><el-icon><Setting /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">邀请码管理</div>
              <div class="menu-item-desc">生成并管理注册邀请码</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { Setting, ChatLineSquare, Edit, ArrowRight, Notification } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
onMounted(() => { authStore.refreshProfile && authStore.refreshProfile() })
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')

const go = (path) => { router.push(path) }
</script>

<style scoped>
.admin-container { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.menu-card { border-radius: 12px; }
.section-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary); }
.section-icon { font-size: 20px; }
.menu-list { display: flex; flex-direction: column; }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-top: 1px solid #f0f0f0; cursor: pointer; }
.menu-item:first-child { border-top: none; }
.menu-item:hover { background: #f9fafb; }
.menu-item-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
.bg-amber { background: #f59e0b; }
.bg-green { background: #10b981; }
.bg-purple { background: #8b5cf6; }
.bg-indigo { background: #6366f1; }
.bg-gray { background: #6b7280; }
.menu-item-content { flex: 1; display: flex; flex-direction: column; }
.menu-item-title { font-weight: 500; }
.menu-item-desc { font-size: 13px; color: #909399; }
.arrow-icon { color: #c0c4cc; }
</style>
