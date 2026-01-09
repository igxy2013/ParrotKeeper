<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>会员模式管理</h2>
      <div class="header-actions">
        <el-tag type="info">仅超级管理员可访问</el-tag>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-card class="section-card" shadow="never">
        <div class="section-title">
          <el-icon class="section-icon"><Setting /></el-icon>
          <span>会员订阅模式</span>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">开启会员订阅模式</span>
          <el-switch v-model="membershipEnabled" @change="onToggleChange" />
        </div>
      </el-card>

      <el-card class="section-card" shadow="never">
        <div class="section-title">
          <el-icon class="section-icon"><Setting /></el-icon>
          <span>会员相关功能</span>
        </div>
        <div class="menu-list">
          <div class="menu-item" @click="go('/admin/redeem-codes')">
            <div class="menu-item-icon bg-purple"><el-icon><Setting /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">会员兑换码</div>
              <div class="menu-item-desc">生成会员权益兑换码</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="go('/admin/members-management')">
            <div class="menu-item-icon bg-pink"><el-icon><UserFilled /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">会员管理</div>
              <div class="menu-item-desc">查看与维护会员等级与到期</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>

          <div class="menu-item" @click="openLimitsModal">
            <div class="menu-item-icon bg-green"><el-icon><Setting /></el-icon></div>
            <div class="menu-item-content">
              <div class="menu-item-title">数量上限设置</div>
              <div class="menu-item-desc">配置各版本鹦鹉数量上限</div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </el-card>

      <el-dialog v-model="showLimitsModal" width="540px" class="limits-dialog" :show-close="false">
        <template #header>
          <div class="dialog-header-gradient">
            <div class="dialog-header-row">
              <span class="dialog-title">数量上限设置</span>
              <div class="dialog-close-btn" @click="showLimitsModal=false">
                <el-icon class="dialog-close-icon"><Close /></el-icon>
              </div>
            </div>
          </div>
        </template>
        <div class="limits-body">
          <div class="group">
            <div class="group-title">免费版限制</div>
            <div class="form-row">
              <div class="label">个人模式上限</div>
              <div class="number-display" @click="editLimit('free_personal')">{{ limits.free_personal }}</div>
            </div>
            <div class="form-row">
              <div class="label">团队模式上限</div>
              <div class="number-display" @click="editLimit('free_team')">{{ limits.free_team }}</div>
            </div>
          </div>
          <div class="group">
            <div class="group-title">付费版限制</div>
            <div class="form-row">
              <div class="label">Pro（个人）上限</div>
              <div class="number-display" @click="editLimit('pro_personal')">{{ limits.pro_personal }}</div>
            </div>
            <div class="form-row">
              <div class="label">Team 基础版上限</div>
              <div class="number-display" @click="editLimit('team_basic')">{{ limits.team_basic }}</div>
            </div>
          </div>
          <div class="group">
            <div class="group-title">高级版配置</div>
            <div class="form-row">
              <div class="label">Team 高级版无限制</div>
              <el-switch v-model="advancedUnlimited" />
            </div>
            <div class="form-row" v-if="!advancedUnlimited">
              <div class="label">Team 高级版上限</div>
              <div class="number-display" @click="editLimit('team_advanced')">{{ limits.team_advanced }}</div>
            </div>
            <div class="hint">选择“无限制”时将保存为 0</div>
          </div>

          <div v-if="editKey" class="inline-editor">
            <div class="editor-label">{{ editorTitle }}</div>
            <el-input-number v-model="editValue" :min="0" :max="999999" controls-position="right" />
            <div class="editor-actions">
              <el-button @click="cancelEdit">取消</el-button>
              <el-button type="primary" @click="confirmEdit">保存</el-button>
            </div>
          </div>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showLimitsModal=false">取消</el-button>
            <el-button type="primary" :loading="savingLimits" @click="saveLimits">保存设置</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
  
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting, ArrowRight, UserFilled, Close } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const router = useRouter()

const membershipEnabled = ref(true)
const showLimitsModal = ref(false)
const savingLimits = ref(false)
const limits = ref({ free_personal: 10, free_team: 20, pro_personal: 100, team_basic: 1000, team_advanced: 0 })
const advancedUnlimited = ref(true)
const editKey = ref('')
const editValue = ref(0)
const editorTitle = ref('')

const load = async () => {
  try {
    const t = await api.get('/admin/membership-toggle')
    if (t.data?.success) membershipEnabled.value = !!t.data.data.enabled
  } catch (_) {}
  try {
    const r = await api.get('/admin/membership-limits')
    if (r.data?.success) {
      const d = r.data.data || {}
      limits.value = {
        free_personal: Number(d.free_personal || 10),
        free_team: Number(d.free_team || 20),
        pro_personal: Number(d.pro_personal || 100),
        team_basic: Number(d.team_basic || 1000),
        team_advanced: Number(d.team_advanced || 0)
      }
      advancedUnlimited.value = !(limits.value.team_advanced > 0)
    }
  } catch (_) {}
}

onMounted(async () => { authStore.refreshProfile && authStore.refreshProfile(); await load() })

const onToggleChange = async (val) => {
  try {
    const res = await api.put('/admin/membership-toggle', { enabled: !!val })
    if (res.data?.success) ElMessage.success('已更新')
    else ElMessage.error(res.data?.message || '更新失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '更新失败') }
}

watch(advancedUnlimited, v => { if (v) limits.value.team_advanced = 0 })

const openLimitsModal = () => { showLimitsModal.value = true }

const labelMap = {
  free_personal: '个人模式上限',
  free_team: '团队模式上限',
  pro_personal: 'Pro（个人）上限',
  team_basic: 'Team 基础版上限',
  team_advanced: 'Team 高级版上限'
}

const editLimit = (key) => {
  editKey.value = key
  editValue.value = Number(limits.value[key] || 0)
  editorTitle.value = labelMap[key] || '编辑上限'
}
const cancelEdit = () => { editKey.value = ''; editValue.value = 0 }
const confirmEdit = () => {
  if (!editKey.value) return
  limits.value[editKey.value] = Number(editValue.value || 0)
  cancelEdit()
}

const saveLimits = async () => {
  if (savingLimits.value) return
  savingLimits.value = true
  try {
    const payload = { ...limits.value }
    if (advancedUnlimited.value) payload.team_advanced = 0
    const r = await api.put('/admin/membership-limits', payload)
    if (r.data?.success) { ElMessage.success('已保存'); showLimitsModal.value = false }
    else ElMessage.error(r.data?.message || '保存失败')
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败') }
  finally { savingLimits.value = false }
}

const go = (path) => { router.push(path) }
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.section-card { margin-bottom: 12px; }
.section-title { display:flex; align-items:center; gap:8px; font-weight:600; color: var(--text-primary); }
.section-icon { font-size:20px; }
.toggle-row { display:flex; align-items:center; gap:8px; margin-top: 8px; }
.toggle-label { font-size: 13px; color: #606266; }
.menu-list { display:flex; flex-direction:column; }
.menu-item { display:flex; align-items:center; gap:12px; padding:12px; border-top:1px solid #f0f0f0; cursor:pointer; }
.menu-item:first-child { border-top:none; }
.menu-item:hover { background:#f9fafb; }
.menu-item-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; }
.bg-purple { background:#8b5cf6; }
.bg-pink { background:#ec4899; }
.bg-green { background:#10b981; }
.arrow-icon { color:#c0c4cc; }
.limits-form { display:flex; flex-direction:column; gap:12px; }
.form-row { display:flex; align-items:center; gap:12px; margin-bottom: 10px; }
.row-flex { display:flex; align-items:center; gap:12px; }
.label { width:200px; color:#606266; }
.hint { font-size:12px; color:#909399; margin-left: 212px; }

/* Dialog makeover to match mini-program */
.limits-dialog :deep(.el-dialog) { border-radius: 12px; overflow: hidden; }
.limits-dialog :deep(.el-dialog__header) { padding: 0; margin: 0; }
.dialog-header-gradient { background: linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%); padding: 14px 18px; }
.dialog-header-row { display:flex; align-items:center; justify-content:space-between; }
.dialog-title { color:#fff; font-weight:700; }
.dialog-close-btn { width:24px; height:24px; border-radius:50%; background: rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.dialog-close-btn:hover { background: rgba(255,255,255,0.35); }
.dialog-close-icon { color:#fff; font-size:16px; }
.limits-body { padding: 16px 20px; }
.group { margin-bottom: 12px; }
.group-title { font-weight: 700; color: #303133; margin-bottom: 8px; }
.number-display { min-width: 120px; padding: 6px 10px; border-radius: 10px; background: #f9fafb; border: 1px dashed #e5e7eb; cursor: pointer; text-align: center; font-weight: 700; color:#10b981; }
.inline-editor { display:flex; align-items:center; gap:12px; padding: 12px; background:#f9fafb; border:1px solid #eef2f7; border-radius:12px; margin-top: 8px; }
.editor-label { font-weight:600; color:#606266; }
.editor-actions { display:flex; align-items:center; gap:8px; }
</style>

