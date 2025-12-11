// pages/care-guide/care-guide.js
const app = getApp()

Page({
  data: {
    pageThemeClass: '',
    loading: true,
    error: '',
    // 旧版：通用 sections
    sections: [],
    // 新增：个性化数据
    speciesTabs: [], // [{ key: 'general', name: '通用建议' }, { key, name }...]
    activeTabKey: 'general',
    guidesMap: {}, // { key: { display_name, sections } }
    generalSections: [],
    // 智能建议弹窗状态
    smartAdviceVisible: false,
    smartAdviceItems: [],
    smartAdviceError: '',
    preselectTabKey: ''
  },

  onLoad(options) {
    const preselectTabKey = (options && (options.tab || options.key || options.category)) ? String(options.tab || options.key || options.category) : ''
    if (preselectTabKey) this.setData({ preselectTabKey })
    // 简单主题适配：若全局提供主题信息可应用暗色主题类
    try {
      const theme = app.globalData.theme || 'system'
      if (theme === 'dark') {
        this.setData({ pageThemeClass: 'theme-dark' })
      } else {
        this.setData({ pageThemeClass: '' })
      }
    } catch (_) {}

    // 优先拉取个性化护理指南；失败则回退到通用指南
    this.fetchPersonalizedCareGuide()
  }
  ,

  fetchPersonalizedCareGuide() {
    this.setData({ loading: true, error: '' })
    app.request({ url: '/api/care-guide/personalized' })
      .then(res => {
        if (res && res.success && res.data) {
          const data = res.data || {}
          const generalSections = Array.isArray(data.general && data.general.sections) ? data.general.sections : []

          // 仅保留通用建议 + 雏鸟0-45天指南
          const chickCare = require('../../utils/chick-care.js')
          const chickKey = 'chick_0_45'
          const chickName = '手养雏鸟 0-45天'
          const chickSections = chickCare.getChickCareGuideSections()
          const nextTabs = [{ key: 'general', name: '通用建议' }, { key: chickKey, name: chickName }]
          const nextGuides = { [chickKey]: { display_name: chickName, sections: chickSections } }
          const desired = this.data.preselectTabKey || ''
          const candidates = nextTabs.map(t => t.key)
          const firstKey = (desired && candidates.includes(desired)) ? desired : (nextTabs[0]?.key || 'general')
          this.setData({
            speciesTabs: nextTabs,
            guidesMap: nextGuides,
            generalSections,
            activeTabKey: firstKey,
            sections: firstKey === 'general' ? generalSections : ((nextGuides[firstKey] && nextGuides[firstKey].sections) || [])
          })
        } else {
          // 非成功返回：回退至通用
          this.fetchCareGuide()
        }
      })
      .catch(_ => {
        // 游客模式或网络错误：回退至通用
        this.fetchCareGuide()
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  fetchCareGuide() {
    this.setData({ loading: true, error: '' })
    app.request({ url: '/api/care-guide' })
      .then(res => {
        if (res && res.success && res.data) {
          const sections = Array.isArray(res.data.sections) ? res.data.sections : []
          // 直接使用后端结构；若未来提供 iconUrl 可直接渲染
          const chickCare = require('../../utils/chick-care.js')
          const chickKey = 'chick_0_45'
          const chickName = '手养雏鸟 0-45天'
          const chickSections = chickCare.getChickCareGuideSections()
          const tabs = [{ key: 'general', name: '通用建议' }, { key: chickKey, name: chickName }]
          const guides = { [chickKey]: { display_name: chickName, sections: chickSections } }
          const desired = this.data.preselectTabKey || ''
          const keys = tabs.map(t => t.key)
          const active = (desired && keys.includes(desired)) ? desired : 'general'
          const nextSections = active === 'general' ? sections : ((guides[active] && guides[active].sections) || [])
          this.setData({
            sections: nextSections,
            generalSections: sections,
            speciesTabs: tabs,
            guidesMap: guides,
            activeTabKey: active,
            loading: false
          })
        } else {
          this.setData({ error: res && res.message ? res.message : '加载失败', loading: false })
        }
      })
      .catch(err => {
        this.setData({ error: (err && err.message) || '网络错误', loading: false })
      })
  },

  // 切换品种 Tab
  selectSpeciesTab(e) {
    const key = e.currentTarget?.dataset?.key || 'general'
    const { guidesMap, generalSections } = this.data
    const sections = key === 'general' ? generalSections : ((guidesMap[key] && guidesMap[key].sections) || [])
    // 生成新数组副本，确保渲染引擎检测到变更
    const nextSections = JSON.parse(JSON.stringify(sections || []))
    this.setData({ activeTabKey: key, sections: nextSections })
  },

  // 触发智能建议（llm=true）
  onSmartAdviceTap() {
    this.setData({ smartAdviceVisible: true, smartAdviceError: '', smartAdviceItems: [] })
    try { app.showLoading('生成智能建议...') } catch (_) {}
    app.request({ url: '/api/ai/care-coach?llm=true' })
      .then(res => {
        if (res && res.success) {
          const items = (res.data && res.data.items) || []
          this.setData({ smartAdviceItems: items })
        } else {
          this.setData({ smartAdviceError: (res && res.message) || '生成失败' })
        }
      })
      .catch(err => {
        this.setData({ smartAdviceError: (err && err.message) || '网络错误' })
      })
      .finally(() => {
        try { app.hideLoading() } catch (_) {}
      })
  },

  // 关闭智能建议弹窗
  closeSmartAdvice() {
    this.setData({ smartAdviceVisible: false })
  },

  // 空方法，阻止事件穿透
  noop() {},

  onHeaderBack() {
    try {
      const pages = getCurrentPages()
      if (Array.isArray(pages) && pages.length > 1) {
        wx.navigateBack({ delta: 1 })
      } else {
        wx.reLaunch({ url: '/pages/index/index' })
      }
    } catch (_) {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})
