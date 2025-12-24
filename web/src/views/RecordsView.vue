<template>
  <div>
    <div class="header-actions">
      <h2>记录</h2>
      <el-button type="primary" :icon="Plus" @click="openAddDialog">添加记录</el-button>
    </div>
    <div class="toolbar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="filter-item"
        @change="handleFilterChange"
      />
      <el-select
        v-model="selectedParrotId"
        placeholder="全部鹦鹉"
        clearable
        filterable
        class="filter-item"
        @change="handleFilterChange"
      >
        <el-option :label="'全部鹦鹉'" :value="null" />
        <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-input
        v-model="searchQuery"
        placeholder="搜索鹦鹉名称、鹦鹉编号、脚环号或备注"
        class="search-input"
        @input="handleSearch"
      />
      <div class="toolbar-right">
        <el-button @click="refresh" :loading="loading">刷新</el-button>
      </div>
    </div>
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="喂食" name="feeding">
        <el-table :data="feedingRecordsFiltered" v-loading="loading">
          <el-table-column prop="feeding_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.feeding_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="feed_type_name" label="食物类型" width="180">
            <template #default="scope">{{ scope.row.feed_type?.name || scope.row.feed_type_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="amount" label="数量" width="120">
            <template #default="scope">{{ scope.row.amount ? scope.row.amount + (scope.row.feed_type?.unit || 'g') : '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="健康" name="health">
        <el-table :data="healthRecordsFiltered" v-loading="loading">
          <el-table-column prop="record_date" label="日期" width="120">
             <template #default="scope">
              {{ formatDate(scope.row.record_date, 'YYYY-MM-DD') }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="weight" label="体重(g)" width="120">
            <template #default="scope">{{ scope.row.weight ? scope.row.weight + ' g' : '-' }}</template>
          </el-table-column>
          <el-table-column prop="health_status" label="状态" width="120">
             <template #default="scope">
                <el-tag :type="getHealthType(scope.row.health_status)">{{ getHealthLabel(scope.row.health_status) }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="清洁" name="cleaning">
        <el-table :data="cleaningRecordsFiltered" v-loading="loading">
          <el-table-column prop="cleaning_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.cleaning_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="cleaning_type_text" label="类型" width="180">
            <template #default="scope">{{ scope.row.cleaning_type_text || scope.row.cleaning_type || '-' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="繁殖" name="breeding">
        <el-table :data="breedingRecordsFiltered" v-loading="loading">
          <el-table-column prop="mating_date" label="配对日期" width="140">
            <template #default="scope">{{ formatDate(scope.row.mating_date, 'YYYY-MM-DD') }}</template>
          </el-table-column>
          <el-table-column prop="male_parrot_name" label="公鸟" width="160">
            <template #default="scope">{{ scope.row.male_parrot?.name || scope.row.male_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="female_parrot_name" label="母鸟" width="160">
            <template #default="scope">{{ scope.row.female_parrot?.name || scope.row.female_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="egg_count" label="产蛋数" width="100" />
          <el-table-column prop="chick_count" label="雏鸟数" width="100" />
          <el-table-column prop="success_rate" label="成功率(%)" width="120">
            <template #default="scope">{{ scope.row.success_rate ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-pagination
      v-if="total > 0"
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="handlePageChange"
      class="pagination"
    />

    <el-dialog
      v-model="addDialogVisible"
      :title="addDialogTitle"
      width="640px"
    >
      <el-form :model="addForm" label-width="96px">
        <el-form-item label="记录类型">
          <el-radio-group v-model="addFormType" @change="onAddTypeChange">
            <el-radio-button label="feeding">喂食</el-radio-button>
            <el-radio-button label="cleaning">清洁</el-radio-button>
            <el-radio-button label="health">健康</el-radio-button>
            <el-radio-button label="breeding">繁殖</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="addFormType === 'breeding'" label="公鸟" required>
          <el-select
            v-model="addForm.male_parrot_id"
            filterable
            placeholder="选择公鸟"
            style="width: 100%"
          >
            <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="addFormType === 'breeding'" label="母鸟" required>
          <el-select
            v-model="addForm.female_parrot_id"
            filterable
            placeholder="选择母鸟"
            style="width: 100%"
          >
            <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-else label="鹦鹉" required>
          <el-select
            v-model="addForm.parrot_ids"
            :multiple="isMultiParrot"
            filterable
            placeholder="选择鹦鹉"
            style="width: 100%"
          >
            <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="showRecordTimePicker" label="记录时间" required>
          <el-date-picker
            v-model="addFormDateTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择日期时间"
            style="width: 100%"
          />
        </el-form-item>

        <template v-if="addFormType === 'feeding'">
          <el-form-item label="食物类型" required>
            <el-select
              v-model="addForm.food_types"
              multiple
              filterable
              placeholder="选择食物类型"
              style="width: 100%"
            >
              <el-option
                v-for="f in feedTypes"
                :key="f.id"
                :label="f.name"
                :value="f.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            v-for="ftId in addForm.food_types"
            :key="ftId"
            :label="getFeedTypeLabel(ftId)"
          >
            <el-input
              v-model="addForm.food_amounts[ftId]"
              placeholder="输入分量"
            >
              <template #append>{{ getFeedTypeUnit(ftId) }}</template>
            </el-input>
          </el-form-item>
        </template>

        <template v-if="addFormType === 'cleaning'">
          <el-form-item label="清洁类型" required>
            <el-select
              v-model="addForm.cleaning_types"
              multiple
              placeholder="选择清洁类型"
              style="width: 100%"
            >
              <el-option
                v-for="c in cleaningTypeOptions"
                :key="c.value"
                :label="c.label"
                :value="c.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="清洁内容">
            <el-input
              v-model="addForm.description"
              type="textarea"
              rows="3"
              placeholder="例如：清洗笼底、更换饮用水等"
            />
          </el-form-item>
        </template>

        <template v-if="addFormType === 'health'">
          <el-form-item label="健康状态">
            <el-select
              v-model="addForm.health_status"
              placeholder="选择健康状态"
              style="width: 100%"
            >
              <el-option
                v-for="s in healthStatusOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="体重">
            <el-input v-model="addForm.weight" placeholder="输入体重">
              <template #append>g</template>
            </el-input>
          </el-form-item>
          <el-form-item label="检查内容">
            <el-input
              v-model="addForm.description"
              type="textarea"
              rows="3"
              placeholder="记录症状、治疗方案等"
            />
          </el-form-item>
        </template>

        <template v-if="addFormType === 'breeding'">
          <el-form-item label="配对日期">
            <el-date-picker
              v-model="addForm.mating_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择配对日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="产蛋日期">
            <el-date-picker
              v-model="addForm.egg_laying_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择产蛋日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="产蛋数量">
            <el-input v-model="addForm.egg_count" placeholder="输入产蛋数量" />
          </el-form-item>
          <el-form-item label="孵化日期">
            <el-date-picker
              v-model="addForm.hatching_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择孵化日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="雏鸟数量">
            <el-input v-model="addForm.chick_count" placeholder="输入雏鸟数量" />
          </el-form-item>
          <el-form-item label="成功率">
            <el-input v-model="addForm.success_rate" placeholder="输入成功率">
              <template #append>%</template>
            </el-input>
          </el-form-item>
        </template>

        <el-form-item label="备注">
          <el-input
            v-model="addForm.notes"
            type="textarea"
            rows="3"
            placeholder="可记录补充说明，例如喂食偏好、健康观察等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addSubmitting" @click="submitAdd">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '../api/axios'

const activeTab = ref('feeding')
const loading = ref(false)
const feedingRecords = ref([])
const healthRecords = ref([])
const cleaningRecords = ref([])
const breedingRecords = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const parrots = ref([])
const selectedParrotId = ref(null)
const dateRange = ref([])
const searchQuery = ref('')
const addDialogVisible = ref(false)
const addSubmitting = ref(false)
const addFormType = ref('feeding')
const addFormDateTime = ref('')
const addForm = reactive({
  parrot_ids: [],
  notes: '',
  food_types: [],
  food_amounts: {},
  amount: '',
  cleaning_types: [],
  description: '',
  weight: '',
  health_status: 'healthy',
  male_parrot_id: null,
  female_parrot_id: null,
  mating_date: '',
  egg_laying_date: '',
  egg_count: '',
  hatching_date: '',
  chick_count: '',
  success_rate: ''
})
const feedTypes = ref([])
const healthStatusOptions = [
  { value: 'healthy', label: '健康' },
  { value: 'sick', label: '生病' },
  { value: 'recovering', label: '康复中' },
  { value: 'observation', label: '观察中' }
]
const cleaningTypeOptions = [
  { value: 'cage', label: '笼子清洁' },
  { value: 'toys', label: '玩具清洁' },
  { value: 'perches', label: '栖木清洁' },
  { value: 'food_water', label: '食物和水清洁' },
  { value: 'disinfection', label: '消毒' },
  { value: 'water_change', label: '饮用水更换' },
  { value: 'water_bowl_clean', label: '水碗清洁' },
  { value: 'bath', label: '鹦鹉洗澡' }
]
const typeLabelMap = {
  feeding: '喂食',
  health: '健康',
  cleaning: '清洁',
  breeding: '繁殖'
}
const addDialogTitle = computed(() => {
  const text = typeLabelMap[addFormType.value] || ''
  return `添加${text}记录`
})
const recordTypeLabel = computed(() => typeLabelMap[addFormType.value] || '')
const isMultiParrot = computed(() => addFormType.value === 'feeding' || addFormType.value === 'cleaning')
const showRecordTimePicker = computed(() => addFormType.value === 'feeding' || addFormType.value === 'cleaning' || addFormType.value === 'health' || addFormType.value === 'breeding')
const singleFeedUnit = computed(() => {
  if (!addForm.food_types || addForm.food_types.length === 0) return 'g'
  const id = addForm.food_types[0]
  const item = feedTypes.value.find(f => f.id === id)
  return item && item.unit ? item.unit : 'g'
})

const getNowDateTimeString = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

const fetchRecords = async () => {
  loading.value = true
  try {
    let url = `/records/${activeTab.value}`
    const params = {
      page: currentPage.value,
      per_page: pageSize.value
    }
    if (activeTab.value === 'feeding' || activeTab.value === 'health' || activeTab.value === 'cleaning') {
      if (selectedParrotId.value) params.parrot_id = selectedParrotId.value
    }
    if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    if (activeTab.value === 'breeding') {
      if (selectedParrotId.value) params.male_parrot_id = selectedParrotId.value
    }
    const res = await api.get(url, { params })
    
    if (res.data.success) {
      const d = res.data.data
      if (activeTab.value === 'feeding') {
        feedingRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'health') {
        healthRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'cleaning') {
        cleaningRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'breeding') {
        breedingRecords.value = d.items || d.records || []
      }
      total.value = d.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTabClick = () => {
  currentPage.value = 1
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchRecords()
}

const handleFilterChange = () => {
  currentPage.value = 1
  fetchRecords()
}

const handleSearch = () => {
  applyClientFilter()
}

const resetAddForm = () => {
  addForm.parrot_ids = []
  addForm.notes = ''
  addForm.food_types = []
  addForm.food_amounts = {}
  addForm.amount = ''
  addForm.cleaning_types = []
  addForm.description = ''
  addForm.weight = ''
  addForm.health_status = 'healthy'
  addForm.male_parrot_id = null
  addForm.female_parrot_id = null
  addForm.mating_date = ''
  addForm.egg_laying_date = ''
  addForm.egg_count = ''
  addForm.hatching_date = ''
  addForm.chick_count = ''
  addForm.success_rate = ''
  addFormDateTime.value = ''
}

const loadFeedTypes = async () => {
  try {
    const res = await api.get('/records/feed-types')
    if (res.data && res.data.success) {
      const data = res.data.data || res.data
      feedTypes.value = Array.isArray(data) ? data : []
    }
  } catch (e) {
    console.error(e)
  }
}

const onAddTypeChange = async (val) => {
  addFormType.value = val || 'feeding'
  resetAddForm()
  if (addFormType.value === 'feeding' && feedTypes.value.length === 0) {
    await loadFeedTypes()
  }
  if (showRecordTimePicker.value) {
    addFormDateTime.value = getNowDateTimeString()
  }
}

const getFeedTypeLabel = (id) => {
  const item = feedTypes.value.find(f => f.id === id)
  return item ? item.name : '食物'
}

const getFeedTypeUnit = (id) => {
  const item = feedTypes.value.find(f => f.id === id)
  return item && item.unit ? item.unit : 'g'
}

const openAddDialog = async () => {
  addFormType.value = activeTab.value || 'feeding'
  resetAddForm()
  if (addFormType.value === 'feeding' && feedTypes.value.length === 0) {
    await loadFeedTypes()
  }
  if (showRecordTimePicker.value) {
    addFormDateTime.value = getNowDateTimeString()
  }
  addDialogVisible.value = true
}

const formatDate = (dateStr, format) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (format === 'YYYY-MM-DD') {
    return date.toLocaleDateString()
  }
  return date.toLocaleString()
}

const getHealthType = (status) => {
  if (status === 'healthy') return 'success'
  if (status === 'sick') return 'danger'
  if (status === 'recovering') return 'warning'
  return 'info'
}

const getHealthLabel = (status) => {
  const map = {
    healthy: '健康',
    sick: '生病',
    recovering: '康复中'
  }
  return map[status] || status
}

const refresh = () => fetchRecords()

const feedingRecordsFiltered = ref([])
const healthRecordsFiltered = ref([])
const cleaningRecordsFiltered = ref([])
const breedingRecordsFiltered = ref([])

const applyClientFilter = () => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (activeTab.value === 'feeding') {
    const list = Array.isArray(feedingRecords.value) ? feedingRecords.value : []
    feedingRecordsFiltered.value = q
      ? list.filter(r => {
          const notes = String(r.notes || '').toLowerCase()
          const feedTypeName = String(r.feed_type_name || (r.feed_type && (r.feed_type.name || '')) || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            notes.includes(q) ||
            feedTypeName.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'health') {
    const list = Array.isArray(healthRecords.value) ? healthRecords.value : []
    healthRecordsFiltered.value = q
      ? list.filter(r => {
          const description = String(r.description || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            description.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'cleaning') {
    const list = Array.isArray(cleaningRecords.value) ? cleaningRecords.value : []
    cleaningRecordsFiltered.value = q
      ? list.filter(r => {
          const description = String(r.description || '').toLowerCase()
          const cleaningTypeText = String(r.cleaning_type_text || r.cleaning_type || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            description.includes(q) ||
            cleaningTypeText.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'breeding') {
    const list = Array.isArray(breedingRecords.value) ? breedingRecords.value : []
    breedingRecordsFiltered.value = q
      ? list.filter(r => {
          const notes = String(r.notes || '').toLowerCase()
          const maleName = String(r.male_parrot_name || (r.male_parrot && (r.male_parrot.name || '')) || '').toLowerCase()
          const femaleName = String(r.female_parrot_name || (r.female_parrot && (r.female_parrot.name || '')) || '').toLowerCase()
          return notes.includes(q) || maleName.includes(q) || femaleName.includes(q)
        })
      : list
  }
}

const submitAdd = async () => {
  const type = addFormType.value
  if (type !== 'breeding') {
    if (!addForm.parrot_ids || addForm.parrot_ids.length === 0) {
      ElMessage.error('请选择鹦鹉')
      return
    }
  } else {
    if (!addForm.male_parrot_id || !addForm.female_parrot_id) {
      ElMessage.error('请选择公鸟和母鸟')
      return
    }
  }

  if (showRecordTimePicker.value && !addFormDateTime.value) {
    ElMessage.error('请选择记录时间')
    return
  }

  const payload = { type }

  if (type === 'feeding') {
    if (!addForm.food_types || addForm.food_types.length === 0) {
      ElMessage.error('请选择食物类型')
      return
    }
    payload.parrot_ids = addForm.parrot_ids
    payload.feeding_time = addFormDateTime.value
    payload.food_types = addForm.food_types.slice()
    const foodAmounts = {}
    if (Array.isArray(addForm.food_types)) {
      addForm.food_types.forEach(id => {
        const raw = addForm.food_amounts[id]
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
          foodAmounts[id] = String(raw).trim()
        }
      })
    }
    payload.food_amounts = foodAmounts
    if (addForm.food_types.length > 1) {
      if (Object.keys(foodAmounts).length !== addForm.food_types.length) {
        ElMessage.error('请为每种食物类型填写分量')
        return
      }
    } else if (addForm.food_types.length === 1) {
      if (addForm.amount && String(addForm.amount).trim() !== '') {
        payload.amount = String(addForm.amount).trim()
      } else if (!foodAmounts[addForm.food_types[0]]) {
        ElMessage.error('请输入分量')
        return
      }
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'cleaning') {
    if (!addForm.cleaning_types || addForm.cleaning_types.length === 0) {
      ElMessage.error('请选择清洁类型')
      return
    }
    payload.parrot_ids = addForm.parrot_ids
    payload.cleaning_time = addFormDateTime.value
    payload.cleaning_types = addForm.cleaning_types.slice()
    if (addForm.description && String(addForm.description).trim() !== '') {
      payload.description = String(addForm.description).trim()
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'health') {
    payload.parrot_ids = addForm.parrot_ids
    payload.record_date = addFormDateTime.value
    payload.health_status = addForm.health_status || 'healthy'
    if (addForm.weight && String(addForm.weight).trim() !== '') {
      payload.weight = String(addForm.weight).trim()
    }
    if (addForm.description && String(addForm.description).trim() !== '') {
      payload.description = String(addForm.description).trim()
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'breeding') {
    payload.male_parrot_id = addForm.male_parrot_id
    payload.female_parrot_id = addForm.female_parrot_id
    if (addForm.mating_date) payload.mating_date = addForm.mating_date
    if (addForm.egg_laying_date) payload.egg_laying_date = addForm.egg_laying_date
    if (addForm.egg_count && String(addForm.egg_count).trim() !== '') {
      payload.egg_count = parseInt(String(addForm.egg_count).trim(), 10) || 0
    }
    if (addForm.hatching_date) payload.hatching_date = addForm.hatching_date
    if (addForm.chick_count && String(addForm.chick_count).trim() !== '') {
      payload.chick_count = parseInt(String(addForm.chick_count).trim(), 10) || 0
    }
    if (addForm.success_rate && String(addForm.success_rate).trim() !== '') {
      payload.success_rate = parseFloat(String(addForm.success_rate).trim())
    }
    if (addFormDateTime.value) {
      payload.record_time = addFormDateTime.value
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  }

  addSubmitting.value = true
  try {
    const res = await api.post('/records', payload)
    if (res.data && res.data.success) {
      ElMessage.success('保存成功')
      addDialogVisible.value = false
      refresh()
    } else {
      ElMessage.error((res.data && res.data.message) || '保存失败')
    }
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.message
      ? e.response.data.message
      : (e.message || '保存失败')
    ElMessage.error(msg)
  } finally {
    addSubmitting.value = false
  }
}

watch([feedingRecords, healthRecords, cleaningRecords, breedingRecords, activeTab], () => {
  applyClientFilter()
})

watch(activeTab, () => {
  currentPage.value = 1
  fetchRecords()
})

const loadParrots = async () => {
  try {
    const r = await api.get('/parrots')
    if (r.data && r.data.success) {
      const data = r.data.data || {}
      let arr = []
      if (Array.isArray(data)) {
        arr = data
      } else if (Array.isArray(data.parrots)) {
        arr = data.parrots
      } else if (Array.isArray(data.items)) {
        arr = data.items
      }
      parrots.value = arr
    }
  } catch (_) {}
}

onMounted(() => {
  loadParrots()
  fetchRecords()
})
</script>

<style scoped>
h2 {
  color: var(--text-primary);
  margin-bottom: 24px;
}
.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}
:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}
:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  --el-table-header-bg-color: #f8f9fa;
}
:deep(.el-tag--small) {
  border-radius: 6px;
}
.pagination {
  margin-top: 20px;
  justify-content: center;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
}
.search-input { flex: 2 1 420px; min-width: 260px; }
.toolbar-right { display: flex; gap: 12px; align-items: center; flex-wrap: nowrap; }
.filter-item { min-width: 140px; flex: 0 0 140px; }
</style>
