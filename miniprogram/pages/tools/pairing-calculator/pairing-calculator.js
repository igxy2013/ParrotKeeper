const app = getApp()

Page({
  data: {
    speciesOptions: [],
    speciesIndex: 0,
    speciesDataList: [],
    plumageConfig: null,
    activeTab: 'calculator',
    records: [],
    
    // 颜色列表
    colorOptions: [],
    motherColorIndex: 0,
    fatherColorIndex: 0,
    
    // 携带基因选项 (Splits)
    availableSplits: [], 
    motherSplits: [], 
    fatherSplits: [],
    
    results: [],
    sexBreakdown: { male: [], female: [] },
    priceMap: {},
    priceMapMale: {},
    priceMapFemale: {},
    expectedAveragePrice: 0,
    bestFatherSuggestion: null,
    bestMotherSuggestion: null,
    
    // 调试或提示
    unsupportedHint: ''
  },

  async onLoad(options) {
    const isLogin = app.globalData.isLogin || app.checkLoginStatus()
    if (!isLogin) {
      wx.showToast({ title: '请先登录后使用此功能', icon: 'none' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
      return
    }
    try { wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] }) } catch (_) {}
    const si = typeof options === 'object' && options ? Number(options.si || options.speciesIndex || 0) : 0
    const mi = typeof options === 'object' && options ? Number(options.mi || options.motherColorIndex || 0) : 0
    const fi = typeof options === 'object' && options ? Number(options.fi || options.fatherColorIndex || 0) : 0
    const ms = typeof options === 'object' && options && (options.ms || options.motherSplits) ? String(options.ms || options.motherSplits).split(',').filter(Boolean) : []
    const fs = typeof options === 'object' && options && (options.fs || options.fatherSplits) ? String(options.fs || options.fatherSplits).split(',').filter(Boolean) : []
    await this.loadSpeciesFromBackend()
    const hasSi = typeof options === 'object' && options && (options.si != null || options.speciesIndex != null)
    const defIdx = this.data.speciesOptions.indexOf('和尚鹦鹉')
    const targetIdx = hasSi ? si : (defIdx >= 0 ? defIdx : 0)
    this.updateSpeciesData(targetIdx)
    this.setData({ motherColorIndex: mi, fatherColorIndex: fi, motherSplits: ms, fatherSplits: fs }, () => {
      this.compute()
      const species = this.data.speciesOptions[this.data.speciesIndex]
      this.fetchPrices(species)
    })
  },

  onShow() {
    const isLogin = app.globalData.isLogin || app.checkLoginStatus()
    if (!isLogin) {
      wx.showToast({ title: '请先登录后使用此功能', icon: 'none' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
      return
    }
    if (this.data.activeTab === 'records') {
      this.loadRecords()
    }
  },

  onSpeciesChange(e) {
    const idx = Number(e.detail.value) || 0
    this.updateSpeciesData(idx)
  },

  updateSpeciesData(idx) {
    const species = this.data.speciesOptions[idx]
    const row = this.data.speciesDataList[idx]
    let config = null
    try { config = row && row.plumage_json ? JSON.parse(row.plumage_json) : null } catch(_) { config = null }
    this.setData({ speciesIndex: idx, plumageConfig: config })
    if (!config || !config.colors || !config.loci) {
      this.setData({ colorOptions: [], availableSplits: [], motherColorIndex: 0, fatherColorIndex: 0, motherSplits: [], fatherSplits: [], priceMap: {}, bestFatherSuggestion: null, bestMotherSuggestion: null })
      return
    }
    const colors = config.colors.map(c => c.name)
    
    const splits = []
    for (const [key, gene] of Object.entries(config.loci)) {
      if ((gene.type === 'autosomal' && !gene.incomplete) || gene.type === 'sex-linked') {
        if (!gene.incomplete) {
          splits.push({ id: key, name: gene.label })
        }
      }
    }

    this.setData({
      colorOptions: colors,
      motherColorIndex: 0,
      fatherColorIndex: 0,
      availableSplits: splits,
      motherSplits: [],
      fatherSplits: [],
      priceMap: {},
      bestFatherSuggestion: null,
      bestMotherSuggestion: null
    }, () => {
      this.compute()
      this.fetchPrices(species)
    })
  },

  onMotherPlumageChange(e) {
    const { colorIndex, splitIds } = e.detail
    this.setData({ 
      motherColorIndex: colorIndex,
      motherSplits: splitIds 
    }, () => { 
      this.compute(); 
      this.computeSuggestions() 
    })
  },

  onFatherPlumageChange(e) {
    const { colorIndex, splitIds } = e.detail
    this.setData({ 
      fatherColorIndex: colorIndex,
      fatherSplits: splitIds 
    }, () => { 
      this.compute(); 
      this.computeSuggestions() 
    })
  },

  onMotherColorChange(e) {
    this.setData({ motherColorIndex: Number(e.detail.value) }, () => { this.compute(); this.computeSuggestions() })
  },
  onFatherColorChange(e) {
    this.setData({ fatherColorIndex: Number(e.detail.value) }, () => { this.compute(); this.computeSuggestions() })
  },
  onMotherSplitsChange(e) {
    this.setData({ motherSplits: e.detail.value }, () => { this.compute(); this.computeSuggestions() })
  },
  onFatherSplitsChange(e) {
    this.setData({ fatherSplits: e.detail.value }, () => { this.compute(); this.computeSuggestions() })
  },

  
  compute() {
    const config = this.data.plumageConfig
    if (!config) { this.setData({ results: [], sexBreakdown: { male: [], female: [] } }); return }
    
    const mColorConfig = config.colors[this.data.motherColorIndex]
    const fColorConfig = config.colors[this.data.fatherColorIndex]

    // 1. 构建父母基因型对象
    const motherGenotype = this.buildGenotype(config, mColorConfig.genes, this.data.motherSplits, 'female')
    const fatherGenotype = this.buildGenotype(config, fColorConfig.genes, this.data.fatherSplits, 'male')

    // 2. 生成配子 (Gametes)
    const mGametes = this.generateGametes(config, motherGenotype)
    const fGametes = this.generateGametes(config, fatherGenotype)

    // 3. 组合配子生成子代
    const offsprings = []
    for (const mg of mGametes) {
      for (const fg of fGametes) {
        offsprings.push(this.combineGametes(config, mg, fg))
      }
    }

    // 4. 分析子代表现型
    const analyzed = offsprings.map(o => this.analyzeOffspring(config, o))
    
    // 5. 统计结果
    this.aggregateResults(analyzed)
    this.computeSuggestions()
  },

  fetchPrices(species) {
    const app = getApp()
    app.request({ url: '/api/market/prices', method: 'GET', data: { species } })
      .then(res => {
        const list = res && res.data && Array.isArray(res.data.prices) ? res.data.prices : []
        const male = {}
        const female = {}
        const neutral = {}
        list.forEach(it => {
          const v = Number(it.reference_price || 0)
          if (it.gender === 'male') male[it.color_name] = v
          else if (it.gender === 'female') female[it.color_name] = v
          else neutral[it.color_name] = v
        })
        const mNorm = this.normalizePriceMap(species, male)
        const fNorm = this.normalizePriceMap(species, female)
        const nNorm = this.normalizePriceMap(species, neutral)
        Object.keys(nNorm).forEach(k => {
          if (mNorm[k] == null) mNorm[k] = nNorm[k]
          if (fNorm[k] == null) fNorm[k] = nNorm[k]
        })
        const hasAny = Object.keys(mNorm).length || Object.keys(fNorm).length || Object.keys(nNorm).length
        if (!hasAny) {
          const d = this.getDefaultPriceMap(species)
          this.setData({ priceMap: d, priceMapMale: d, priceMapFemale: d }, () => this.computeSuggestions())
        } else {
          const base = Object.keys(nNorm).length ? nNorm : (Object.keys(mNorm).length ? mNorm : fNorm)
          this.setData({ priceMap: base, priceMapMale: mNorm, priceMapFemale: fNorm }, () => this.computeSuggestions())
        }
      })
      .catch(() => {
        const defaults = this.getDefaultPriceMap(species)
        this.setData({ priceMap: defaults, priceMapMale: defaults, priceMapFemale: defaults }, () => this.computeSuggestions())
      })
  },

  canonicalizeColorName(species, name) {
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
  },

  normalizePriceMap(species, map) {
    const m = { ...(map || {}) }
    const remapped = {}
    Object.keys(m).forEach(k => {
      const ck = this.canonicalizeColorName(species, k)
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
        '派特桃': ['蓝派特','派特']
      }
      Object.keys(alias).forEach(canon => {
        const syns = alias[canon]
        syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
      })
    } else if (species === '小太阳鹦鹉') {
      const alias = {
        '派特小太阳': ['小太阳派特']
      }
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
  },

  getDefaultPriceMap(species) {
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
  },

  simulatePairing(species, mIdx, fIdx, ms, fs) {
    const config = this.data.plumageConfig
    if (!config) return []
    const mColorConfig = config.colors[mIdx]
    const fColorConfig = config.colors[fIdx]
    const motherGenotype = this.buildGenotype(config, mColorConfig.genes, ms, 'female')
    const fatherGenotype = this.buildGenotype(config, fColorConfig.genes, fs, 'male')
    const mGametes = this.generateGametes(config, motherGenotype)
    const fGametes = this.generateGametes(config, fatherGenotype)
    const offsprings = []
    for (const mg of mGametes) {
      for (const fg of fGametes) {
        offsprings.push(this.combineGametes(config, mg, fg))
      }
    }
    const analyzed = offsprings.map(o => this.analyzeOffspring(config, o))
    const total = analyzed.length
    const map = {}
    analyzed.forEach(o => { map[o.name] = (map[o.name] || 0) + 1 })
    const results = Object.keys(map).map(k => ({ name: k, prob: map[k] / total }))
    return results
  },

  evaluateExpectedValue(species, mIdx, fIdx, ms, fs) {
    const config = this.data.plumageConfig
    if (!config) return 0
    const mColorConfig = config.colors[mIdx]
    const fColorConfig = config.colors[fIdx]
    const motherGenotype = this.buildGenotype(config, mColorConfig.genes, ms, 'female')
    const fatherGenotype = this.buildGenotype(config, fColorConfig.genes, fs, 'male')
    const mGametes = this.generateGametes(config, motherGenotype)
    const fGametes = this.generateGametes(config, fatherGenotype)
    const pm = this.data.priceMap || {}
    const pmM = this.data.priceMapMale || {}
    const pmF = this.data.priceMapFemale || {}
    let sum = 0
    let total = 0
    for (const mg of mGametes) {
      for (const fg of fGametes) {
        const z = this.combineGametes(config, mg, fg)
        const o = this.analyzeOffspring(config, z)
        const cname = this.canonicalizeColorName(species, o.name)
        const price = o.sex === 'male' ? Number((pmM[cname] != null ? pmM[cname] : pm[cname]) || 0) : Number((pmF[cname] != null ? pmF[cname] : pm[cname]) || 0)
        sum += price
        total += 1
      }
    }
    if (!total) return 0
    return sum / total
  },

  computeSuggestions() {
    const species = this.data.speciesOptions[this.data.speciesIndex]
    const ms = this.data.motherSplits
    const fs = this.data.fatherSplits
    const mIdx = this.data.motherColorIndex
    const fIdx = this.data.fatherColorIndex
    const colors = this.data.colorOptions
    let bestF = { idx: fIdx, name: colors[fIdx], value: this.evaluateExpectedValue(species, mIdx, fIdx, ms, fs) }
    for (let i = 0; i < colors.length; i++) {
      const v = this.evaluateExpectedValue(species, mIdx, i, ms, fs)
      if (v > bestF.value) bestF = { idx: i, name: colors[i], value: v }
    }
    let bestM = { idx: mIdx, name: colors[mIdx], value: this.evaluateExpectedValue(species, mIdx, fIdx, ms, fs) }
    for (let i = 0; i < colors.length; i++) {
      const v = this.evaluateExpectedValue(species, i, fIdx, ms, fs)
      if (v > bestM.value) bestM = { idx: i, name: colors[i], value: v }
    }
    const avg = this.evaluateExpectedValue(species, mIdx, fIdx, ms, fs)
    this.setData({
      bestFatherSuggestion: { colorName: bestF.name, expectedValue: Math.round(bestF.value) },
      bestMotherSuggestion: { colorName: bestM.name, expectedValue: Math.round(bestM.value) },
      expectedAveragePrice: Math.round(avg)
    })
  },

  mapSplitLabels(species, ids) {
    const config = this.data.plumageConfig
    if (!config) return []
    const labels = []
    ids.forEach(id => { const gene = config.loci[id]; if (gene) labels.push(gene.label) })
    return labels
  },

  async savePairing() {
    const species = this.data.speciesOptions[this.data.speciesIndex]
    const colors = this.data.colorOptions
    const motherColor = colors[this.data.motherColorIndex]
    const fatherColor = colors[this.data.fatherColorIndex]
    const motherSplitsLabels = this.mapSplitLabels(species, this.data.motherSplits || [])
    const fatherSplitsLabels = this.mapSplitLabels(species, this.data.fatherSplits || [])
    const record = {
      species,
      motherColor,
      fatherColor,
      motherSplits: motherSplitsLabels,
      fatherSplits: fatherSplitsLabels,
      expectedAveragePrice: Number(this.data.expectedAveragePrice || 0),
      bestFatherSuggestion: this.data.bestFatherSuggestion || null,
      bestMotherSuggestion: this.data.bestMotherSuggestion || null,
      results: this.data.results || [],
      createdAt: Date.now()
    }
    try {
      const res = await app.request({ url: '/api/pairings', method: 'POST', data: record })
      if (res && res.success) {
        wx.showToast({ title: '已保存' })
        await this.loadRecords()
        this.setData({ activeTab: 'records' }, () => {
          wx.pageScrollTo({ scrollTop: 0, duration: 0 })
        })
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  goPairingRecords() {
    this.setData({ activeTab: 'records' }, () => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    })
    this.loadRecords()
  },

  noop() {},

  switchTab(e) {
    const tab = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab) || ''
    if (tab === 'records') {
      this.setData({ activeTab: 'records' }, () => {
        wx.pageScrollTo({ scrollTop: 0, duration: 0 })
      })
      this.loadRecords()
    } else {
      this.setData({ activeTab: 'calculator' })
    }
  },

  async loadRecords() {
    try {
      const res = await app.request({ url: '/api/pairings', method: 'GET' })
      const list = (res && res.success && Array.isArray(res.data)) ? res.data : []
      const mapped = list.map((it) => {
        const raw = it.createdAt !== undefined ? it.createdAt : (it.created_at !== undefined ? it.created_at : (it.createdAtTs !== undefined ? it.createdAtTs : it.created_at_ts))
        const ts = this.normalizeTimestamp(raw)
        return { ...it, createdAtText: ts ? this.formatTime(ts) : '' }
      })
      this.setData({ records: mapped })
    } catch (_) {
      this.setData({ records: [] })
    }
  },

  normalizeTimestamp(val) {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'number' && !isNaN(val)) {
      const n = val
      return n < 1000000000000 ? n * 1000 : n
    }
    const s = String(val)
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (!isFinite(n)) return 0
      return n < 1000000000000 ? n * 1000 : n
    }
    const t = Date.parse(s)
    return isNaN(t) ? 0 : t
  },

  formatTime(ts) {
    try {
      const d = new Date(ts)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    } catch (_) {
      return ''
    }
  },

  async deleteRecord(e) {
    const id = Number(e.currentTarget.dataset.id || 0)
    if (!id) return
    try {
      const res = await app.request({ url: `/api/pairings/${id}`, method: 'DELETE' })
      if (res && res.success) {
        wx.showToast({ title: '已删除' })
        await this.loadRecords()
      } else {
        wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  clearAll() {
    wx.showModal({
      title: '清空确认',
      content: '确定清空所有配对记录？',
      success: async (r) => {
        if (r.confirm) {
          try {
            const res = await app.request({ url: '/api/pairings', method: 'DELETE' })
            if (res && res.success) {
              this.setData({ records: [] })
              wx.showToast({ title: '已清空' })
            } else {
              wx.showToast({ title: (res && res.message) || '清空失败', icon: 'none' })
            }
          } catch (_) {
            wx.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  },

  buildShareQuery() {
    const si = Number(this.data.speciesIndex || 0)
    const mi = Number(this.data.motherColorIndex || 0)
    const fi = Number(this.data.fatherColorIndex || 0)
    const ms = Array.isArray(this.data.motherSplits) ? this.data.motherSplits.join(',') : ''
    const fs = Array.isArray(this.data.fatherSplits) ? this.data.fatherSplits.join(',') : ''
    return `si=${si}&mi=${mi}&fi=${fi}&ms=${encodeURIComponent(ms)}&fs=${encodeURIComponent(fs)}`
  },

  onShareAppMessage() {
    const species = this.data.speciesOptions[this.data.speciesIndex] || '鹦鹉配对计算器'
    const title = `鹦鹉配对计算器｜${species}`
    const path = `/pages/tools/pairing-calculator/pairing-calculator?${this.buildShareQuery()}`
    return { title, path, imageUrl: '/images/logo.png' }
  },

  onShareTimeline() {
    const species = this.data.speciesOptions[this.data.speciesIndex] || '鹦鹉配对计算器'
    const title = `鹦鹉配对计算器｜${species}`
    const query = this.buildShareQuery()
    return { title, query, imageUrl: '/images/logo.png' }
  },

  buildGenotype(config, visualGenes, splitList, sex) {
    const genotype = {}
    for (const [key, gene] of Object.entries(config.loci)) {
      const isVisual = (visualGenes && visualGenes[key] != null) ? visualGenes[key] : 0 
      const isSplit = Array.isArray(splitList) && splitList.includes(key)
      
      if (gene.type === 'autosomal') {
        if (gene.incomplete) {
            // For incomplete dominant genes
            if (isVisual === 2) genotype[key] = [1, 1]
            else if (isVisual === 1) genotype[key] = [1, 0]
            else if (isSplit) genotype[key] = [1, 0]
            else genotype[key] = [0, 0]
            
        } else {
            // Standard Recessive
            if (isVisual === 2) genotype[key] = [1, 1]
            else if (isVisual === 1) genotype[key] = [1, 0] // Handle user preset "blue: 1" for 绿金顶
            else if (isVisual) genotype[key] = [1, 1] // Fallback
            else if (isSplit) genotype[key] = [1, 0]
            else genotype[key] = [0, 0]
        }
      } else {
        if (sex === 'male') {
          if (isVisual) genotype[key] = [1, 1]
          else if (isSplit) genotype[key] = [1, 0]
          else genotype[key] = [0, 0]
        } else {
          if (isVisual) genotype[key] = [1, -1]
          else genotype[key] = [0, -1]
        }
      }
    }
    genotype['_sex'] = (sex === 'male') ? [0, 0] : [0, 1]
    return genotype
  },

  generateGametes(config, genotype) {
    const keys = Object.keys(genotype)
    let gametes = [{}] 
    
    for (const key of keys) {
      const alleles = genotype[key]
      const newGametes = []
      
      // 优化：如果两个等位基因相同，不进行分裂
      if (alleles[0] === alleles[1]) {
        for (const g of gametes) {
          const g1 = { ...g, [key]: alleles[0] }
          newGametes.push(g1)
        }
      } else {
        for (const g of gametes) {
          const g1 = { ...g, [key]: alleles[0] }
          const g2 = { ...g, [key]: alleles[1] }
          newGametes.push(g1, g2)
        }
      }
      gametes = newGametes
    }
    return gametes
  },

  combineGametes(config, g1, g2) {
    const zygote = {}
    for (const key of Object.keys(g1)) {
      zygote[key] = [g1[key], g2[key]].sort((a, b) => b - a)
    }
    return zygote
  },

  analyzeOffspring(config, zygote) {
    const sexAlleles = zygote['_sex']
    const isFemale = sexAlleles.includes(1) 
    const sex = isFemale ? 'female' : 'male'
    
    let visualParts = []
    let splitParts = []

    for (const [key, gene] of Object.entries(config.loci)) {
      const alleles = zygote[key]
      
      let isVisual = false
      let isSplit = false
      
      if (gene.type === 'sex-linked') {
        if (isFemale) {
           const zAllele = alleles.find(a => a !== -1)
           if (zAllele === 1) isVisual = true
        } else {
           if (alleles[0] === 1 && alleles[1] === 1) isVisual = true
           else if (alleles.includes(1)) isSplit = true
        }
      } else {
        if (gene.incomplete) {
          const count = alleles.filter(a => a === 1).length
          if (count === 2) {
             visualParts.push({ gene: key, count: 2 }) 
          } else if (count === 1) {
             visualParts.push({ gene: key, count: 1 })
          }
        } else {
          // Standard Recessive
          if (alleles[0] === 1 && alleles[1] === 1) isVisual = true
          else if (alleles.includes(1)) isSplit = true
        }
      }

      if (isVisual && !gene.incomplete) visualParts.push({ gene: key, count: 1 })
      if (isSplit) splitParts.push({ gene: key })
    }

    const name = this.generateName(config, visualParts, splitParts, sex)
    
    let displaySplits = splitParts.map(s => config.loci[s.gene].label)
    if (name.includes('绿金顶')) {
        displaySplits = displaySplits.filter(l => l !== '蓝化(g)')
    }
    
    const splitStr = displaySplits.join('、')
    const fullName = name + (splitStr ? ` (携带${splitStr})` : '')
    
    return { sex, name, fullName, splitNames: splitStr }
  },

  generateName(config, visuals, splits, sex) {
    const genes = {}
    visuals.forEach(v => genes[v.gene] = v.count)
    const splitGenes = {}
    splits.forEach(s => splitGenes[s.gene] = true)
    
    const species = this.data.speciesOptions[this.data.speciesIndex]

    if (species === '小太阳鹦鹉') {
       let base = '绿颊小太阳（原始）'
       const isTurq = genes['turquoise']
       const isDilute = genes['dilute']
       const isCin = genes['cinnamon']
       const isOp = genes['opaline']
      const isPied = genes['pied'] || genes['pat']
       
       if (isDilute && isTurq) {
          if (isOp && isCin) return 'Mooncheek(月光/蓝化凤梨稀释)'
          if (isCin) return '蓝化肉桂稀释'
          if (isOp) return '蓝化黄边稀释'
          return '月亮(Mint/蓝化稀释)'
       }
       
       if (isDilute) {
          if (isOp && isCin) return 'Suncheek(阳曦/凤梨稀释)'
          if (isCin) return '肉桂稀释'
          if (isOp) return '黄边稀释'
          return '香吉士(美国黄/稀释)'
       }
       
       if (isTurq) {
          if (isOp && isCin) return '蓝化凤梨'
          if (isCin) return '蓝化肉桂'
          if (isOp) return '蓝化黄边'
          return '蓝化小太阳'
       }
       
       if (isOp && isCin) return '凤梨小太阳'
       if (isCin) return '肉桂小太阳'
       if (isOp) return '黄边小太阳'
       if (isPied) return '派特小太阳'
       
       return base
    } 
    
    else if (species === '和尚鹦鹉') {
       const isBlue = genes['blue']
       const darkCount = genes['dark'] || 0
       const isIno = genes['ino']
       const isPallid = genes['pallid']
       const isCin = genes['cinnamon']
       const isPied = genes['pied']

       let color = ''
       
       if (isBlue) {
         if (darkCount === 2) color = '紫罗兰和尚(双暗蓝)'
         else if (darkCount === 1) color = '钴蓝和尚'
         else color = '蓝和尚'
       } else {
         if (darkCount === 2) color = '橄榄绿和尚(双暗绿)'
         else if (darkCount === 1) color = '深绿和尚'
         else color = '绿和尚'
       }
       
       if (isIno) {
         if (isBlue) color = '白和尚(Albino)'
         else color = '黄和尚(Lutino)'
       } else if (isPallid) {
         if (isBlue) color = '蓝银丝和尚'
         else color = '银丝和尚'
       }
       
       if (isCin) {
         if (color.includes('白') || color.includes('黄')) {
            color = color.replace('和尚', '+肉桂和尚')
         } else {
            color = '肉桂' + color
         }
       }
       
       if (isPied) {
         color = '派特' + color
       }
       
       return color
    }

    else if (species === '牡丹鹦鹉') {
      const isBlue = genes['blue']
      const isSplitBlue = splitGenes['blue']
      const isWhite = genes['white']
      const isWhiteFace = genes['white_face']
      const isIno = genes['ino']
      const isCin = genes['cinnamon']
      const isCinAus = genes['cinnamon_aus']
      const isEdged = genes['edged']
      const isSilver = genes['silver']
      const isPied = genes['pied_dom'] || genes['pied']
      const isFallow = genes['fallow']

      // 0. Fallow (澳闪)
      if (isFallow) {
         if (isWhiteFace) return '白面澳闪'
         if (isBlue) return '蓝化澳闪'
         return '红面澳闪'
      }

      // 1. White series
      if (isWhite) {
         if (isPied) return '白化派特'
         return '白桃（白化）'
      }

      // 2. Yellow series
      if (isIno) {
         return '黄桃（黄化）'
      }

      let color = ''

      // 3. Base Color
      if (isBlue) {
         color = '蓝银顶'
         if (isWhiteFace) color = '白面桃' 
      } else {
         if (isSplitBlue) {
             color = '绿金顶'
         } else {
             color = '野生型（绿桃）'
         }
         
         if (isWhiteFace) color = '白面绿桃' 
      }
      
      // 4. Aussie Cinnamon (澳桂) - High priority overlay
      // 红面澳桂 = Green Series + Aussie Cinnamon
      if (isCinAus) {
         if (isWhiteFace) return '白面澳桂'
         if (color === '野生型（绿桃）' || color === '绿金顶') return '苹果绿澳桂(红面澳桂)'
         if (color === '蓝银顶') return '蓝化澳桂'
         // Fallback
         return '澳桂(' + color + ')'
      }

      // 5. Edged
      if (isEdged) {
         if (color.includes('蓝')) color = '蓝化黄边'
         else color = '黄边桃'
      }

      // 6. Silver
      if (isSilver) {
         color = '银丝桃'
      }

      // 7. Cinnamon (American Cinnamon)
      if (isCin) {
         if (color.includes('蓝') || color === '蓝银顶') return '肉桂蓝化'
         return '肉桂桃'
      }

      // 8. Pied
      if (isPied) {
         if (color.includes('白') || color === '白桃（白化）') return '白化派特'
         return '派特桃'
      }
      
      if (isPied && color.includes('蓝')) return '蓝派特'

      return color
    }
    else if (species === '虎皮鹦鹉' || species === 'Budgerigar') {
      const isBlue = genes['blue']
      const isOpaline = genes['opaline']
      const isLutino = genes['lutino']
      const isCin = genes['cinnamon']
      const isPied = genes['pied']
      let color = ''
      if (isLutino && isBlue) return '白化虎皮'
      if (isLutino) return '黄化虎皮'
      if (isBlue) color = '蓝化虎皮'
      else color = '绿基虎皮'
      if (isOpaline) color = '欧泊' + color
      if (isCin) color = '肉桂' + color
      if (isPied) color = '派特' + color
      return color
    }
    else if (species === '玄凤鹦鹉' || species === 'Cockatiel') {
      const isWhiteface = genes['whiteface']
      const isLutino = genes['lutino']
      const isPearl = genes['pearl']
      const isPied = genes['pied']
      let base = isWhiteface ? '白面玄凤' : '灰玄凤'
      if (isLutino) base = isWhiteface ? '白面黄化玄凤' : '黄化玄凤'
      if (isPearl) base = '珍珠' + base
      if (isPied) base = '派特' + base
      return base
    }
    const labels = visuals.map(v => {
      const g = config.loci[v.gene]
      const n = g && g.label ? g.label : v.gene
      if (g && g.incomplete) return v.count === 2 ? (n + '(双因子)') : (n + '(单因子)')
      return n
    })
    if (!labels.length) return '野生型'
    return labels.join('·')
  },

  aggregateResults(offsprings) {
    const total = offsprings.length
    const map = {}
    const maleMap = {}
    const femaleMap = {}

    offsprings.forEach(o => {
      const label = o.fullName
      map[label] = (map[label] || 0) + 1
      if (o.sex === 'male') maleMap[label] = (maleMap[label] || 0) + 1
      else femaleMap[label] = (femaleMap[label] || 0) + 1
    })

    const format = (m, t) => Object.keys(m).map(k => ({
      label: k,
      prob: Math.round(m[k] / t * 1000) / 10 // 保留1位小数
    })).sort((a,b) => b.prob - a.prob)

    this.setData({
      results: format(map, total),
      sexBreakdown: {
        male: format(maleMap, total / 2), // 假设公母各半
        female: format(femaleMap, total / 2)
      }
    })
  },

  async loadSpeciesFromBackend() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      const list = Array.isArray(res && res.data) ? res.data : []
      const withPlumage = list.filter(s => !!s.plumage_json)
      const names = withPlumage.map(s => s.name)
      this.setData({ speciesOptions: names, speciesDataList: withPlumage })
    } catch (_) {
      this.setData({ speciesOptions: [], speciesDataList: [] })
    }
  },

  noop() {}
})
