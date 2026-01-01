<template>
  <div class="care-container page-container">
    <div class="page-header">
      <h2>护理指南</h2>
    </div>

    <div v-if="loading" class="loading-box">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else>
      <div class="tabs">
        <el-tabs v-model="activeTabKey" @tab-click="onTabClick">
          <el-tab-pane v-for="t in speciesTabs" :key="t.key" :label="t.name" :name="t.key" />
        </el-tabs>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div class="sections">
        <el-card v-for="sec in sections" :key="sec.title" class="section-card" shadow="never">
          <template #header>
            <div class="section-title">{{ sec.title }}</div>
          </template>
          <div class="items">
            <div v-for="it in (sec.items || [])" :key="it.text" class="item">
              <div class="item-text">{{ it.text }}</div>
            </div>
          </div>
        </el-card>
      </div>

      <div class="footer-tip">内容为通用建议，具体健康问题请咨询专业兽医。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { getCache, setCache } from '@/utils/cache'

const loading = ref(true)
const error = ref('')
const sections = ref([])
const speciesTabs = ref([])
const guidesMap = ref({})
const activeTabKey = ref('general')

const CARE_CACHE_TTL = 60000
const CARE_GENERAL_KEY = 'care_general'
const CARE_PERSONALIZED_KEY = 'care_personalized'

const selectTab = (key) => {
  activeTabKey.value = key
  if (key === 'general') {
    sections.value = generalSections.value
  } else {
    const g = guidesMap.value[key]
    sections.value = (g && Array.isArray(g.sections)) ? g.sections : []
  }
}

const generalSections = ref([])

const onTabClick = (pane) => {
  selectTab(pane.props.name)
}

const buildChickGuide = () => {
  const envItems = [
    { text: '1-5天：环境温度35-36℃，环境湿度63-68%' },
    { text: '6-10天：环境温度33-35℃，环境湿度60-66%' },
    { text: '11-15天：环境温度32-33℃，环境湿度59-64%' },
    { text: '16-21天：环境温度29-32℃，环境湿度57-62%' },
    { text: '22-28天：环境温度26-29℃，环境湿度54-60%' },
    { text: '29-35天：环境温度26-29℃，环境湿度50-58%' },
    { text: '断奶期：环境温度26-29℃，环境湿度约55%' }
  ]
  const feedItems = [
    { text: '1-4天：2h/次，每餐1-2ml；食物：奶粉；食物温度38-40℃' },
    { text: '5-7天：3h/次，每餐2-3ml；食物：奶粉；食物温度38-40℃' },
    { text: '8-14天：5次/天，每餐4-6ml；食物：奶粉+蛋黄；食物温度38-40℃' },
    { text: '15-24天：4次/天，每餐7-10ml；食物：奶粉+蛋黄；食物温度38-40℃' },
    { text: '25-34天：3次/天，每餐11-15ml；食物：小米+蛋黄；食物温度30-35℃' },
    { text: '35-44天：2次/天，每餐11-15ml；食物：小米+蛋黄；食物温度28-32℃' },
    { text: '45天-断奶：1次/天，每餐11-15ml；食物：小米+蛋黄；食物温度28-33℃' }
  ]
  const tips = [
    { text: '开食时机：刚出壳先喂温水或电解质水，排便后再喂奶' },
    { text: '奶粉冲泡：50-60℃热水冲泡，冷却至38-40℃再喂，过热易烫伤，过冷易积食' },
    { text: '异常处理：出现积食/炸毛，先保温至28-32℃，必要时调整保温箱温度' },
    { text: '呼吸道护理：湿度约60%，避免过干风暖加重呼吸道问题' },
    { text: '个体差异：以上数据仅作参考，按消化能力调整餐次与餐量，消化慢适合流食' }
  ]
  const keyPoints = [
    { text: '严格控制环境温度、湿度与食物温度' },
    { text: '根据消化情况动态调整喂食量与食物性状' },
    { text: '遇病首要原则是保温' }
  ]
  return [
    { title: '环境温湿度', items: envItems },
    { title: '喂食与食物', items: feedItems },
    { title: '温馨提示', items: tips },
    { title: '核心要点', items: keyPoints }
  ]
}

const fetchPersonalized = async () => {
  try {
    const cached = getCache(CARE_PERSONALIZED_KEY, CARE_CACHE_TTL)
    if (cached && typeof cached === 'object') {
      const general = Array.isArray((cached.general || {}).sections) ? (cached.general.sections || []) : []
      const chickKey = 'chick_0_45'
      const chickName = '手养雏鸟 0-45天'
      const chickSections = buildChickGuide()
      speciesTabs.value = [{ key: 'general', name: '通用建议' }, { key: chickKey, name: chickName }]
      guidesMap.value = { [chickKey]: { display_name: chickName, sections: chickSections } }
      generalSections.value = general
      const desired = activeTabKey.value
      const keys = speciesTabs.value.map(t => t.key)
      const active = (desired && keys.includes(desired)) ? desired : 'general'
      selectTab(active)
      error.value = ''
      return true
    }
    const res = await api.get('/care-guide/personalized')
    if (res.data && res.data.success) {
      const data = res.data.data || {}
      const general = Array.isArray((data.general || {}).sections) ? (data.general.sections || []) : []
      const chickKey = 'chick_0_45'
      const chickName = '手养雏鸟 0-45天'
      const chickSections = buildChickGuide()
      speciesTabs.value = [{ key: 'general', name: '通用建议' }, { key: chickKey, name: chickName }]
      guidesMap.value = { [chickKey]: { display_name: chickName, sections: chickSections } }
      generalSections.value = general
      setCache(CARE_PERSONALIZED_KEY, { general: { sections: general } })
      const desired = activeTabKey.value
      const keys = speciesTabs.value.map(t => t.key)
      const active = (desired && keys.includes(desired)) ? desired : 'general'
      selectTab(active)
      error.value = ''
      return true
    }
    return false
  } catch (e) {
    return false
  }
}

const fetchGeneral = async () => {
  const cached = getCache(CARE_GENERAL_KEY, CARE_CACHE_TTL)
  let secs = []
  let ok = false
  if (cached && Array.isArray(cached)) {
    secs = cached
    ok = true
  } else {
    const res = await api.get('/care-guide')
    ok = res.data && res.data.success
    secs = ok ? (Array.isArray(res.data.data.sections) ? res.data.data.sections : []) : []
    if (ok) setCache(CARE_GENERAL_KEY, secs)
  }
  const chickKey = 'chick_0_45'
  const chickName = '手养雏鸟 0-45天'
  const chickSections = buildChickGuide()
  speciesTabs.value = [{ key: 'general', name: '通用建议' }, { key: chickKey, name: chickName }]
  guidesMap.value = { [chickKey]: { display_name: chickName, sections: chickSections } }
  generalSections.value = secs
  selectTab('general')
  error.value = ok ? '' : (res.data && res.data.message ? res.data.message : '加载失败')
}

onMounted(async () => {
  loading.value = true
  const ok = await fetchPersonalized()
  if (!ok) await fetchGeneral()
  loading.value = false
})
</script>

<style scoped>
.care-container { padding-bottom: 20px; }
.loading-box { background: #fff; padding: 16px; border-radius: 8px; }
.tabs { background: #fff; border-radius: 8px; padding: 8px 12px; }
.sections { margin-top: 12px; display: grid; grid-template-columns: 1fr; gap: 12px; }
.section-card { border-radius: 12px; }
.section-title { font-weight: 600; color: var(--text-primary); }
.items { display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: flex-start; gap: 10px; }
.emoji { font-size: 18px; }
.icon-img { width: 20px; height: 20px; object-fit: contain; }
.item-text { font-size: 14px; color: #444; line-height: 1.6; }
.footer-tip { margin-top: 8px; color: #909399; font-size: 12px; }
@media (min-width: 960px) { .sections { grid-template-columns: 1fr 1fr; } }
</style>
