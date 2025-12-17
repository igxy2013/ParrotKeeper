const app = getApp()
const { SPECIES_CONFIG, SPECIES_LIST } = require('../../../utils/species-config')

Page({
  data: {
    speciesOptions: SPECIES_LIST,
    speciesIndex: 0,
    
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

  onLoad(options) {
    try { wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] }) } catch (_) {}
    const si = typeof options === 'object' && options ? Number(options.si || options.speciesIndex || 0) : 0
    const mi = typeof options === 'object' && options ? Number(options.mi || options.motherColorIndex || 0) : 0
    const fi = typeof options === 'object' && options ? Number(options.fi || options.fatherColorIndex || 0) : 0
    const ms = typeof options === 'object' && options && (options.ms || options.motherSplits) ? String(options.ms || options.motherSplits).split(',').filter(Boolean) : []
    const fs = typeof options === 'object' && options && (options.fs || options.fatherSplits) ? String(options.fs || options.fatherSplits).split(',').filter(Boolean) : []
    this.updateSpeciesData(si)
    this.setData({ motherColorIndex: mi, fatherColorIndex: fi, motherSplits: ms, fatherSplits: fs }, () => {
      this.compute()
      const species = this.data.speciesOptions[this.data.speciesIndex]
      this.fetchPrices(species)
    })
  },

  onSpeciesChange(e) {
    const idx = Number(e.detail.value) || 0
    this.updateSpeciesData(idx)
  },

  updateSpeciesData(idx) {
    const species = this.data.speciesOptions[idx]
    const config = SPECIES_CONFIG[species]
    const colors = config.colors.map(c => c.name)
    
    // 生成携带选项 (只列出隐性基因)
    const splits = []
    for (const [key, gene] of Object.entries(config.loci)) {
      if ((gene.type === 'autosomal' && !gene.incomplete) || gene.type === 'sex-linked') {
        if (!gene.incomplete) {
          splits.push({ id: key, name: gene.label })
        }
      }
    }

    this.setData({
      speciesIndex: idx,
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
    const species = this.data.speciesOptions[this.data.speciesIndex]
    const config = SPECIES_CONFIG[species]
    
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

  normalizePriceMap(species, map) {
    const m = { ...(map || {}) }
    if (species === '和尚鹦鹉') {
      const alias = {
        '深绿和尚': ['深绿和尚(1Dark)'],
        '橄榄绿和尚(双暗绿)': ['橄榄绿和尚(2Dark)'],
        '钴蓝和尚': ['钴蓝和尚(蓝+1Dark)'],
        '紫罗兰和尚(双暗蓝)': ['紫罗兰和尚(蓝+2Dark)'],
        '派特绿和尚': ['派特和尚'],
        '派特蓝和尚': ['蓝派特和尚']
      }
      Object.keys(alias).forEach(canon => {
        const syns = alias[canon]
        syns.forEach(s => { if (m[s] != null && m[canon] == null) m[canon] = m[s] })
      })
    } else if (species === '牡丹鹦鹉') {
      const alias = {
        '白面桃': ['白面绿桃']
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
        '肉桂蓝和尚': 1600,
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
    const config = SPECIES_CONFIG[species]
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
    const config = SPECIES_CONFIG[species]
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
        const price = o.sex === 'male' ? Number((pmM[o.name] != null ? pmM[o.name] : pm[o.name]) || 0) : Number((pmF[o.name] != null ? pmF[o.name] : pm[o.name]) || 0)
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
      const isVisual = visualGenes[key] ? visualGenes[key] : 0 
      const isSplit = splitList.includes(key)
      
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
       const isPied = genes['pied']
       
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
      const isPied = genes['pied_dom']
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
    
    return '未知品种'
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
  }
})
