<template>
  <div class="membership-page page-container">
    <div class="page-header">
      <div class="header-row">
        <h2>会员中心</h2>
        <div class="header-sub">升级解锁更多权益</div>
      </div>
    </div>

    <div class="status-card" :class="statusCardClass">
      <div class="card-header">
        <div class="title-box">
          <span class="status-title">{{ hasMembership ? membershipName : '普通用户' }}</span>
          <span v-if="hasMembership && membershipTag" class="tier-tag" :class="tierClass">{{ membershipTag }}</span>
        </div>
        <div class="status-icon" :class="tierClass"></div>
      </div>
      <div class="card-body">
        <div class="expire-info" v-if="hasMembership">有效期至：{{ expireDisplay || '—' }}</div>
        <div class="expire-info" v-else>升级解锁无限鹦鹉管理权限</div>
      </div>
    </div>

    <el-card class="redeem-card" shadow="never" v-if="membershipEnabled">
      <div class="redeem-header">兑换会员</div>
      <div class="redeem-row">
        <el-input v-model="redeemCode" placeholder="请输入兑换码" clearable class="redeem-input" />
        <el-button type="primary" :disabled="!redeemCode" :loading="redeeming" @click="redeem">兑换</el-button>
        <el-button @click="openApplyModal">申请兑换码</el-button>
      </div>
      <div class="redeem-tip">兑换成功后将自动升级会员并刷新当前信息</div>
    </el-card>

    <el-card v-if="membershipEnabled" class="pricing-card" shadow="never">
      <div class="section-title">会员价格</div>
      <div class="pricing-grid">
        <div class="pricing-col">
          <div class="pricing-header pro">个人会员</div>
          <div class="pricing-item">
            <span class="pricing-name">月卡</span>
            <div class="price-box">
              <span class="original-price">¥19.9/月</span>
              <span class="sale-badge">限时特惠</span>
              <span class="sale-price">¥9.9/月</span>
            </div>
          </div>
          <div class="pricing-item">
            <span class="pricing-name">年卡</span>
            <div class="price-box">
              <span class="original-price">¥199/年</span>
              <span class="sale-badge">限时特惠</span>
              <span class="sale-price">¥99/年</span>
            </div>
          </div>
          <div class="apply-row"><el-button class="apply-btn" @click="openApplyModal">申请兑换码</el-button></div>
        </div>
        <div class="pricing-col">
          <div class="pricing-header team">团队会员</div>
          <div class="pricing-item"><span class="pricing-name">月卡基础版</span><div class="price-box"><span class="original-price">¥59.9/月</span><span class="sale-badge">限时特惠</span><span class="sale-price">¥29.9/月</span></div></div>
          <div class="pricing-item"><span class="pricing-name">月卡高级版</span><div class="price-box"><span class="original-price">¥99.9/月</span><span class="sale-badge">限时特惠</span><span class="sale-price">¥59.9/月</span></div></div>
          <div class="pricing-item"><span class="pricing-name">年卡基础版</span><div class="price-box"><span class="original-price">¥599/年</span><span class="sale-badge">限时特惠</span><span class="sale-price">¥299/年</span></div></div>
          <div class="pricing-item"><span class="pricing-name">年卡高级版</span><div class="price-box"><span class="original-price">¥999/年</span><span class="sale-badge">限时特惠</span><span class="sale-price">¥599/年</span></div></div>
          <div class="apply-row"><el-button class="apply-btn" @click="openApplyModal">申请兑换码</el-button></div>
        </div>
      </div>
    </el-card>

    <el-card v-if="membershipEnabled" class="limits-card" shadow="never">
      <div class="section-title">会员权益体系</div>
      <div class="matrix">
        <div class="matrix-header"><span class="h-feature">功能权益</span><span class="h-free">免费版</span><span class="h-pro">个人会员</span><span class="h-team">团队会员</span></div>
        <div class="matrix-row"><span class="c-feature">鹦鹉数量限制</span><span class="c-free">个人上限{{limits.free_personal}}只 / 团队上限{{limits.free_team}}只</span><span class="c-pro">{{limits.pro_personal}}只</span><span class="c-team">基础版{{limits.team_basic}}只 / 高级版 {{limits.team_advanced > 0 ? (limits.team_advanced + '只') : '无限制'}}</span></div>
        <div class="matrix-row"><span class="c-feature">数据记录</span><span class="c-free">基础记录（喂食/清洁/健康）</span><span class="c-pro">基础记录 + 高清照片原图存储</span><span class="c-team">包含所有个人会员功能</span></div>
        <div class="matrix-row"><span class="c-feature">统计分析</span><span class="c-free">基础月报</span><span class="c-pro">高级趋势分析（体重/食量/开销趋势）</span><span class="c-team">多维度营养与经营报表</span></div>
        <div class="matrix-row"><span class="c-feature">数据导出</span><span class="c-free">不支持</span><span class="c-pro">导出 Excel/PDF 报表</span><span class="c-team">批量导出与数据备份</span></div>
        <div class="matrix-row"><span class="c-feature">团队协作</span><span class="c-free">仅限单人</span><span class="c-pro">单人</span><span class="c-team">支持多角色、分权限协作管理</span></div>
        <div class="matrix-row"><span class="c-feature">高级功能</span><span class="c-free">可能有少量广告</span><span class="c-pro">纯净无广告</span><span class="c-team">API 接口、自定义工作流、专属客服</span></div>
      </div>
    </el-card>

    <el-dialog v-model="showApplyModal" title="申请兑换码" width="460px" class="apply-dialog">
      <div class="apply-body">
        <div class="apply-text">请添加客服微信并申请兑换码</div>
        <div class="contact-row">
          <span class="contact-label">客服微信：</span>
          <span class="contact-id">parrotkepper</span>
          <el-button size="small" @click="copyContact">复制</el-button>
        </div>
        <div class="apply-tip">工作日 9:00-18:00 审核，预计 1-2 个工作日内发放</div>
      </div>
      <template #footer>
        <el-button @click="showApplyModal=false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const membershipEnabled = ref(false)
const limits = ref({ free_personal: 10, free_team: 20, pro_personal: 100, team_basic: 1000, team_advanced: 0 })
const redeemCode = ref('')
const redeeming = ref(false)
const showApplyModal = ref(false)

const membershipName = ref('')
const membershipTag = ref('')
const tierClass = ref('')
const hasMembership = ref(false)

const tier = computed(() => String((authStore.user || {}).subscription_tier || 'free').toLowerCase())
const teamLevel = computed(() => String((authStore.user || {}).team_level || '').toLowerCase())

const tierLabel = computed(() => {
  const t = tier.value
  if (t === 'pro') return '专业版 Pro'
  if (t === 'team') return '团队版 Team'
  return '免费版 Free'
})
const teamLevelLabel = computed(() => teamLevel.value === 'advanced' ? '高级版' : (teamLevel.value === 'basic' ? '基础版' : '—'))

const expireDisplay = computed(() => {
  const u = authStore.user || {}
  const raw = u.subscription_expire_at || u.subscription_expires_at || u.expire_at || ''
  if (!raw) return ''
  const d = new Date(String(raw).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(raw)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
})

const currentLimit = computed(() => {
  const t = tier.value
  const mode = localStorage.getItem('user_mode') || 'personal'
  const lev = teamLevel.value
  if (t === 'free') return mode === 'team' ? limits.value.free_team : limits.value.free_personal
  if (t === 'pro') return limits.value.pro_personal
  if (t === 'team') return lev === 'basic' ? limits.value.team_basic : (limits.value.team_advanced || 0)
  return 0
})

const statusCardClass = computed(() => {
  const inactive = !hasMembership.value
  if (inactive) return 'inactive-card'
  return tierClass.value === 'team' ? 'team-card' : 'pro-card'
})

const normalizeTeamLevel = (v) => {
  const s = String(v || '').trim().toLowerCase()
  if (!s) return ''
  if (s === 'advanced' || s === 'premium' || s === 'plus' || s === '高级' || s === '高级版') return 'advanced'
  if (s === 'basic' || s === '基础' || s === '基础版') return 'basic'
  return ''
}

const getUserTeamLevel = (u) => {
  const fields = [u.membership_team_level, u.team_subscription_level, u.team_level, u.subscription_level, u.teamLevel]
  for (const f of fields) {
    const n = normalizeTeamLevel(f)
    if (n) return n
  }
  if (u.is_team_advanced === true) return 'advanced'
  if (u.is_team_basic === true) return 'basic'
  return ''
}

const computeAdjustedTier = (rawTier, userInfo, currentTeam) => {
  const now = Date.now()
  const t = String(rawTier || '').toLowerCase()
  if (t === 'pro') {
    const expStr = userInfo && userInfo.subscription_expire_at
    if (!expStr) return 'free'
    const ts = new Date(String(expStr).replace(' ', 'T')).getTime()
    return (isFinite(ts) && ts > now) ? 'pro' : 'free'
  }
  if (t === 'team') {
    const hasTeam = !!(currentTeam && currentTeam.id)
    if (!hasTeam) {
      const userExp = userInfo && userInfo.subscription_expire_at
      if (!userExp) return 'free'
      const tsUser = new Date(String(userExp).replace(' ', 'T')).getTime()
      return (isFinite(tsUser) && tsUser > now) ? 'team' : 'free'
    }
    const expStr = currentTeam.subscription_expire_at || currentTeam.expire_at || (userInfo && userInfo.subscription_expire_at) || ''
    if (!expStr) return 'free'
    const ts = new Date(String(expStr).replace(' ', 'T')).getTime()
    return (isFinite(ts) && ts > now) ? 'team' : 'free'
  }
  return 'free'
}

const load = async () => {
  try {
    const t = await api.get('/membership/toggle')
    if (t.data?.success) membershipEnabled.value = !!(t.data.data && t.data.data.enabled)
  } catch (_) {}
  try {
    const r = await api.get('/membership/limits')
    if (r.data?.success) {
      const d = r.data.data || {}
      limits.value = {
        free_personal: Number(d.free_personal || 10),
        free_team: Number(d.free_team || 20),
        pro_personal: Number(d.pro_personal || 100),
        team_basic: Number(d.team_basic || 1000),
        team_advanced: Number(d.team_advanced || 0)
      }
    }
  } catch (_) {}
  updateStatusFromUser(authStore.user || {})
}

const redeem = async () => {
  if (!redeemCode.value || redeeming.value) return
  redeeming.value = true
  try {
    const r = await api.post('/redemption/redeem', { code: redeemCode.value })
    if (r.data?.success) {
      ElMessage.success('兑换成功')
      redeemCode.value = ''
      await (authStore.refreshProfile && authStore.refreshProfile())
      await load()
    } else {
      ElMessage.error(r.data?.message || '兑换失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '兑换失败')
  } finally {
    redeeming.value = false
  }
}

const openApplyModal = () => { showApplyModal.value = true }
const copyContact = async () => {
  try {
    await navigator.clipboard.writeText('parrotkepper')
    ElMessage.success('已复制客服微信ID')
    showApplyModal.value = false
  } catch (_) {
    ElMessage.success('parrotkepper')
  }
}

const updateStatusFromUser = async (u) => {
  const mode = localStorage.getItem('user_mode') || 'personal'
  const tierRaw = String(u.subscription_tier || 'free').toLowerCase()
  let currentTeam = null
  try {
    const r = await api.get('/teams/current')
    if (r.data?.success) currentTeam = r.data.data
  } catch (_) {}
  const effectiveTier = computeAdjustedTier(tierRaw, u, currentTeam)
  const isProNow = effectiveTier === 'pro' || effectiveTier === 'team'
  const durationDays = Number(u.membership_duration_days || 0)
  let name = ''
  let tag = ''
  tierClass.value = ''
  if (isProNow) {
    if (effectiveTier === 'team') {
      const lv = getUserTeamLevel(u)
      if (lv === 'advanced') tag = '团队-高级版'
      else if (lv === 'basic') tag = '团队-基础版'
      else tag = '团队'
      tierClass.value = 'team'
    } else if (effectiveTier === 'pro' && mode === 'personal') {
      tag = '个人'
      tierClass.value = 'pro'
    }
    if (effectiveTier !== 'team') {
      if (u.membership_label) name = u.membership_label
      else if (durationDays > 0) {
        if (durationDays >= 36500) name = '永久会员'
        else if (durationDays >= 365) name = '年卡会员'
        else if (durationDays >= 30) name = '月卡会员'
        else name = '高级会员'
      } else if (expireDisplay.value) {
        try {
          const now = Date.now()
          const exp = new Date(String(expireDisplay.value).replace(' ', 'T')).getTime()
          const days = Math.round((exp - now) / (24 * 60 * 60 * 1000))
          if (days >= 36500) name = '永久会员'
          else if (days >= 360) name = '年卡会员'
          else if (days >= 25) name = '月卡会员'
          else name = '高级会员'
        } catch (_) { name = '高级会员' }
      } else {
        name = '高级会员'
      }
    }
  }
  hasMembership.value = (effectiveTier === 'pro') || (effectiveTier === 'team' && mode === 'team')
  membershipName.value = name || (effectiveTier === 'team' ? '团队会员' : '')
  membershipTag.value = tag
}

onMounted(async () => { authStore.refreshProfile && authStore.refreshProfile(); await load() })
</script>

<style scoped>
.membership-page { padding-bottom: 20px; }
.header-row { display:flex; align-items:center; gap:8px; }
.header-sub { font-size:13px; color:#909399; }

.status-card { border-radius: 12px; overflow: hidden; margin-bottom: 12px; background: #fff; border: 1px solid #f0f0f0; }
.status-card .card-header { display:flex; align-items:center; justify-content:space-between; padding:16px; }
.status-card .title-box { display:flex; align-items:center; gap:8px; }
.status-title { font-weight:700; font-size:16px; color:#303133; }
.tier-tag { padding:2px 8px; border-radius:999px; font-size:12px; color:#fff; }
.tier-tag.pro { background:#f59e0b; }
.tier-tag.team { background:#3b82f6; }
.status-icon { width:32px; height:32px; border-radius:50%; }
.status-icon.pro { background: linear-gradient(135deg, #f59e0b, #f97316); }
.status-icon.team { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.status-card .card-body { padding:0 16px 16px; }
.expire-info { font-size:13px; color:#606266; }
.inactive-card .status-title { color:#909399; }

.redeem-card { margin-bottom: 12px; }
.redeem-header { font-weight:600; color: var(--text-primary); margin-bottom:8px; }
.redeem-row { display:flex; gap:12px; align-items:center; }
.redeem-input { flex:1; }
.redeem-tip { margin-top:8px; font-size:12px; color:#909399; }

.pricing-card { margin-bottom: 12px; }
.section-title { font-weight:600; color: var(--text-primary); margin-bottom:8px; }
.pricing-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:12px; }
.pricing-col { border:1px solid #f0f0f0; border-radius:12px; padding:12px; background:#fff; }
.pricing-header { font-weight:700; margin-bottom:8px; }
.pricing-header.pro { color:#f59e0b; }
.pricing-header.team { color:#3b82f6; }
.pricing-item { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #eee; }
.pricing-item:last-child { border-bottom:none; }
.pricing-name { font-size:13px; color:#606266; }
.price-box { display:flex; align-items:center; gap:8px; }
.original-price { font-size:12px; color:#909399; text-decoration: line-through; }
.sale-badge { font-size:12px; color:#fff; background:#ef4444; border-radius:999px; padding:2px 8px; }
.sale-price { font-size:14px; font-weight:700; color:#ef4444; }
.apply-row { margin-top:8px; display:flex; justify-content:flex-end; }
.apply-btn { border-radius:12px; }

.limits-card { }
.matrix { border:1px solid #f0f0f0; border-radius:12px; overflow:hidden; }
.matrix-header { display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; background:#f9fafb; padding:10px 12px; font-weight:600; color:#303133; }
.matrix-row { display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; padding:10px 12px; border-top:1px solid #f0f0f0; font-size:13px; color:#606266; }
.h-feature, .c-feature { color:#374151; }
.h-free, .c-free { background:#f4f4f5; color:#374151; border-radius:8px; padding:6px 10px; display:block; }
.h-pro, .c-pro { background:#fff7ed; color:#b45309; border-radius:8px; padding:6px 10px; display:block; }
.h-team, .c-team { background:#eff6ff; color:#1d4ed8; border-radius:8px; padding:6px 10px; display:block; }

.apply-dialog :deep(.el-dialog__body) { padding-top: 8px; }
.apply-body { padding: 8px 4px; }
.apply-text { font-weight:600; margin-bottom:6px; }
.contact-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.contact-label { color:#606266; }
.contact-id { font-weight:700; color:#10b981; }
.apply-tip { color:#909399; font-size:12px; }
</style>
