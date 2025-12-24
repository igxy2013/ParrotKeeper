<template>
  <div class="incubation-view">
    <div class="header">
      <h2>人工孵化</h2>
      <el-button type="primary" @click="openAddEgg">
        <el-icon><Plus /></el-icon> 新增孵化
      </el-button>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && eggs.length === 0" description="暂无孵化记录" />
      
      <el-row :gutter="20" v-else>
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="egg in eggs" :key="egg.id" class="mb-4">
          <el-card shadow="hover" class="egg-card" @click="openDetail(egg)">
            <template #header>
              <div class="card-header">
                <div class="card-title">
                  <span class="egg-label">{{ egg.label || ('蛋 ' + egg.id) }}</span>
                  <span class="egg-species">{{ egg.species_name || '未设置品种' }}</span>
                </div>
                <el-tag :type="getStatusType(egg.status)">{{ egg.status_text || getStatusText(egg.status) }}</el-tag>
              </div>
            </template>
            <div class="card-content">
              <p><span class="label">开始孵化:</span> {{ egg.incubator_start_datetime_text || egg.incubator_start_date_text || '未设置' }}</p>
              <p><span class="label">天数:</span> {{ egg.day_since_start_text || computeDaysHoursText(egg.incubator_start_date) }}</p>
              <p><span class="label">品种:</span> {{ egg.species_name || '未设置' }}</p>
              <p v-if="egg.hatch_date"><span class="label">出壳日期:</span> {{ formatDate(egg.hatch_date) }}</p>
            </div>
            <div class="card-actions" @click.stop>
              <el-button link class="card-link primary-link" @click="openDetail(egg)">详情</el-button>
              <el-button link class="card-link primary-link" @click="openEditEgg(egg)">编辑</el-button>
              <el-popconfirm title="确定删除这个记录吗？" @confirm="deleteEgg(egg.id)">
                <template #reference>
                  <el-button link class="card-link danger-link">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Add/Edit Egg Dialog -->
    <el-dialog
      v-model="showEggDialog"
      :title="editingEgg ? '编辑孵化记录' : '新增孵化记录'"
      width="500px"
    >
      <el-form :model="eggForm" label-width="100px">
        <el-form-item label="标签">
          <el-input v-model="eggForm.label" placeholder="如 A1" />
        </el-form-item>
        <el-form-item label="产蛋日期">
          <el-date-picker v-model="eggForm.laid_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="开始孵化">
          <el-date-picker v-model="eggForm.incubator_start_date" type="datetime" placeholder="选择日期时间" value-format="YYYY-MM-DD HH:mm" />
        </el-form-item>
        <el-form-item label="品种">
          <el-select v-model="eggForm.species_id" placeholder="选择品种" filterable>
            <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="editingEgg">
          <el-select v-model="eggForm.status">
            <el-option label="孵化中" value="incubating" />
            <el-option label="已出壳" value="hatched" />
            <el-option label="停止发育" value="stopped" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="出壳日期" v-if="eggForm.status === 'hatched'">
           <el-date-picker v-model="eggForm.hatch_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEggDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEgg">保存</el-button>
      </template>
    </el-dialog>

    <!-- Detail Drawer -->
    <el-drawer
      v-model="showDetailDrawer"
      title="孵化详情"
      size="50%"
      direction="rtl"
      destroy-on-close
    >
      <div v-if="currentDetailEgg" class="detail-container">
        <!-- Top Info -->
        <div class="detail-header">
          <el-descriptions border>
            <el-descriptions-item label="标签">{{ currentDetailEgg.label || ('蛋 ' + currentDetailEgg.id) }}</el-descriptions-item>
            <el-descriptions-item label="品种">{{ currentDetailEgg.species_name }}</el-descriptions-item>
            <el-descriptions-item label="状态">
               <el-tag :type="getStatusType(currentDetailEgg.status)">{{ getStatusText(currentDetailEgg.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="入孵日期">{{ currentDetailEgg.incubator_start_datetime_text || formatDate(currentDetailEgg.incubator_start_date) }}</el-descriptions-item>
            <el-descriptions-item label="天数">{{ computeDaysHoursText(currentDetailEgg.incubator_start_date) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- Calendar & Advice Section -->
        <el-row :gutter="20" class="mt-4">
          <el-col :span="14">
            <el-card header="孵化日历" class="calendar-card">
              <el-calendar v-model="calendarDate">
                <template #header>
                  <div class="calendar-nav">
                    <div class="calendar-nav-left">
                      <el-button text type="primary" size="small" @click="handleCalendarMonthChange(-1)">上月</el-button>
                      <span class="calendar-month-text">{{ formatMonth(calendarDate) }}</span>
                      <el-button text type="primary" size="small" @click="handleCalendarMonthChange(1)">下月</el-button>
                    </div>
                    <el-button text size="small" @click="goToday">回到今天</el-button>
                  </div>
                </template>
                <template #date-cell="{ data }">
                  <div
                    class="calendar-cell"
                    :class="getCalendarCellClasses(data.date, data.isSelected)"
                  >
                    <div class="date-num">{{ data.date.getDate() }}</div>
                    <div class="indicators">
                      <span v-if="hasLog(data.date)" class="dot log-dot"></span>
                      <span v-if="isCandlingDay(data.date)" class="badge candling-badge">照</span>
                      <span v-if="isTurningDay(data.date)" class="badge turning-badge">翻</span>
                    </div>
                  </div>
                </template>
              </el-calendar>
              <div class="calendar-legend">
                <div class="legend-item">
                  <span class="legend-swatch swatch-incubating"></span>
                  <span>孵化期</span>
                </div>
                <div class="legend-item">
                  <span class="legend-swatch swatch-today"></span>
                  <span>今天</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot dot-log"></span>
                  <span>有日志</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot dot-turning"></span>
                  <span>翻蛋日</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot dot-candling"></span>
                  <span>照蛋日</span>
                </div>
                <div class="legend-item">
                  <span class="legend-swatch swatch-hatch"></span>
                  <span>出壳日</span>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card class="advice-card">
              <template #header>
                <div class="card-header">
                  <span>{{ formatDate(calendarDate) }} (第 {{ currentDayIndex }} 天)</span>
                </div>
              </template>
              <div v-if="adviceLoading" class="loading-box">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else class="advice-content">
                <div v-if="hasHatched && adviceAfterHatch" class="after-hatch">
                  已出雏，无需孵化建议。
                </div>
                <div v-else>
                  <div v-if="!speciesSupported" class="species-warning">
                    当前孵化建议仅支持：玄凤鹦鹉、牡丹鹦鹉、亚马逊鹦鹉、金刚鹦鹉、非洲灰鹦鹉、折衷鹦鹉
                  </div>
                  <div class="advice-item">
                    <span class="label">温度范围:</span>
                    <span class="value">{{ advice.temp_range || '—' }}</span>
                  </div>
                  <div class="advice-item">
                    <span class="label">湿度范围:</span>
                    <span class="value">{{ advice.hum_range || '—' }}</span>
                  </div>
                  <div class="advice-item">
                    <span class="label">翻蛋建议:</span>
                    <span class="value">{{ advice.turning || '—' }}</span>
                  </div>
                  <div class="advice-item">
                    <span class="label">照蛋建议:</span>
                    <span class="value">{{ advice.candling || '—' }}</span>
                  </div>
                  <div class="tips-section" v-if="advice.tips && advice.tips.length">
                    <div class="label">注意事项:</div>
                    <ul>
                      <li v-for="(tip, idx) in advice.tips" :key="idx">{{ tip }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </el-card>
            <el-card class="mt-4" header="孵化记录">
               <el-form :model="logForm" label-width="70px" size="small">
                 <el-row :gutter="10">
                   <el-col :span="12">
                     <el-form-item label="记录日期">
                       <el-date-picker
                         v-model="logForm.log_date"
                         type="date"
                         placeholder="日期"
                         value-format="YYYY-MM-DD"
                         style="width: 100%"
                       />
                     </el-form-item>
                   </el-col>
                   <el-col :span="6">
                     <el-form-item label="照蛋" label-width="40px">
                       <el-switch v-model="logForm.candling" />
                     </el-form-item>
                   </el-col>
                   <el-col :span="6">
                     <el-form-item label="出雏" label-width="40px">
                       <el-switch v-model="logForm.hatchToday" />
                     </el-form-item>
                   </el-col>
                 </el-row>
                 <el-row :gutter="10">
                   <el-col :span="12">
                     <el-form-item label="温度">
                       <el-input v-model="logForm.temperature" placeholder="℃" />
                     </el-form-item>
                   </el-col>
                   <el-col :span="12">
                     <el-form-item label="湿度">
                       <el-input v-model="logForm.humidity" placeholder="%" />
                     </el-form-item>
                   </el-col>
                 </el-row>
                 <el-form-item label="备注">
                   <el-input v-model="logForm.notes" type="textarea" :rows="1" />
                 </el-form-item>
                 <div class="text-right">
                   <el-button type="primary" size="small" @click="saveLog">保存</el-button>
                 </div>
               </el-form>
            </el-card>
          </el-col>
        </el-row>

        <!-- Logs Table -->
        <div class="logs-section mt-4">
           <h3>孵化日志</h3>
           <el-table :data="sortedLogs" style="width: 100%" stripe>
            <el-table-column prop="log_date" label="日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.log_date) }}
              </template>
            </el-table-column>
             <el-table-column prop="temperature_c" label="温度(°C)" width="100" />
             <el-table-column prop="humidity_pct" label="湿度(%)" width="100" />
             <el-table-column prop="notes" label="备注" />
             <el-table-column label="操作" width="100">
               <template #default="scope">
                  <el-button type="danger" link size="small" @click="deleteLog(scope.row.id)">删除</el-button>
               </template>
             </el-table-column>
           </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'

// --- State ---
const loading = ref(false)
const eggs = ref([])
const speciesList = ref([])

// Dialog State
const showEggDialog = ref(false)
const editingEgg = ref(null)
const eggForm = reactive({
  label: '',
  laid_date: '',
  incubator_start_date: '',
  species_id: '',
  status: 'incubating',
  hatch_date: ''
})

// Detail Drawer State
const showDetailDrawer = ref(false)
const currentDetailEgg = ref(null)
const calendarDate = ref(new Date())
const calendarData = ref({}) // Stores turning_dates, candling_dates, etc.
const logs = ref([])
const advice = ref({})
const adviceLoading = ref(false)

// Log Form State
const logForm = reactive({
  log_date: '',
  temperature: '',
  humidity: '',
  candling: false,
  notes: '',
  hatchToday: false
})

// --- Computed ---
const currentDayIndex = computed(() => {
  if (!currentDetailEgg.value || !currentDetailEgg.value.incubator_start_date) return 0
  const start = new Date(currentDetailEgg.value.incubator_start_date)
  const current = new Date(calendarDate.value)
  // Normalize to start of day
  start.setHours(0,0,0,0)
  current.setHours(0,0,0,0)
  
  const diffTime = current - start
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 0 ? diffDays : 0
})

const sortedLogs = computed(() => {
  return [...logs.value].sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
})

const supportedSpeciesNames = [
  '玄凤鹦鹉',
  '牡丹鹦鹉',
  '亚马逊鹦鹉',
  '金刚鹦鹉',
  '非洲灰鹦鹉',
  '折衷鹦鹉'
]

const speciesSupported = computed(() => {
  if (!currentDetailEgg.value || !currentDetailEgg.value.species_name) return false
  return supportedSpeciesNames.includes(currentDetailEgg.value.species_name)
})

const hasHatched = computed(() => {
  return !!(currentDetailEgg.value && currentDetailEgg.value.hatch_date)
})

const adviceAfterHatch = computed(() => {
  if (!hasHatched.value || !currentDetailEgg.value) return false
  const hatchStr = formatDate(currentDetailEgg.value.hatch_date)
  const curStr = formatDate(calendarDate.value)
  if (!hatchStr || !curStr) return false
  return curStr >= hatchStr
})

// --- Methods ---

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

const formatDateTimeText = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace('T', ' ').replace(/-/g, '/'))
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${dd} ${hh}:${mm}`
}

const formatMonth = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}年${m}月`
}

const computeDaysHoursText = (dStr) => {
  if (!dStr) return '--'
  const s = String(dStr)
  let dt = new Date(s.replace(/-/g, '/').replace('T', ' '))
  if (isNaN(dt.getTime())) dt = new Date(s)
  if (isNaN(dt.getTime())) return '--'
  const now = new Date()
  const ms = now.getTime() - dt.getTime()
  if (ms < 0) return '0天0小时'
  const days = Math.floor(ms / 86400000) + 1
  const hours = Math.floor((ms % 86400000) / 3600000)
  return `${days}天${hours}小时`
}

const handleCalendarMonthChange = (delta) => {
  const current = new Date(calendarDate.value)
  if (isNaN(current.getTime())) return
  current.setMonth(current.getMonth() + delta)
  calendarDate.value = current
}

const goToday = () => {
  calendarDate.value = new Date()
}

const getStatusText = (status) => {
  const map = {
    'incubating': '孵化中',
    'hatched': '已出壳',
    'stopped': '停止发育',
    'failed': '失败'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    'incubating': 'primary',
    'hatched': 'success',
    'stopped': 'warning',
    'failed': 'danger'
  }
  return map[status] || 'info'
}

// --- API Calls ---

const fetchEggs = async () => {
  loading.value = true
  try {
    const res = await api.get('/incubation/eggs')
    const items = (res.data && res.data.data && res.data.data.items) || []
    const mapped = items.map(it => {
      const speciesName = (it && it.species && it.species.name) ? it.species.name : (it && it.species_name) || ''
      return {
        ...it,
        species_name: speciesName,
        incubator_start_datetime_text: formatDateTimeText(it && it.incubator_start_date)
      }
    })
    eggs.value = mapped
  } catch (e) {
    ElMessage.error('获取孵化列表失败')
  } finally {
    loading.value = false
  }
}

const fetchSpecies = async () => {
  try {
    const res = await api.get('/parrots/species')
    if (res.data && res.data.success) {
      speciesList.value = res.data.data || []
    } else {
      speciesList.value = []
    }
  } catch (e) {
    // Silent fail
  }
}

const openAddEgg = () => {
  editingEgg.value = null
  eggForm.label = ''
  eggForm.laid_date = ''
  eggForm.incubator_start_date = formatDateTimeText(new Date())
  eggForm.species_id = ''
  eggForm.status = 'incubating'
  eggForm.hatch_date = ''
  showEggDialog.value = true
}

const openEditEgg = (egg) => {
  editingEgg.value = egg
  eggForm.label = egg.label || ''
  eggForm.laid_date = formatDate(egg.laid_date)
  eggForm.incubator_start_date = formatDateTimeText(egg.incubator_start_date)
  eggForm.species_id = egg.species_id || (egg.species && egg.species.id) || ''
  eggForm.status = egg.status
  eggForm.hatch_date = formatDate(egg.hatch_date)
  showEggDialog.value = true
}

const saveEgg = async () => {
  try {
    const payload = { ...eggForm }
    if (editingEgg.value) {
      await api.put(`/incubation/eggs/${editingEgg.value.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await api.post('/incubation/eggs', payload)
      ElMessage.success('创建成功')
    }
    showEggDialog.value = false
    fetchEggs()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const deleteEgg = async (id) => {
  try {
    await api.delete(`/incubation/eggs/${id}`)
    ElMessage.success('删除成功')
    fetchEggs()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

// --- Detail Logic ---

const openDetail = async (egg) => {
  currentDetailEgg.value = egg
  showDetailDrawer.value = true
  // Reset
  calendarDate.value = new Date()
  logs.value = []
  advice.value = {}
  calendarData.value = {}
  
  await fetchDetailData(egg.id)
}

const fetchDetailData = async (id) => {
  try {
    // 1. Get Detail & Logs
    const res = await api.get(`/incubation/eggs/${id}`)
    const data = (res.data && res.data.data) ? res.data.data : {}
    if (data.egg) {
      currentDetailEgg.value = { 
        ...data.egg, 
        species_name: data.egg.species ? data.egg.species.name : data.egg.species_name,
        incubator_start_datetime_text: formatDateTimeText(data.egg.incubator_start_date)
      }
    }
    logs.value = data.logs || []
    
    // 2. Get Calendar Data
    const calRes = await api.get(`/incubation/eggs/${id}/calendar`)
    const calData = (calRes.data && calRes.data.data) ? calRes.data.data : {}
    calendarData.value = calData || {}
    
    // 3. Fetch initial advice
    fetchAdvice()
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

const fetchAdvice = async () => {
  if (!currentDetailEgg.value) return
  adviceLoading.value = true
  try {
    const dateStr = formatDate(calendarDate.value)
    logForm.log_date = dateStr
    // Check if after hatch
    let afterHatch = false
    if (currentDetailEgg.value.hatch_date) {
      const hatch = new Date(currentDetailEgg.value.hatch_date)
      const current = new Date(calendarDate.value)
      if (current >= hatch) afterHatch = true
    }
    
    const res = await api.get(`/incubation/eggs/${currentDetailEgg.value.id}/advice`, {
      params: {
        date: dateStr,
        day_index: currentDayIndex.value,
        after_hatch: afterHatch
      }
    })
    const raw = (res.data && res.data.data) || {}
    
    // Transform for display
    const ranges = raw.ranges || {}
    const t = ranges.temperature_c || {}
    const h = ranges.humidity_pct || {}
    
    let tempText = '—'
    if (t.low && t.high) tempText = `${t.low} ~ ${t.high}°C`
    else if (t.target) tempText = `${t.target}°C`
    
    let humText = '—'
    if (h.low && h.high) humText = `${h.low} ~ ${h.high}%`
    
    advice.value = {
      temp_range: tempText,
      hum_range: humText,
      turning: raw.should_turn ? '需要翻蛋' : '无需翻蛋',
      candling: raw.should_candle ? '建议照蛋' : '无需照蛋',
      tips: raw.tips || []
    }

    const log = logs.value.find(l => formatDate(l.log_date) === dateStr)
    if (log) {
      logForm.temperature = log.temperature_c
      logForm.humidity = log.humidity_pct
      logForm.notes = log.notes
      logForm.candling = !!(log.candling || log.is_candling)
    } else {
      logForm.temperature = ''
      logForm.humidity = ''
      logForm.notes = ''
      logForm.candling = false
    }
    logForm.hatchToday = false

  } catch (e) {
    console.error(e)
  } finally {
    adviceLoading.value = false
  }
}

// Watch calendar date change
watch(calendarDate, () => {
  fetchAdvice()
})

// --- Calendar Helpers ---
const getCalendarCellClasses = (date, isSelected) => {
  const classes = {}
  const dateStr = formatDate(date)
  const todayStr = formatDate(new Date())

  if (!dateStr) return classes

  if (hasLog(date)) {
    classes['has-log'] = true
  }

  if (currentDetailEgg.value && currentDetailEgg.value.incubator_start_date) {
    const startStr = formatDate(currentDetailEgg.value.incubator_start_date)
    if (startStr) {
      const start = new Date(`${startStr}T00:00:00`)
      const cell = new Date(`${dateStr}T00:00:00`)
      let inRange = cell >= start

      if (currentDetailEgg.value.hatch_date) {
        const hatchStr = formatDate(currentDetailEgg.value.hatch_date)
        if (hatchStr) {
          const hatch = new Date(`${hatchStr}T00:00:00`)
          if (cell > hatch) {
            inRange = false
          }
          if (cell.getTime() === hatch.getTime()) {
            classes['hatch'] = true
          }
        }
      }

      if (inRange) {
        classes['incubating'] = true
      }
    }
  }

  if (dateStr === todayStr) {
    classes['today'] = true
  }

  if (isSelected) {
    classes['selected'] = true
  }

  return classes
}

const hasLog = (date) => {
  const dateStr = formatDate(date)
  return logs.value.some(l => formatDate(l.log_date) === dateStr)
}

const isCandlingDay = (date) => {
  const dateStr = formatDate(date)
  const list = calendarData.value.candling_dates || []
  return list.some(d => formatDate(d) === dateStr)
}

const isTurningDay = (date) => {
  const dateStr = formatDate(date)
  const list = calendarData.value.turning_dates || []
  return list.some(d => formatDate(d) === dateStr)
}

// --- Log Operations ---
const saveLog = async () => {
  if (!currentDetailEgg.value) return
  const dateStr = logForm.log_date || formatDate(calendarDate.value)
  if (!dateStr) {
    ElMessage.error('请选择记录日期')
    return
  }
  
  // Check if log exists
  const existingLog = logs.value.find(l => formatDate(l.log_date) === dateStr)
  
  const payload = {
    log_date: dateStr,
    temperature_c: logForm.temperature === '' ? null : logForm.temperature,
    humidity_pct: logForm.humidity === '' ? null : logForm.humidity,
    notes: logForm.notes,
    is_candling: logForm.candling || false
  }

  if (logForm.candling) {
    payload.candling = true
  }
  
  try {
    if (existingLog) {
      await api.put(`/incubation/logs/${existingLog.id}`, payload)
      ElMessage.success('日志更新成功')
    } else {
      await api.post(`/incubation/eggs/${currentDetailEgg.value.id}/logs`, payload)
      ElMessage.success('日志添加成功')
    }

    if (logForm.hatchToday) {
      const todayStr = formatDate(new Date())
      try {
        await api.put(`/incubation/eggs/${currentDetailEgg.value.id}`, { hatch_date: todayStr })
      } catch (e) {
        ElMessage.error('更新出壳日期失败')
      }
    }

    await fetchDetailData(currentDetailEgg.value.id)
  } catch (e) {
    console.error(e)
    const msg = e.response?.data?.message || '操作失败'
    ElMessage.error(msg)
  }
}

const deleteLog = async (logId) => {
   try {
     // Assuming API
     await api.delete(`/incubation/logs/${logId}`)
     ElMessage.success('删除成功')
     fetchDetailData(currentDetailEgg.value.id)
   } catch (e) {
     ElMessage.error('删除失败')
   }
}

// --- Lifecycle ---
onMounted(() => {
  fetchEggs()
  fetchSpecies()
})

</script>

<style scoped>
.incubation-view {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.mb-4 {
  margin-bottom: 20px;
}
.egg-card {
  height: 100%;
  cursor: pointer;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  display: flex;
  flex-direction: column;
}
.egg-label {
  font-weight: 600;
}
.egg-species {
  font-size: 12px;
  color: #6b7280;
}
.species-name {
  font-weight: bold;
  font-size: 16px;
}
.card-content {
  color: #606266;
  font-size: 14px;
}
.card-content p {
  margin: 8px 0;
}
.label {
  color: #909399;
  margin-right: 8px;
}
.card-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.card-link {
  padding: 0 4px;
  font-size: 13px;
}
.card-link.primary-link {
  color: #059669 !important;
}
.card-link.danger-link {
  color: #ef4444 !important;
}
.card-link.primary-link:hover {
  color: #10b981 !important;
}
.card-link.danger-link:hover {
  color: #dc2626 !important;
}

/* Detail Styles */
.detail-container {
  padding: 0 10px;
}
.detail-header {
  margin-bottom: 10px;
}
.calendar-card {
  margin-bottom: 10px;
}
:deep(.el-calendar__body) {
  padding: 12px 20px 16px;
}
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.calendar-nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.calendar-nav-left :deep(.el-button.is-text) {
  color: #ffffff !important;
}
.calendar-nav-left :deep(.el-button.is-text:hover) {
  color: #ffffff !important;
}
.calendar-month-text {
  font-weight: 600;
}
/* Compact Calendar Styles */
:deep(.el-calendar-table .el-calendar-day) {
  height: 60px !important;
  padding: 0 !important;
  overflow: visible !important;
}

.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 2px;
  position: relative;
}
.calendar-cell.incubating {
  background: #fff7ed;
  color: #c2410c;
}
.calendar-cell.has-log {
  background: #ecfdf5;
  color: #047857;
}
.calendar-cell.incubating.has-log {
  background: linear-gradient(135deg, #fff7ed 0%, #ecfdf5 100%);
}
.calendar-cell.today {
  background: #10b981;
  color: #fff;
}
.calendar-cell.hatch {
  background: #8b5cf6;
  color: #fff;
}
.calendar-cell.selected {
  box-shadow: 0 0 0 2px #10b981 inset;
  z-index: 2;
}
.date-num {
  font-weight: bold;
  font-size: 14px;
  line-height: 1.2;
}
.indicators {
  margin-top: 2px;
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.log-dot {
  background-color: #409EFF;
}
.badge {
  font-size: 10px;
  padding: 1px 3px;
  border-radius: 4px;
  color: #fff;
}
.candling-badge {
  background-color: #E6A23C;
}
.turning-badge {
  background-color: #67C23A;
}

.calendar-legend {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: #4b5563;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-swatch {
  width: 16px;
  height: 10px;
  border-radius: 4px;
}
.swatch-incubating {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}
.swatch-today {
  background: #10b981;
}
.swatch-hatch {
  background: #8b5cf6;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.legend-dot.dot-log {
  background-color: #409EFF;
}
.legend-dot.dot-turning {
  background-color: #67C23A;
}
.legend-dot.dot-candling {
  background-color: #E6A23C;
}

.advice-content {
  font-size: 14px;
}
.advice-item {
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed #eee;
  padding-bottom: 5px;
}
.advice-item .value {
  font-weight: bold;
  color: #409EFF;
}
.tips-section {
  margin-top: 15px;
  background: #fdf6ec;
  padding: 10px;
  border-radius: 4px;
  color: #e6a23c;
}
.tips-section ul {
  padding-left: 20px;
  margin: 5px 0 0 0;
}

.species-warning {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
}

.after-hatch {
  padding: 12px 10px;
  border-radius: 4px;
  background: #ecfdf5;
  color: #047857;
  font-size: 14px;
}

.text-right {
  text-align: right;
  margin-top: 10px;
}
</style>
