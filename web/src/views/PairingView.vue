<template>
  <div class="pairing-container page-container">
    <div class="page-header">
      <h2>鹦鹉配对计算器</h2>
    </div>
    <p class="subtitle">基于基因遗传规律预测子代颜色</p>

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
            @change="onConfigChanged"
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
                    @change="onConfigChanged"
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
              <div class="suggestion-card" v-if="bestFatherSuggestion">
                <div class="suggestion-title">最佳公鸟配对建议</div>
                <div class="suggestion-detail">{{ bestFatherSuggestion.colorName }} · 预计均价 ¥{{ bestFatherSuggestion.expectedValue }}</div>
              </div>
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
                    @change="onConfigChanged"
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
                    @change="onConfigChanged"
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
            <div class="suggestion-card" v-if="bestMotherSuggestion">
              <div class="suggestion-title">最佳母鸟配对建议</div>
              <div class="suggestion-detail">{{ bestMotherSuggestion.colorName }} · 预计均价 ¥{{ bestMotherSuggestion.expectedValue }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

        <div class="calculate-section">
          <el-button type="primary" size="large" @click="startCalculation">开始计算</el-button>
        </div>

        <!-- Results -->
        <div v-if="hasCalculated" class="results-section">
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
        <div v-if="hasCalculated && (sexBreakdown.male.length || sexBreakdown.female.length)" class="results-section">
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

        <div v-if="hasCalculated" class="results-section">
          <div class="section-title"><h3>预计均价</h3></div>
          <div class="avg-box">
            <span class="avg-value">¥{{ expectedAveragePrice }}</span>
            <span class="avg-hint">基于当前配对结果与参考价估算</span>
          </div>
        </div>

        <div v-if="hasCalculated" class="save-pair-section">
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
                <el-button class="record-delete-btn" type="danger" plain circle size="small" :icon="Delete" @click="deleteRecord(idx)" />
              </div>
            </template>
            <div class="record-body">
              <p><span class="label">母鸟：</span>{{ item.motherColor }}<span v-if="item.motherSplits && item.motherSplits.length"> · {{ item.motherSplits.join('、') }}</span></p>
              <p><span class="label">公鸟：</span>{{ item.fatherColor }}<span v-if="item.fatherSplits && item.fatherSplits.length"> · {{ item.fatherSplits.join('、') }}</span></p>
              <div class="avg-box">
                <span class="avg-value">¥{{ item.expectedAveragePrice || 0 }}</span>
                <span class="avg-hint">预计均价</span>
              </div>
              <div v-if="item.results && item.results.length" class="record-results">
                <el-table :data="item.results" size="small">
                  <el-table-column prop="label" label="表现型" />
                  <el-table-column prop="prob" label="概率(%)" width="120" />
                </el-table>
              </div>
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
import { getCache, setCache } from '@/utils/cache'
import { simulatePairing, simulatePairingDetailed, analyzeAllOffsprings } from '@/utils/genetics'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

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
const priceMap = ref({})
const priceMapMale = ref({})
const priceMapFemale = ref({})
const expectedAveragePrice = ref(0)
const bestFatherSuggestion = ref(null)
const bestMotherSuggestion = ref(null)

const PAIRING_CACHE_TTL = 60000

const hasCalculated = ref(false)

onMounted(async () => {
  await fetchSpecies()
  loadRecords()
})

const fetchSpecies = async () => {
  loading.value = true
  try {
    const cached = getCache('pairing_species', PAIRING_CACHE_TTL)
    let list = []
    if (cached && Array.isArray(cached)) {
      list = cached
    } else {
      const res = await api.get('/parrots/species')
      list = (res.data && res.data.success) ? (res.data.data || []) : []
      setCache('pairing_species', list)
    }
    speciesList.value = list.filter(s => !!s.plumage_json)
    
    if (speciesList.value.length > 0) {
      const idx = speciesList.value.findIndex(s => String(s.name || '').includes('和尚鹦鹉'))
      const effective = idx >= 0 ? idx : 0
      selectedSpeciesIndex.value = effective
      updateSpeciesData(effective)
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

const LOVE_BIRD_COMMON_COLOR_NAMES = [
  '紫伊莎',
  '白面澳闪',
  '紫面伊',
  '金头澳闪',
  '黄金面',
  '绿金面',
  '金头黄化',
  '松熏派',
  '松石伊莎',
  '紫闪派',
  '蓝闪派',
  '松闪派',
  '松石熏',
  '蓝伊莎',
  '蓝熏',
  '蓝闪',
  '松伊莎',
  '紫闪',
  '松闪',
  '紫薰',
  '松熏',
  '紫熏派',
  '蓝熏派',
  '紫伊莎派',
  '蓝伊莎派',
  '松伊莎派',
  '苹果绿澳闪'
]

const uniq = (list) => {
  const out = []
  const s = new Set()
  ;(list || []).forEach(v => {
    const k = String(v || '')
    if (!k || s.has(k)) return
    s.add(k)
    out.push(k)
  })
  return out
}

const decorateColorForDisplay = (speciesName, name) => {
  const s = String(speciesName || '')
  const n = String(name || '')
  if (s === '牡丹鹦鹉') {
    if (n === '黄边桃' || n.includes('蓝腰黄桃')) return '黄边桃(蓝腰黄桃)'
  }
  return n
}

const parseLovebirdAliasToGenes = (name) => {
  const raw = String(name || '').trim()
  const n = raw.replace(/\s+/g, '')
  const genes = {}
  const has = (t) => n.includes(t)

  if (has('白面')) genes.white_face = 2
  if (has('金头')) genes.goldhead = 2
  if (has('黄金面')) genes.goldface = 2
  if (has('绿金面')) genes.greengoldface = 2
  if (has('紫面')) genes.violet_face = 2
  if (has('苹果绿')) genes.apple_green = 2

  if (has('松石')) genes.turquoise = 2
  if (n.startsWith('蓝')) genes.blue = 2
  if (n.startsWith('紫')) {
    genes.blue = 2
    genes.violet = 1
  }

  if (has('伊莎') || /伊$/.test(n)) genes.pallid = 1
  if (has('黄化')) genes.ino = 1
  if (has('熏') || has('薰')) genes.smoke = 2
  if (has('澳闪')) genes.fallow = 2
  if (has('闪') && !has('澳闪')) genes.flash = 2
  if (has('派')) genes.pied = 2

  return genes
}

const enhanceLovebirdConfig = (rawConfig) => {
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : { colors: [], loci: {} }
  if (!config.loci) config.loci = {}
  if (!Array.isArray(config.colors)) config.colors = []

  const lociAdd = {
    turquoise: { label: '松石', type: 'autosomal' },
    violet: { label: '紫', type: 'autosomal', incomplete: true },
    pallid: { label: '伊莎', type: 'sex-linked' },
    smoke: { label: '熏', type: 'autosomal' },
    flash: { label: '闪', type: 'autosomal' },
    goldhead: { label: '金头', type: 'autosomal' },
    goldface: { label: '黄金面', type: 'autosomal' },
    greengoldface: { label: '绿金面', type: 'autosomal' },
    violet_face: { label: '紫面', type: 'autosomal' },
    apple_green: { label: '苹果绿', type: 'autosomal' }
  }

  Object.keys(lociAdd).forEach(k => {
    if (config.loci[k] == null) config.loci[k] = lociAdd[k]
  })

  if (config.loci.pied == null && config.loci.pied_dom == null) {
    config.loci.pied = { label: '派', type: 'autosomal' }
  }

  const existing = new Set(config.colors.map(c => c && c.name).filter(Boolean))
  uniq(LOVE_BIRD_COMMON_COLOR_NAMES).forEach(displayName => {
    if (existing.has(displayName)) return
    config.colors.push({ name: displayName, genes: parseLovebirdAliasToGenes(displayName) })
  })

  return config
}

const updateSpeciesData = (idx) => {
  const species = speciesList.value[idx]
  if (!species) return

  try {
    let config = JSON.parse(species.plumage_json)
    if (species.name === '牡丹鹦鹉') config = enhanceLovebirdConfig(config)
    plumageConfig.value = config
    
    // Extract Colors
    let colors = config.colors.map(c => decorateColorForDisplay(species.name, c.name))
    if (species.name === '和尚鹦鹉') {
      colors = colors.filter(n => {
        const s = String(n || '')
        if (s === '黄和尚' || s === '白和尚') return false
        if (s === '灰色') return false
        return true
      })
    }
    colorOptions.value = colors
    
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
    
    hasCalculated.value = false
    results.value = []
    sexBreakdown.value = { male: [], female: [] }
    fetchPrices(species.name)
    computeSuggestions()
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
  computeSuggestions()
}

const startCalculation = () => {
  calculate()
  hasCalculated.value = true
}

const onConfigChanged = () => {
  hasCalculated.value = false
  results.value = []
  sexBreakdown.value = { male: [], female: [] }
  computeSuggestions()
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

const canonicalizeColorName = (species, name) => {
  const s = String(name || '').replace('（', '(').replace('）', ')').replace(/\s+/g, '')
  if (species === '和尚鹦鹉') {
    if (s.includes('蓝派特和尚')) return '派特蓝和尚'
    if (s.includes('绿派特和尚')) return '派特绿和尚'
    if (s.includes('派特和尚')) return '派特绿和尚'
    if (s.includes('绿肉桂和尚')) return '肉桂绿和尚'
    return s
  } else if (species === '牡丹鹦鹉') {
    if (s.includes('白面绿桃')) return '白面桃'
    if (s === '绿桃' || s.includes('野生型')) return '野生型（绿桃）'
    if (s === '白桃') return '白桃（白化）'
    if (s === '黄桃') return '黄桃（黄化）'
    if (s.includes('蓝派特')) return '派特桃'
    if (s.includes('黄边桃') || s.includes('蓝腰黄桃')) return '黄边桃'
    return s
  } else if (species === '小太阳鹦鹉') {
    if (s.includes('派特')) return '派特小太阳'
    return s
  } else if (species === '虎皮鹦鹉' || species === 'Budgerigar') {
    if (s.includes('白化虎皮')) return '白化虎皮'
    if (s.includes('黄化虎皮')) return '黄化虎皮'
    if (s.includes('蓝化虎皮')) return '蓝化虎皮'
    return s
  } else if (species === '玄凤鹦鹉' || species === 'Cockatiel') {
    return s
  }
  return s
}

const normalizePriceMap = (species, map) => {
  const m = { ...(map || {}) }
  const remapped = {}
  Object.keys(m).forEach(k => {
    const ck = canonicalizeColorName(species, k)
    if (remapped[ck] == null) remapped[ck] = m[k]
  })
  Object.assign(m, remapped)
  if (species === '和尚鹦鹉') {
    const alias = {
      '深绿和尚': ['深绿和尚(1Dark)'],
      '橄榄绿和尚(双暗绿)': ['橄榄绿和尚(2Dark)'],
      '钴蓝和尚': ['钴蓝和尚(蓝+1Dark)'],
      '紫罗兰和尚(双暗蓝)': ['紫罗兰和尚(蓝+2Dark)'],
      '派特绿和尚': ['派特和尚'],
      '派特蓝和尚': ['蓝派特和尚'],
      '肉桂绿和尚': ['绿肉桂和尚', '肉桂绿']
    }
    Object.keys(alias).forEach(canon => {
      const syns = alias[canon]
      syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
    })
  } else if (species === '牡丹鹦鹉') {
    const alias = {
      '白面桃': ['白面绿桃'],
      '野生型（绿桃）': ['野生型','绿桃'],
      '白桃（白化）': ['白桃'],
      '黄桃（黄化）': ['黄桃'],
      '派特桃': ['蓝派特','派特'],
      '黄边桃': ['黄边桃(蓝腰黄桃)','蓝腰黄桃']
    }
    Object.keys(alias).forEach(canon => {
      const syns = alias[canon]
      syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
    })
  } else if (species === '小太阳鹦鹉') {
    const alias = { '派特小太阳': ['小太阳派特'] }
    Object.keys(alias).forEach(canon => {
      const syns = alias[canon]
      syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
    })
  } else if (species === '虎皮鹦鹉' || species === 'Budgerigar') {
    const alias = {
      '白化虎皮': ['Albino虎皮','白化'],
      '黄化虎皮': ['Lutino虎皮','黄化'],
      '蓝化虎皮': ['蓝基虎皮']
    }
    Object.keys(alias).forEach(canon => {
      const syns = alias[canon]
      syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
    })
  } else if (species === '玄凤鹦鹉' || species === 'Cockatiel') {
    const alias = {
      '黄化玄凤': ['乳黄玄凤','黄化'],
      '白面黄化玄凤': ['白面乳黄玄凤']
    }
    Object.keys(alias).forEach(canon => {
      const syns = alias[canon]
      syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
    })
  }
  return m
}

const getDefaultPriceMap = (species) => {
  if (species === '和尚鹦鹉') {
    return {
      '绿和尚': 600,
      '蓝和尚': 1000,
      '深绿和尚': 800,
      '橄榄绿和尚(双暗绿)': 900,
      '钴蓝和尚': 1400,
      '紫罗兰和尚(双暗蓝)': 2000,
      '黄和尚(Lutino)': 1800,
      '白和尚(Albino)': 2500,
      '肉桂绿和尚': 1200,
      '银丝和尚': 1500,
      '蓝银丝和尚': 2000,
      '派特绿和尚': 1800,
      '派特蓝和尚': 2200
    }
  }
  if (species === '小太阳鹦鹉') {
    return {
      '绿颊小太阳（原始）': 600,
      '黄边小太阳': 1200,
      '肉桂小太阳': 1200,
      '凤梨小太阳': 1800,
      '蓝化小太阳': 1500,
      '蓝化黄边': 2200,
      '蓝化肉桂': 2200,
      '蓝化凤梨': 2800,
      '香吉士(美国黄/稀释)': 2000,
      '月亮(Mint/蓝化稀释)': 2600,
      'Suncheek(阳曦/凤梨稀释)': 2800,
      'Mooncheek(月光/蓝化凤梨稀释)': 3200,
      '派特小太阳': 1800
    }
  }
  if (species === '牡丹鹦鹉') {
    return {
      '野生型（绿桃）': 300,
      '绿金顶': 500,
      '蓝银顶': 800,
      '黄桃（黄化）': 1000,
      '白桃（白化）': 1200,
      '白面桃': 900,
      '肉桂桃': 700,
      '肉桂蓝化': 1000,
      '黄边桃': 800,
      '蓝化黄边': 1200,
      '银丝桃': 900,
      '派特桃': 900,
      '白化派特': 1500,
      '白面澳桂': 1200,
      '苹果绿澳桂(红面澳桂)': 1200,
      '红面澳闪': 2000,
      '蓝化澳闪': 2200
    }
  }
  return {}
}

const fetchPrices = async (species) => {
  try {
    const key = `market_prices|${species}`
    let list = getCache(key, PAIRING_CACHE_TTL)
    if (!Array.isArray(list)) {
      const res = await api.get('/market/prices', { params: { species } })
      list = res.data && res.data.data && Array.isArray(res.data.data.prices) ? res.data.data.prices : (res.data && Array.isArray(res.data.prices) ? res.data.prices : [])
      setCache(key, list)
    }
    const male = {}
    const female = {}
    const neutral = {}
    list.forEach(it => {
      const v = Number(it.reference_price || 0)
      if (it.gender === 'male') male[it.color_name] = v
      else if (it.gender === 'female') female[it.color_name] = v
      else neutral[it.color_name] = v
    })
    const mNorm = normalizePriceMap(species, male)
    const fNorm = normalizePriceMap(species, female)
    const nNorm = normalizePriceMap(species, neutral)
    Object.keys(nNorm).forEach(k => {
      if (mNorm[k] == null) mNorm[k] = nNorm[k]
      if (fNorm[k] == null) fNorm[k] = nNorm[k]
    })
    const hasAny = Object.keys(mNorm).length || Object.keys(fNorm).length || Object.keys(nNorm).length
    if (!hasAny) {
      const d = getDefaultPriceMap(species)
      priceMap.value = d
      priceMapMale.value = d
      priceMapFemale.value = d
    } else {
      const base = Object.keys(nNorm).length ? nNorm : (Object.keys(mNorm).length ? mNorm : fNorm)
      priceMap.value = base
      priceMapMale.value = mNorm
      priceMapFemale.value = fNorm
    }
    computeSuggestions()
  } catch (_) {
    const d = getDefaultPriceMap(species)
    priceMap.value = d
    priceMapMale.value = d
    priceMapFemale.value = d
    computeSuggestions()
  }
}

const evaluateExpectedValue = (species, mIdx, fIdx, ms, fs) => {
  if (!plumageConfig.value) return 0
  const outcomes = analyzeAllOffsprings(species, plumageConfig.value, mIdx, fIdx, ms, fs)
  const pm = priceMap.value || {}
  const pmM = priceMapMale.value || {}
  const pmF = priceMapFemale.value || {}
  let sum = 0
  let total = 0
  outcomes.forEach(o => {
    const cname = canonicalizeColorName(species, o.name)
    const price = o.sex === 'male' ? Number((pmM[cname] != null ? pmM[cname] : pm[cname]) || 0) : Number((pmF[cname] != null ? pmF[cname] : pm[cname]) || 0)
    sum += price
    total += 1
  })
  if (!total) return 0
  return Math.round(sum / total)
}

const computeSuggestions = () => {
  if (selectedSpeciesIndex.value === null || !speciesList.value.length) return
  const species = speciesList.value[selectedSpeciesIndex.value].name
  const ms = motherSplits.value
  const fs = fatherSplits.value
  const mIdx = motherColorIndex.value
  const fIdx = fatherColorIndex.value
  const colors = colorOptions.value
  let bestF = { idx: fIdx, name: colors[fIdx], value: evaluateExpectedValue(species, mIdx, fIdx, ms, fs) }
  for (let i = 0; i < colors.length; i++) {
    const v = evaluateExpectedValue(species, mIdx, i, ms, fs)
    if (v > bestF.value) bestF = { idx: i, name: colors[i], value: v }
  }
  let bestM = { idx: mIdx, name: colors[mIdx], value: evaluateExpectedValue(species, mIdx, fIdx, ms, fs) }
  for (let i = 0; i < colors.length; i++) {
    const v = evaluateExpectedValue(species, i, fIdx, ms, fs)
    if (v > bestM.value) bestM = { idx: i, name: colors[i], value: v }
  }
  const avg = evaluateExpectedValue(species, mIdx, fIdx, ms, fs)
  bestFatherSuggestion.value = { colorName: bestF.name, expectedValue: bestF.value }
  bestMotherSuggestion.value = { colorName: bestM.name, expectedValue: bestM.value }
  expectedAveragePrice.value = avg
}

const loadRecords = async (force = false) => {
  try {
    const key = 'pairings_records'
    let list = (!force && getCache(key, PAIRING_CACHE_TTL)) || null
    if (!Array.isArray(list)) {
      const res = await api.get('/pairings')
      list = (res.data && res.data.success && Array.isArray(res.data.data)) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      setCache(key, list)
    }
    records.value = list
  } catch (_) {
    records.value = []
  }
}

const savePairing = async () => {
  try {
    const species = speciesList.value[selectedSpeciesIndex.value]
    if (!species) { ElMessage.warning('请选择品种'); return }
    const payload = {
      species: species.name,
      motherColor: colorOptions.value[motherColorIndex.value],
      fatherColor: colorOptions.value[fatherColorIndex.value],
      motherSplits: motherSplits.value.map(id => (splitOptions.value.find(s => s.id === id)?.name || id)),
      fatherSplits: fatherSplits.value.map(id => (splitOptions.value.find(s => s.id === id)?.name || id)),
      expectedAveragePrice: Number(expectedAveragePrice.value || 0),
      results: results.value.map(r => ({ label: r.splitNames ? `${r.name} (携带${r.splitNames})` : r.name, prob: r.prob }))
    }
    const res = await api.post('/pairings', payload)
    const ok = res.data && res.data.success
    if (!ok) throw new Error((res.data && res.data.message) || '保存失败')
    ElMessage.success('已保存配对')
    activeTab.value = 'records'
    await loadRecords(true)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  }
}

const deleteRecord = async (idx) => {
  try {
    const item = records.value[idx]
    const id = item && item.id
    if (!id) {
      // 兼容旧本地记录：直接移除
      const list = [...records.value]
      list.splice(idx, 1)
      records.value = list
      return
    }
    const res = await api.delete(`/pairings/${id}`)
    const ok = res.data && res.data.success
    if (!ok) throw new Error((res.data && res.data.message) || '删除失败')
    ElMessage.success('已删除')
    await loadRecords(true)
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

const clearAll = async () => {
  try {
    const res = await api.delete('/pairings')
    const ok = res.data && res.data.success
    if (!ok) throw new Error((res.data && res.data.message) || '清空失败')
    records.value = []
    ElMessage.success('已清空')
    setCache('pairings_records', [])
  } catch (e) {
    ElMessage.error(e.message || '清空失败')
  }
}
</script>

<style scoped>
.pairing-container {
  padding-bottom: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.pairing-container :deep(.el-table th .cell) { font-size: 16px; }
.pairing-container :deep(.el-table td .cell) { font-size: 16px; }

/* 标题由全局 .page-header 控制 */

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
.calculate-section { margin-top: 16px; }
.record-card { margin-bottom: 16px; }
.record-header { font-weight: 500; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.record-delete-btn { flex: 0 0 auto; }
.record-body .label { color: #909399; margin-right: 6px; }
.record-results { margin-top: 10px; }

.suggestion-card {
  margin-top: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}
.suggestion-title { font-weight: 600; margin-bottom: 6px; }
.suggestion-detail { color: #4b5563; }

.avg-box { display: flex; align-items: baseline; gap: 12px; padding: 12px 0; }
.avg-value { font-size: 20px; font-weight: 700; color: #10b981; }
.avg-hint { color: #6b7280; font-size: 13px; }

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
