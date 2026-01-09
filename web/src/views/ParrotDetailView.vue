<template>
  <div class="parrot-detail-container page-container">
    <div class="page-header">
      <h2>鹦鹉详情</h2>
      <div class="header-actions">
        <div class="header-buttons">
          <el-button @click="openTransfer">鹦鹉过户</el-button>
          <el-button type="primary" @click="openEdit">编辑鹦鹉</el-button>
        </div>
      </div>
    </div>

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
            <span v-if="getOwnerName(parrot)" class="info-item">饲养人：{{ getOwnerName(parrot) }}</span>
            <span v-if="parrot.ring_number" class="info-item">脚环号：{{ parrot.ring_number }}</span>
            <span v-if="parrot.color" class="info-item">羽色：{{ decorateColorForDisplay(parrot.species_name || parrot.species?.name, parrot.color) }}</span>
            <span v-if="formatDate(parrot.acquisition_date)" class="info-item">入住：{{ formatDate(parrot.acquisition_date) }}</span>
          </div>
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
            <div class="basic-item"><span class="label">饲养人</span><span class="value">{{ getOwnerName(parrot) || '-' }}</span></div>
            <div class="basic-item" v-if="authStore.user?.user_mode === 'team'"><span class="label">分组</span><span class="value">{{ groupName || '-' }}</span></div>
            <div class="basic-item"><span class="label">脚环号</span><span class="value">{{ parrot.ring_number || '-' }}</span></div>
            <div class="basic-item span-2"><span class="label">备注</span><span class="value">{{ parrot.notes || '-' }}</span></div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="喂食记录" name="喂食记录">
          <el-table :data="feedingRecords" v-loading="recordsLoading" @row-click="handleRowClick">
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
          <el-table :data="healthRecords" v-loading="recordsLoading" @row-click="handleRowClick">
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
          <el-table :data="breedingRecords" v-loading="recordsLoading" @row-click="handleRowClick">
            <el-table-column prop="mating_date" label="配对日期" width="160" />
            <el-table-column prop="male_parrot_name" label="公鸟" width="160" />
            <el-table-column prop="female_parrot_name" label="母鸟" width="160" />
            <el-table-column prop="notes" label="备注" />
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <ParrotModal 
        v-model="showModal"
        :parrot="parrot"
        @success="reload"
      />

      <el-dialog v-model="detailDialogVisible" :title="detailDialogTitle" width="680px">
        <div v-if="detailLoading" class="detail-loading">加载中...</div>
        <div v-else>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="类型">{{ detailTypeLabel }}</el-descriptions-item>
            <el-descriptions-item label="记录时间">{{ detailDisplayTime }}</el-descriptions-item>
            <el-descriptions-item v-if="detailRecorderName" label="记录人">{{ detailRecorderName }}</el-descriptions-item>
            <el-descriptions-item v-if="detailParrotName" label="鹦鹉">{{ detailParrotName }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section" v-if="Array.isArray(detailRecord.photos) && detailRecord.photos.length">
            <div class="photos-title">相关照片</div>
            <div class="photos-grid">
              <el-image
                v-for="(url, idx) in detailRecord.photos"
                :key="idx"
                :src="url"
                :preview-src-list="detailRecord.photos"
                fit="cover"
                class="photo-item"
              />
            </div>
          </div>

          <div class="detail-section" v-if="detailRecordType === 'feeding'">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="食物类型">{{ detailRecord.feed_type_name || (detailRecord.feed_type && detailRecord.feed_type.name) || '-' }}</el-descriptions-item>
              <el-descriptions-item label="数量">{{ detailAmountText }}</el-descriptions-item>
              <el-descriptions-item label="备注" v-if="detailRecord.notes">{{ detailRecord.notes }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="detail-section" v-if="detailRecordType === '健康' || detailRecordType === 'health'">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="体重(g)">{{ detailRecord.weight ?? '-' }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ getHealthLabel(detailRecord.health_status) }}</el-descriptions-item>
              <el-descriptions-item label="描述" v-if="detailRecord.description">{{ detailRecord.description }}</el-descriptions-item>
              <el-descriptions-item label="备注" v-if="detailRecord.notes">{{ detailRecord.notes }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="detail-section" v-if="detailRecordType === 'breeding'">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="公鸟">{{ detailRecord.male_parrot_name || (detailRecord.male_parrot && detailRecord.male_parrot.name) || '-' }}</el-descriptions-item>
              <el-descriptions-item label="母鸟">{{ detailRecord.female_parrot_name || (detailRecord.female_parrot && detailRecord.female_parrot.name) || '-' }}</el-descriptions-item>
              <el-descriptions-item label="配对日期">{{ formatDate(detailRecord.mating_date) }}</el-descriptions-item>
              <el-descriptions-item label="产蛋日期">{{ formatDate(detailRecord.egg_laying_date) }}</el-descriptions-item>
              <el-descriptions-item label="孵化日期">{{ formatDate(detailRecord.hatching_date) }}</el-descriptions-item>
              <el-descriptions-item label="产蛋数">{{ detailRecord.egg_count ?? '-' }}</el-descriptions-item>
              <el-descriptions-item label="出壳数">{{ detailRecord.chick_count ?? '-' }}</el-descriptions-item>
              <el-descriptions-item label="成功率">{{ detailRecord.success_rate !== undefined && detailRecord.success_rate !== null ? detailRecord.success_rate + '%' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="备注" v-if="detailRecord.notes">{{ detailRecord.notes }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="oplogs-section">
            <div class="oplogs-title">操作日志</div>
            <div v-if="detailOperationLogs && detailOperationLogs.length" class="oplog-list">
              <div class="oplog-item" v-for="item in detailOperationLogs" :key="item.id">
                <div class="oplog-header">
                  <span class="oplog-action">{{ item.actionText }}</span>
                  <span class="oplog-time">{{ item.timeText }}</span>
                </div>
                <div class="oplog-meta">操作人：{{ item.operatorName || '—' }}</div>
                <div class="oplog-diff" v-if="item.changeLines && item.changeLines.length">
                  <div class="oplog-diff-item" v-for="line in item.changeLines" :key="line">{{ line }}</div>
                </div>
                <div class="oplog-notes" v-if="item.note">{{ item.note }}</div>
              </div>
            </div>
            <div class="oplogs-empty" v-else>暂无操作日志</div>
          </div>
        </div>
        <template #footer>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>

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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Male, Female } from '@element-plus/icons-vue'
import api from '../api/axios'
import ParrotModal from '../components/ParrotModal.vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const id = route.params.id

const loading = ref(true)
const recordsLoading = ref(false)
const parrot = ref({})
const activeTab = ref('基本信息')
const showModal = ref(false)
const showTransferDialog = ref(false)
const transferCode = ref('')
const transferCodeGenerating = ref(false)
const transferTargetId = ref('')
const transferTargetOpenid = ref('')
const transferTargetUsername = ref('')
const transferTargetPhone = ref('')
const transferSubmitting = ref(false)

const feedingRecords = ref([])
const healthRecords = ref([])
const breedingRecords = ref([])

const authStore = useAuthStore()
const teamGroups = ref([])
const groupName = computed(() => {
  const gid = parrot.value && parrot.value.group_id
  if (!gid) return ''
  const list = teamGroups.value || []
  const g = list.find(it => String(it.id) === String(gid))
  return g && (g.name || '') || ''
})

const detailDialogVisible = ref(false)
const detailDialogTitle = computed(() => '记录详情')
const detailLoading = ref(false)
const detailRecordType = ref('')
const detailRecordId = ref(null)
const detailRecord = ref({})
const detailOperationLogs = ref([])
const typeLabelMap = { feeding: '喂食', health: '健康', cleaning: '清洁', breeding: '繁殖' }
const detailTypeLabel = computed(() => typeLabelMap[detailRecordType.value] || '')
const detailParrotName = computed(() => {
  const r = detailRecord.value || {}
  return r.parrot_name || (r.parrot && r.parrot.name) || ''
})
const detailRecorderName = computed(() => {
  const r = detailRecord.value || {}
  const nick = r.created_by_nickname || (r.created_by && r.created_by.nickname) || ''
  if (nick) return nick
  return r.created_by_username || (r.created_by && r.created_by.username) || ''
})
const detailAmountText = computed(() => {
  const r = detailRecord.value || {}
  const unit = (r.feed_type && r.feed_type.unit) || r.amountUnit || 'g'
  return r.amount !== undefined && r.amount !== null ? `${r.amount}${unit}` : '-'
})
const detailDisplayTime = computed(() => {
  const r = detailRecord.value || {}
  const t = r.record_time || r.feeding_time || r.record_date || r.cleaning_time || r.created_at || ''
  return formatDate(t)
})

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

const decorateColorForDisplay = (speciesName, name) => {
  const s = String(speciesName || '')
  const n = String(name || '')
  if (s === '牡丹鹦鹉') {
    if (n === '黄边桃' || n.includes('蓝腰黄桃')) return '黄边桃(蓝腰黄桃)'
  }
  return n
}

const loadTeamGroups = async () => {
  try {
    const teamId = authStore.user && authStore.user.current_team_id
    if (!teamId) { teamGroups.value = []; return }
    const r = await api.get(`/teams/${teamId}/groups`)
    const data = r.data && (r.data.data || r.data)
    const arr = (data && (data.groups || data.items)) || (Array.isArray(data) ? data : [])
    teamGroups.value = Array.isArray(arr) ? arr : []
  } catch (_) {
    teamGroups.value = []
  }
}

const getOwnerName = (p) => {
  if (!p) return ''
  const o = p.owner || {}
  return p.owner_name || o.nickname || o.username || o.account_username || ''
}

const reload = async () => {
  await fetchParrot()
  await fetchTabRecords()
}

const openEdit = () => { showModal.value = true }
const openTransfer = () => { showTransferDialog.value = true }

const handleRowClick = (row) => {
  const tab = activeTab.value
  let type = ''
  if (tab === '喂食记录') type = 'feeding'
  else if (tab === '健康档案') type = 'health'
  else if (tab === '繁殖记录') type = 'breeding'
  if (!type || !row || !row.id) return
  openDetail(row, type)
}

const openDetail = async (row, type) => {
  const id = row && row.id
  if (!id) return
  detailRecordType.value = type
  detailRecordId.value = id
  detailDialogVisible.value = true
  await fetchDetailRecord()
  await fetchOperationLogs()
}

const fetchDetailRecord = async () => {
  detailLoading.value = true
  try {
    const url = `/records/${detailRecordType.value}/${detailRecordId.value}`
    const res = await api.get(url)
    if (res.data && res.data.success) {
      detailRecord.value = res.data.data || {}
    } else {
      detailRecord.value = {}
    }
  } catch (_) {
    detailRecord.value = {}
  } finally {
    detailLoading.value = false
  }
}

const mapActionToCN = (s) => {
  const v = String(s || '').toLowerCase()
  if (v.includes('create') || v === 'created') return '创建'
  if (v.includes('update') || v.includes('edit')) return '编辑'
  if (v.includes('delete')) return '删除'
  if (v.includes('transfer')) return '过户'
  if (v.includes('feed')) return '喂食'
  if (v.includes('clean')) return '清洁'
  if (v.includes('health')) return '健康检查'
  if (v.includes('breed')) return '繁殖'
  return '操作'
}

const formatOperationLogTime = (t) => {
  if (!t) return ''
  return formatDate(t)
}

const formatChangeSummary = (it, type, record) => {
  return []
}

const deriveOperationLogs = (record) => {
  const logs = []
  const cAt = record.created_at || ''
  const uAt = record.updated_at || ''
  const cBy = record.created_by_nickname || (record.created_by && record.created_by.nickname) || record.created_by_username || (record.created_by && record.created_by.username) || ''
  const uBy = record.updated_by_nickname || (record.updated_by && record.updated_by.nickname) || record.updated_by_username || (record.updated_by && record.updated_by.username) || ''
  const dcText = formatOperationLogTime(cAt)
  const duText = formatOperationLogTime(uAt)
  const rid = record.id || ''
  if (dcText) logs.push({ id: `created-${cAt}-${cBy}-${rid}`, actionText: '创建', operatorName: cBy, timeText: dcText, note: '', changeLines: [] })
  if (duText && (!dcText || duText !== dcText)) logs.push({ id: `updated-${uAt}-${uBy}-${rid}`, actionText: '编辑', operatorName: (uBy || cBy), timeText: duText, note: '', changeLines: [] })
  return logs
}

const fetchOperationLogs = async () => {
  try {
    const type = detailRecordType.value
    const id = detailRecordId.value
    const tryEndpoints = [
      `/records/${type}/${id}/operations`,
      `/records/${type}/${id}/logs`,
      `/records/${type}/${id}/history`,
      `/records/${type}/operations?id=${encodeURIComponent(id)}`,
      `/records/operations?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    ]
    let list = []
    for (let i = 0; i < tryEndpoints.length; i++) {
      const url = tryEndpoints[i]
      try {
        const res = await api.get(url)
        if (res.data && res.data.success) {
          const raw = (res.data.data && (res.data.data.operations || res.data.data.logs || res.data.data.items)) || (Array.isArray(res.data.data) ? res.data.data : [])
          if (Array.isArray(raw) && raw.length) { list = raw; break }
        }
      } catch (_) {}
    }
    const mapped = (list || []).map(it => {
      const actionRaw = String(it.action || it.operation || it.type || it.event || '').toLowerCase()
      const actionText = mapActionToCN(actionRaw)
      let operatorName = (
        it.operator_nickname ||
        (it.operator && it.operator.nickname) ||
        it.created_by_nickname ||
        it.updated_by_nickname ||
        it.operator_name ||
        (it.operator && it.operator.name) ||
        it.created_by_name ||
        it.updated_by_name ||
        (it.operator && it.operator.username) ||
        it.created_by_username ||
        it.updated_by_username ||
        ''
      )
      operatorName = String(operatorName || '').trim()
      if (!operatorName) {
        const r = detailRecord.value || {}
        operatorName = String(
          r.created_by_nickname || (r.created_by && r.created_by.nickname) || ''
        ).trim()
      }
      const t = it.time || it.created_at || it.updated_at || it.operation_time || it.record_time || ''
      const timeText = formatOperationLogTime(t)
      const note = it.note || it.notes || it.description || ''
      const changeLines = formatChangeSummary(it, type, detailRecord.value || {})
      return { id: it.id || `${actionRaw}-${t}-${operatorName}`, actionText, operatorName, timeText, note, changeLines }
    })
    if (mapped.length) {
      detailOperationLogs.value = mapped
    } else {
      detailOperationLogs.value = deriveOperationLogs(detailRecord.value || {})
    }
  } catch (_) {
    detailOperationLogs.value = deriveOperationLogs(detailRecord.value || {})
  }
}

const fetchParrot = async () => {
  loading.value = true
  try {
    const [detail, stats, recent] = await Promise.all([
      api.get(`/parrots/${id}`),
      api.get(`/parrots/${id}/statistics`).catch(() => ({ data: {} })),
      api.get(`/parrots/${id}/records`, { params: { limit: 5 } }).catch(() => ({ data: {} }))
    ])
    const d = detail.data && (detail.data.data || detail.data)
    parrot.value = d || {}
    // optional: use stats/recent if needed later
  } catch (e) {
  } finally {
    loading.value = false
  }
}

const onTabChange = async () => { await fetchTabRecords() }

const fetchTabRecords = async () => {
  recordsLoading.value = true
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
  } catch (e) {
  } finally {
    recordsLoading.value = false
  }
}

onMounted(async () => {
  await fetchParrot()
  await fetchTabRecords()
  await loadTeamGroups()
})

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
  if (e && e.target) {
    e.target.src = getRandomAvatar(parrot.value.id)
  }
}

const formatFeedTypes = (types) => {
  if (Array.isArray(types)) return types.map(t => t.name || t).join('、')
  return String(types || '')
}

const generateTransferCode = async () => {
  if (transferCodeGenerating.value) return
  try {
    transferCodeGenerating.value = true
    const res = await api.post(`/parrots/${id}/transfer/code`)
    if (res && res.data && res.data.success && res.data.data && res.data.data.code) {
      transferCode.value = res.data.data.code
      ElMessage.success('生成成功')
    } else {
      ElMessage.error((res && res.data && res.data.message) || '生成失败')
    }
  } catch (e) {
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    transferCodeGenerating.value = false
  }
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
  } catch (_) {
    ElMessage.error('复制失败，请重试')
  }
}

const submitTransfer = async () => {
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
    } else {
      ElMessage.error((res && res.data && res.data.message) || '过户失败')
    }
  } catch (e) {
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    transferSubmitting.value = false
  }
}
</script>

<style scoped>
.parrot-detail-container { padding-bottom: 20px; }
.header-buttons { display: flex; gap: 8px; }
.info-card { display: flex; gap: 16px; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 16px; }
.avatar-col { flex: 0 0 auto; }
.detail-avatar { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; }
.info-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
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

.basic-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.basic-item { display: flex; gap: 12px; }
.basic-item .label { width: 96px; color: #909399; }
.basic-item .value { flex: 1; color: var(--text-primary); }
.basic-item.span-2 { grid-column: 1 / span 2; }

.loading-container { background: #fff; border-radius: 12px; padding: 16px; }

.transfer-section { margin-top: 8px; padding-top: 8px; }
.section-title { font-size: 14px; color: #606266; margin-bottom: 8px; }
.code-box { display: flex; align-items: center; justify-content: center; background: #f5f7fa; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.code-text { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
.actions-row { display: flex; gap: 8px; }
.header-buttons :deep(.el-button),
.actions-row :deep(.el-button) { border-radius: var(--border-radius-lg) !important; }

.detail-loading { padding: 24px; text-align: center; color: #909399; }
.detail-section { margin-top: 16px; }
.photos-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.photo-item { width: 100%; height: 88px; border-radius: 6px; overflow: hidden; }
.oplogs-section { margin-top: 16px; }
.oplogs-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.oplog-list { display: flex; flex-direction: column; gap: 12px; }
.oplog-item { padding: 12px; border: 1px solid #ebeef5; border-radius: 8px; }
.oplog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.oplog-action { color: #409eff; font-weight: 600; }
.oplog-time { color: #909399; }
.oplog-meta { color: #606266; margin-bottom: 6px; }
.oplog-diff-item { color: #606266; }
.oplog-notes { color: #303133; }
.oplogs-empty { color: #909399; }
</style>
