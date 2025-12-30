<template>
  <el-dialog v-model="visible" title="鹦鹉详情" width="860px" class="parrot-detail-dialog">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    <div v-else>
      <div class="info-card">
        <div class="avatar-col">
          <img :src="getParrotImage(parrot)" class="detail-avatar" @error="onAvatarError" />
        </div>
        <div class="info-col">
          <div class="name-row">
            <span class="parrot-name">{{ parrot.name || '未命名' }}</span>
            <el-icon v-if="parrot.gender === 'male'" class="gender-icon male"><Male /></el-icon>
            <el-icon v-else-if="parrot.gender === 'female'" class="gender-icon female"><Female /></el-icon>
            <span class="parrot-status-tag" :class="parrot.health_status">{{ getHealthLabel(parrot.health_status) }}</span>
          </div>
          <div class="sub-row">
            <span class="info-item">{{ parrot.species_name || parrot.species?.name || '未知品种' }}</span>
            <span class="divider">|</span>
            <span class="info-item">{{ calculateAge(parrot.birth_date) }}</span>
          </div>
          <div class="extra-row">
            <span v-if="formatWeight(parrot.weight)" class="info-item">体重：{{ formatWeight(parrot.weight) }}</span>
            <span v-if="parrot.parrot_number" class="info-item">编号：{{ parrot.parrot_number }}</span>
            <span v-if="parrot.ring_number" class="info-item">脚环号：{{ parrot.ring_number }}</span>
            <span v-if="formatDate(parrot.acquisition_date)" class="info-item">入住：{{ formatDate(parrot.acquisition_date) }}</span>
          </div>
        </div>
        <div class="header-buttons">
          <el-button @click="openTransfer">鹦鹉过户</el-button>
          <el-button type="primary" @click="openEdit">编辑鹦鹉</el-button>
          <el-button type="danger" @click="removeParrot">删除鹦鹉</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="基本信息" name="基本信息">
          <div class="basic-grid">
            <div class="basic-item"><span class="label">昵称</span><span class="value">{{ parrot.name || '-' }}</span></div>
            <div class="basic-item"><span class="label">品种</span><span class="value">{{ parrot.species_name || parrot.species?.name || '-' }}</span></div>
            <div class="basic-item"><span class="label">性别</span><span class="value">{{ genderText }}</span></div>
            <div class="basic-item"><span class="label">出生日期</span><span class="value">{{ formatDate(parrot.birth_date) || '-' }}</span></div>
            <div class="basic-item"><span class="label">出生地</span><span class="value">{{ birthPlaceDisplay || '-' }}</span></div>
            <div class="basic-item"><span class="label">入住日期</span><span class="value">{{ formatDate(parrot.acquisition_date) || '-' }}</span></div>
            <div class="basic-item"><span class="label">编号</span><span class="value">{{ parrot.parrot_number || '-' }}</span></div>
            <div class="basic-item"><span class="label">脚环号</span><span class="value">{{ parrot.ring_number || '-' }}</span></div>
            <div class="basic-item span-2"><span class="label">备注</span><span class="value">{{ parrot.notes || '-' }}</span></div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="喂食记录" name="喂食记录">
          <el-table :data="feedingRecords" v-loading="recordsLoading">
            <el-table-column prop="feeding_time" label="时间" width="180" />
            <el-table-column prop="parrot_name" label="鹦鹉" width="160" />
            <el-table-column label="食物类型" min-width="160">
              <template #default="scope">
                <span>{{ formatFeedTypes(scope.row.food_types) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="健康档案" name="健康档案">
          <el-table :data="healthRecords" v-loading="recordsLoading">
            <el-table-column prop="record_date" label="日期" width="160" />
            <el-table-column prop="health_status" label="状态" width="140">
              <template #default="scope">
                <span>{{ getHealthLabel(scope.row.health_status) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="体重" width="120">
              <template #default="scope">
                <span>{{ formatWeight(scope.row.weight) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="繁殖记录" name="繁殖记录">
          <el-table :data="breedingRecords" v-loading="recordsLoading">
            <el-table-column prop="mating_date" label="配对日期" width="160" />
            <el-table-column prop="male_parrot_name" label="公鸟" width="160" />
            <el-table-column prop="female_parrot_name" label="母鸟" width="160" />
            <el-table-column prop="notes" label="备注" />
          </el-table>
        </el-tab-pane>
      </el-tabs>

      

      <el-dialog v-model="showTransferDialog" title="鹦鹉过户" width="560px">
        <div class="transfer-section">
          <div class="section-title">过户码认领</div>
          <div class="code-box">
            <span class="code-text">{{ transferCode || (transferCodeGenerating ? '生成中...' : '点击下方生成') }}</span>
          </div>
          <div class="actions-row">
            <el-button @click="copyTransferCode" :disabled="!transferCode || transferCodeGenerating">复制过户码</el-button>
            <el-button type="primary" @click="generateTransferCode" :loading="transferCodeGenerating" :disabled="transferCodeGenerating">生成过户码</el-button>
          </div>
        </div>
        <div class="transfer-section">
          <div class="section-title">直接过户</div>
          <el-form label-width="110px">
            <el-form-item label="目标用户ID">
              <el-input v-model="transferTargetId" placeholder="可选" />
            </el-form-item>
            <el-form-item label="目标OpenID">
              <el-input v-model="transferTargetOpenid" placeholder="可选" />
            </el-form-item>
            <el-form-item label="目标用户名">
              <el-input v-model="transferTargetUsername" placeholder="可选" />
            </el-form-item>
            <el-form-item label="目标手机号">
              <el-input v-model="transferTargetPhone" placeholder="可选" />
            </el-form-item>
          </el-form>
          <div class="actions-row">
            <el-button type="primary" @click="submitTransfer" :loading="transferSubmitting">提交过户</el-button>
          </div>
        </div>
      </el-dialog>
    </div>
    <template #footer>
      <el-button @click="close">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Male, Female } from '@element-plus/icons-vue'
import api from '../api/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  parrotId: { type: [String, Number], default: '' }
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
watch(() => props.modelValue, v => { visible.value = !!v; if (v) init() })
watch(visible, v => emit('update:modelValue', v))

const loading = ref(false)
const recordsLoading = ref(false)
const parrot = ref({})
const activeTab = ref('基本信息')
const feedingRecords = ref([])
const healthRecords = ref([])
const breedingRecords = ref([])

const showTransferDialog = ref(false)
const transferCode = ref('')
const transferCodeGenerating = ref(false)
const transferTargetId = ref('')
const transferTargetOpenid = ref('')
const transferTargetUsername = ref('')
const transferTargetPhone = ref('')
const transferSubmitting = ref(false)

const genderText = computed(() => {
  const g = parrot.value.gender
  return g === 'male' ? '雄性' : (g === 'female' ? '雌性' : '未知')
})

const birthPlaceDisplay = computed(() => {
  const p = parrot.value || {}
  const clean = (v) => {
    const s = String(v || '').trim()
    if (!s) return ''
    if (s === '未选择' || s === '请选择') return ''
    if (s.includes('未选择') || s.includes('请选择')) return ''
    if (s === 'null' || s === 'undefined') return ''
    return s
  }
  const parts = [clean(p.birth_place_province), clean(p.birth_place_city), clean(p.birth_place_county)].filter(Boolean)
  if (parts.length) return parts.join('')
  const bp = clean(p.birth_place)
  if (!bp) return ''
  return String(bp).replace(/未选择|请选择/g, '').replace(/\s+/g, ' ').trim()
})

const init = async () => { await reload() }
const close = () => { visible.value = false }
const openEdit = () => { emit('edit', parrot.value); visible.value = false }
const openTransfer = () => { showTransferDialog.value = true }

const removeParrot = async () => {
  const id = props.parrotId
  if (!id) return
  try {
    await ElMessageBox.confirm('确认删除该鹦鹉？该操作不可恢复', '提示', { type: 'warning' })
    const r = await api.delete(`/parrots/${id}`)
    if (r && r.data && (r.data.success || r.status === 200)) {
      ElMessage.success('已删除')
      visible.value = false
      emit('deleted', id)
    } else {
      ElMessage.error((r && r.data && r.data.message) || '删除失败')
    }
  } catch (_) {}
}

const reload = async () => { await fetchParrot(); await fetchTabRecords() }

const fetchParrot = async () => {
  loading.value = true
  const id = props.parrotId
  try {
    const [detail] = await Promise.all([
      api.get(`/parrots/${id}`)
    ])
    const d = detail.data && (detail.data.data || detail.data)
    parrot.value = d || {}
  } catch (e) {} finally { loading.value = false }
}

const onTabChange = async () => { await fetchTabRecords() }

const fetchTabRecords = async () => {
  recordsLoading.value = true
  const id = props.parrotId
  try {
    if (activeTab.value === '喂食记录') {
      const r = await api.get('/records/feeding', { params: { parrot_id: id, page: 1, per_page: 50 } })
      const data = r.data && (r.data.data || r.data)
      feedingRecords.value = (data.items || data.records || [])
    } else if (activeTab.value === '健康档案') {
      const r = await api.get('/records/health', { params: { parrot_id: id, page: 1, per_page: 50 } })
      const data = r.data && (r.data.data || r.data)
      healthRecords.value = (data.items || data.records || [])
    } else if (activeTab.value === '繁殖记录') {
      const r = await api.get('/records/breeding', { params: { male_parrot_id: id } })
      const data = r.data && (r.data.data || r.data)
      breedingRecords.value = (data.items || data.records || [])
    }
  } catch (e) {} finally { recordsLoading.value = false }
}

const calculateAge = (birthDate) => {
  if (!birthDate) return '年龄未知'
  const birth = new Date(birthDate)
  const now = new Date()
  birth.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  if (birth > now) return '未出生'
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()
  if (days < 0) { months--; const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0); days += lastMonth.getDate() }
  if (months < 0) { years--; months += 12 }
  let ageStr = ''
  if (years > 0) ageStr += `${years}岁`
  if (months > 0) ageStr += `${months}个月`
  if (days > 0) ageStr += `${days}天`
  if (!ageStr) ageStr = '0天'
  return ageStr
}

const getHealthLabel = (status) => {
  const map = { healthy: '健康', sick: '生病', recovering: '康复中', observing: '观察中', observation: '观察中', unknown: '未知' }
  return map[status] || status
}

const formatWeight = (w) => {
  if (w === null || w === undefined || w === '') return ''
  const n = typeof w === 'number' ? w : parseFloat(String(w))
  if (isNaN(n) || !isFinite(n)) return ''
  return `${Math.round(n * 10) / 10} g`
}

const formatDate = (d) => {
  if (!d) return ''
  const t = new Date(d)
  if (isNaN(t.getTime())) return ''
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const getParrotImage = (p) => {
  const raw = p && (p.photo_url || p.avatar_url) || ''
  if (!raw) return getRandomAvatar(p && p.id)
  let url = String(raw).replace(/\\/g, '/').trim()
  if (!url) return getRandomAvatar(p && p.id)
  if (/^https?:\//.test(url)) return url
  if (url.startsWith('data:')) return url
  if (/\/uploads\//.test(url)) {
    const parts = url.split('/uploads/')
    const suffix = parts[1] || ''
    return `/uploads/${suffix.replace(/^images\//, '')}`
  }
  if (/^\/?uploads\//.test(url)) {
    const normalized = url.replace(/^\//, '').replace(/^uploads\/images\//, 'uploads/').replace(/^uploads\//, 'uploads/')
    return `/${normalized}`
  }
  if (/^\/?images\/parrot-avatar-/.test(url)) {
    return `/${url.replace(/^\/?images\//, '')}`
  }
  if (/^\/?images\//.test(url)) {
    return `/${url.replace(/^\/?images\//, '')}`
  }
  if (/^\/?parrot-avatar-/.test(url)) return url.startsWith('/') ? url : `/${url}`
  return `/uploads/${url.replace(/^\//, '').replace(/^images\//, '')}`
}

const getRandomAvatar = (id) => {
  const avatars = [
    '/parrot-avatar-blue.svg',
    '/parrot-avatar-green.svg',
    '/parrot-avatar-orange.svg',
    '/parrot-avatar-purple.svg',
    '/parrot-avatar-red.svg',
    '/parrot-avatar-yellow.svg'
  ]
  const index = (Number(id) || 0) % avatars.length
  return avatars[index]
}

const onAvatarError = (e) => {
  if (e && e.target) { e.target.src = getRandomAvatar(parrot.value.id) }
}

const formatFeedTypes = (types) => {
  if (Array.isArray(types)) return types.map(t => t.name || t).join('、')
  return String(types || '')
}

const generateTransferCode = async () => {
  if (transferCodeGenerating.value) return
  const id = props.parrotId
  try {
    transferCodeGenerating.value = true
    const res = await api.post(`/parrots/${id}/transfer/code`)
    if (res && res.data && res.data.success && res.data.data && res.data.data.code) {
      transferCode.value = res.data.data.code
      ElMessage.success('生成成功')
    } else {
      ElMessage.error((res && res.data && res.data.message) || '生成失败')
    }
  } catch (e) { ElMessage.error('生成失败，请稍后重试') }
  finally { transferCodeGenerating.value = false }
}

const copyTransferCode = async () => {
  if (!transferCode.value || transferCodeGenerating.value) return
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(transferCode.value))
      ElMessage.success('已复制')
    } else {
      const ta = document.createElement('textarea')
      ta.value = String(transferCode.value)
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ElMessage.success('已复制')
    }
  } catch (_) { ElMessage.error('复制失败，请重试') }
}

const submitTransfer = async () => {
  const id = props.parrotId
  const payload = {}
  if (transferTargetId.value) payload.new_owner_id = transferTargetId.value
  if (transferTargetOpenid.value) payload.new_owner_openid = transferTargetOpenid.value
  if (transferTargetUsername.value) payload.new_owner_username = transferTargetUsername.value
  if (transferTargetPhone.value) payload.new_owner_phone = transferTargetPhone.value
  if (!payload.new_owner_id && !payload.new_owner_openid && !payload.new_owner_username && !payload.new_owner_phone) {
    ElMessage.error('请至少填写一个目标用户信息')
    return
  }
  transferSubmitting.value = true
  try {
    const res = await api.post(`/parrots/${id}/transfer`, payload)
    if (res && res.data && res.data.success) {
      ElMessage.success('过户成功')
      showTransferDialog.value = false
      transferTargetId.value = ''
      transferTargetOpenid.value = ''
      transferTargetUsername.value = ''
      transferTargetPhone.value = ''
      await reload()
    } else { ElMessage.error((res && res.data && res.data.message) || '过户失败') }
  } catch (e) { ElMessage.error('网络错误，请稍后重试') }
  finally { transferSubmitting.value = false }
}
</script>

<style scoped>
.parrot-detail-dialog :deep(.el-dialog__header) { padding-bottom: 8px; }
.parrot-detail-dialog :deep(.el-dialog__body) { padding-top: 0; }
.loading-container { background: #fff; border-radius: 12px; padding: 16px; }
.info-card { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 16px; align-items: center; }
.avatar-col { flex: 0 0 auto; }
.detail-avatar { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; }
.info-col { display: flex; flex-direction: column; gap: 8px; }
.name-row { display: flex; align-items: center; gap: 8px; }
.parrot-name { font-size: 20px; font-weight: 600; }
.gender-icon.male { color: #409EFF; }
.gender-icon.female { color: #E91E63; }
.parrot-status-tag { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #f5f7fa; color: #606266; }
.parrot-status-tag.sick { background: #fef0f0; color: #f56c6c; }
.parrot-status-tag.recovering { background: #fdf6ec; color: #e6a23c; }
.parrot-status-tag.observing { background: #ecf5ff; color: #409eff; }
.sub-row { display: flex; align-items: center; gap: 8px; color: #909399; }
.extra-row { display: flex; align-items: center; gap: 12px; color: #909399; }
.divider { color: #dcdfe6; }
.header-buttons { display: flex; gap: 8px; }
.basic-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.basic-item { display: flex; gap: 12px; }
.basic-item .label { width: 96px; color: #909399; }
.basic-item .value { flex: 1; color: var(--text-primary); }
.basic-item.span-2 { grid-column: 1 / span 2; }
.transfer-section { margin-top: 8px; padding-top: 8px; }
.section-title { font-size: 14px; color: #606266; margin-bottom: 8px; }
.code-box { display: flex; align-items: center; justify-content: center; background: #f5f7fa; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.code-text { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
.actions-row { display: flex; gap: 8px; }
.header-buttons :deep(.el-button), .actions-row :deep(.el-button) { border-radius: var(--border-radius-lg) !important; }
</style>
