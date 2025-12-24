<template>
  <div class="pairing-container">
    <div class="header">
      <h2>鹦鹉配对计算器</h2>
      <p class="subtitle">基于基因遗传规律预测子代颜色</p>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else class="content">
      <div class="switch-bar">
        <div class="switch-thumb" :class="activeTab === 'calculator' ? 'left' : 'right'"></div>
        <div class="switch-item" :class="activeTab === 'calculator' ? 'active' : ''" @click="switchTab('calculator')"><span class="switch-text">计算器</span></div>
        <div class="switch-item" :class="activeTab === 'records' ? 'active' : ''" @click="switchTab('records')"><span class="switch-text">配对记录</span></div>
      </div>

      <div v-if="activeTab === 'calculator'" class="calculator-tab">
      <div class="species-selector">
        <span class="label">选择品种：</span>
        <el-select 
          v-model="selectedSpeciesIndex" 
          placeholder="请选择品种" 
          @change="onSpeciesChange"
          size="large"
          class="species-select"
        >
          <el-option 
            v-for="(s, idx) in speciesList" 
            :key="idx" 
            :label="s.name" 
            :value="idx" 
          />
        </el-select>
      </div>

      <div v-if="plumageConfig" class="calculator-area">
        <el-row :gutter="20">
          <!-- Mother Panel -->
          <el-col :xs="24" :sm="12">
            <el-card class="bird-card mother-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="role-badge female">♀ 母鸟 (Mother)</span>
                </div>
              </template>
              <el-form label-position="top">
                <el-form-item label="外观颜色 (Visual)">
                  <el-select 
                    v-model="motherColorIndex" 
                    filterable 
                    placeholder="选择颜色" 
                    style="width: 100%"
                    @change="calculate"
                  >
                    <el-option 
                      v-for="(c, idx) in colorOptions" 
                      :key="idx" 
                      :label="c" 
                      :value="idx" 
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="携带基因 (Splits)">
                  <el-select 
                    v-model="motherSplits" 
                    multiple 
                    placeholder="选择携带基因" 
                    collapse-tags 
                    collapse-tags-tooltip
                    style="width: 100%"
                    @change="calculate"
                  >
                    <el-option 
                      v-for="s in splitOptions" 
                      :key="s.id" 
                      :label="s.name" 
                      :value="s.id" 
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>

          <!-- Father Panel -->
          <el-col :xs="24" :sm="12">
            <el-card class="bird-card father-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="role-badge male">♂ 公鸟 (Father)</span>
                </div>
              </template>
              <el-form label-position="top">
                <el-form-item label="外观颜色 (Visual)">
                  <el-select 
                    v-model="fatherColorIndex" 
                    filterable 
                    placeholder="选择颜色" 
                    style="width: 100%"
                    @change="calculate"
                  >
                    <el-option 
                      v-for="(c, idx) in colorOptions" 
                      :key="idx" 
                      :label="c" 
                      :value="idx" 
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="携带基因 (Splits)">
                  <el-select 
                    v-model="fatherSplits" 
                    multiple 
                    placeholder="选择携带基因" 
                    collapse-tags 
                    collapse-tags-tooltip
                    style="width: 100%"
                    @change="calculate"
                  >
                    <el-option 
                      v-for="s in splitOptions" 
                      :key="s.id" 
                      :label="s.name" 
                      :value="s.id" 
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
        </el-row>

        <!-- Results -->
        <div class="results-section">
          <div class="section-title">
            <h3>计算结果</h3>
            <span class="result-count">共 {{ results.length }} 种可能</span>
          </div>
          
          <el-table :data="results" stripe border style="width: 100%" :header-cell-style="{ background: '#f5f7fa' }">
            <el-table-column prop="name" label="子代表现型" min-width="200">
               <template #default="scope">
                 <div class="result-name">
                   {{ scope.row.name }}
                   <span v-if="scope.row.splitNames" class="split-tags">
                     (带 {{ scope.row.splitNames }})
                   </span>
                 </div>
               </template>
            </el-table-column>
            <el-table-column prop="prob" label="概率" width="120" align="center">
              <template #default="scope">
                <el-tag :type="getProbTagType(scope.row.prob)">{{ scope.row.prob }}%</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Sex Breakdown -->
        <div v-if="sexBreakdown.male.length || sexBreakdown.female.length" class="results-section">
          <div class="section-title"><h3>按性别分布</h3></div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-card>
                <template #header>
                  <span>公雏 (Males)</span>
                </template>
                <el-table :data="sexBreakdown.male" size="small">
                  <el-table-column prop="label" label="表现型" />
                  <el-table-column prop="prob" label="概率(%)" width="120" />
                </el-table>
                <div v-if="sexBreakdown.male.length === 0" class="empty-sm">无公雏</div>
              </el-card>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-card>
                <template #header>
                  <span>母雏 (Females)</span>
                </template>
                <el-table :data="sexBreakdown.female" size="small">
                  <el-table-column prop="label" label="表现型" />
                  <el-table-column prop="prob" label="概率(%)" width="120" />
                </el-table>
                <div v-if="sexBreakdown.female.length === 0" class="empty-sm">无母雏</div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <div class="save-pair-section">
          <el-button type="primary" @click="savePairing">保存配对</el-button>
        </div>
      </div>
      
      <el-empty v-else description="请选择支持基因计算的品种" />
      </div>

      <div v-else class="records-tab">
        <div v-if="records.length === 0" class="empty">暂无配对记录</div>
        <div v-else>
          <el-card v-for="(item, idx) in records" :key="item.createdAt" class="record-card">
            <template #header>
              <div class="record-header">
                <span>{{ item.species }} · {{ formatTime(item.createdAt) }}</span>
              </div>
            </template>
            <div class="record-body">
              <p><span class="label">母鸟：</span>{{ item.motherColor }}<span v-if="item.motherSplits && item.motherSplits.length"> · {{ item.motherSplits.join('、') }}</span></p>
              <p><span class="label">公鸟：</span>{{ item.fatherColor }}<span v-if="item.fatherSplits && item.fatherSplits.length"> · {{ item.fatherSplits.join('、') }}</span></p>
              <div v-if="item.results && item.results.length" class="record-results">
                <el-table :data="item.results" size="small">
                  <el-table-column prop="label" label="表现型" />
                  <el-table-column prop="prob" label="概率(%)" width="120" />
                </el-table>
              </div>
            </div>
            <div class="record-actions">
              <el-button type="danger" plain size="small" @click="deleteRecord(idx)">删除该记录</el-button>
            </div>
          </el-card>
          <div class="save-pair-section">
            <el-button type="warning" plain @click="clearAll">清空所有</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { simulatePairing, simulatePairingDetailed } from '@/utils/genetics'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const speciesList = ref([])
const selectedSpeciesIndex = ref(null)
const plumageConfig = ref(null)
const activeTab = ref('calculator')

const colorOptions = ref([])
const splitOptions = ref([])

const motherColorIndex = ref(0)
const motherSplits = ref([])
const fatherColorIndex = ref(0)
const fatherSplits = ref([])

const results = ref([])
const sexBreakdown = ref({ male: [], female: [] })
const records = ref([])

onMounted(async () => {
  await fetchSpecies()
  loadRecords()
})

const fetchSpecies = async () => {
  loading.value = true
  try {
    const res = await api.get('/parrots/species')
    const list = (res.data && res.data.success) ? (res.data.data || []) : []
    speciesList.value = list.filter(s => !!s.plumage_json)
    
    if (speciesList.value.length > 0) {
      selectedSpeciesIndex.value = 0
      updateSpeciesData(0)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('加载品种数据失败')
  } finally {
    loading.value = false
  }
}

const onSpeciesChange = (val) => {
  updateSpeciesData(val)
}

const updateSpeciesData = (idx) => {
  const species = speciesList.value[idx]
  if (!species) return

  try {
    const config = JSON.parse(species.plumage_json)
    plumageConfig.value = config
    
    // Extract Colors
    colorOptions.value = config.colors.map(c => c.name)
    
    // Extract Splits
    const splits = []
    for (const [key, gene] of Object.entries(config.loci)) {
      if ((gene.type === 'autosomal' && !gene.incomplete) || gene.type === 'sex-linked') {
        if (!gene.incomplete) {
          splits.push({ id: key, name: gene.label })
        }
      }
    }
    splitOptions.value = splits
    
    // Reset selections
    motherColorIndex.value = 0
    fatherColorIndex.value = 0
    motherSplits.value = []
    fatherSplits.value = []
    
    calculate()
  } catch (e) {
    console.error('Failed to parse plumage config', e)
    plumageConfig.value = null
  }
}

const calculate = () => {
  if (!plumageConfig.value || selectedSpeciesIndex.value === null) return
  
  const species = speciesList.value[selectedSpeciesIndex.value]
  
  const res = simulatePairing(
    species.name,
    plumageConfig.value,
    motherColorIndex.value,
    fatherColorIndex.value,
    motherSplits.value,
    fatherSplits.value
  )
  results.value = res

  const detail = simulatePairingDetailed(
    species.name,
    plumageConfig.value,
    motherColorIndex.value,
    fatherColorIndex.value,
    motherSplits.value,
    fatherSplits.value
  )
  sexBreakdown.value = detail.sexBreakdown
}

const getProbTagType = (prob) => {
  const p = parseFloat(prob)
  if (isNaN(p)) return 'info'
  if (p >= 50) return 'success'
  if (p >= 25) return 'warning'
  return 'info'
}

const switchTab = (tab) => { activeTab.value = tab }

const formatTime = (ts) => {
  const d = new Date(ts)
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
  const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0')
  return `${y}-${m}-${dd} ${hh}:${mm}`
}

const loadRecords = () => {
  try {
    const raw = localStorage.getItem('pairing_records')
    const list = raw ? JSON.parse(raw) : []
    records.value = Array.isArray(list) ? list : []
  } catch (_) { records.value = [] }
}

const savePairing = () => {
  try {
    const species = speciesList.value[selectedSpeciesIndex.value]
    if (!species) { ElMessage.warning('请选择品种'); return }
    const item = {
      species: species.name,
      createdAt: Date.now(),
      motherColor: colorOptions.value[motherColorIndex.value],
      fatherColor: colorOptions.value[fatherColorIndex.value],
      motherSplits: motherSplits.value.map(id => (splitOptions.value.find(s => s.id === id)?.name || id)),
      fatherSplits: fatherSplits.value.map(id => (splitOptions.value.find(s => s.id === id)?.name || id)),
      results: results.value.map(r => ({ label: r.splitNames ? `${r.name} (携带${r.splitNames})` : r.name, prob: r.prob }))
    }
    const list = [...records.value, item]
    localStorage.setItem('pairing_records', JSON.stringify(list))
    records.value = list
    ElMessage.success('已保存配对')
    activeTab.value = 'records'
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const deleteRecord = (idx) => {
  const list = [...records.value]
  list.splice(idx, 1)
  localStorage.setItem('pairing_records', JSON.stringify(list))
  records.value = list
}

const clearAll = () => {
  localStorage.removeItem('pairing_records')
  records.value = []
}
</script>

<style scoped>
.pairing-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
}

.species-selector {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.label {
  font-weight: bold;
  margin-right: 12px;
  color: #606266;
}

.species-select {
  width: 300px;
}

.calculator-area {
  animation: fadeIn 0.5s ease;
}

.switch-bar { display: flex; align-items: center; position: relative; background: #fff; border-radius: 999px; padding: 6px; width: 280px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); margin-bottom: 16px; }
.switch-thumb { position: absolute; top: 6px; left: 6px; width: 130px; height: 32px; border-radius: 16px; background: #10b981; transition: all .25s; }
.switch-thumb.right { left: 144px; background: #10b981; }
.switch-item { z-index: 1; width: 50%; text-align: center; cursor: pointer; height: 32px; line-height: 32px; }
.switch-item.active .switch-text { font-weight: 600; color: white; }
.switch-text { color: #606266; transition: color 0.2s; }

.empty-sm { color: #909399; font-size: 13px; margin-top: 8px; }
.save-pair-section { margin-top: 16px; }
.record-card { margin-bottom: 16px; }
.record-header { font-weight: 500; }
.record-body .label { color: #909399; margin-right: 6px; }
.record-results { margin-top: 10px; }

.bird-card {
  margin-bottom: 20px;
  border-radius: 8px;
  transition: transform 0.3s;
}

.bird-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: bold;
  font-size: 14px;
}

.role-badge.female {
  background-color: #fff0f6;
  color: #eb2f96;
}

.role-badge.male {
  background-color: #e6f7ff;
  color: #1890ff;
}

.results-section {
  margin-top: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.section-title h3 {
  margin: 0;
  margin-right: 12px;
}

.result-count {
  color: #909399;
  font-size: 13px;
}

.result-name {
  font-weight: 500;
}

.split-tags {
  color: #909399;
  font-size: 13px;
  margin-left: 8px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .species-select {
    width: 100%;
  }
}
</style>
