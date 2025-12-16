const app = getApp()

// 基因定义
const SPECIES_CONFIG = {
  '和尚鹦鹉': {
    loci: {
      blue: { type: 'autosomal', label: '蓝化', symbol: 'b' },
      dark: { type: 'autosomal', label: '深色(Dark)', symbol: 'D', incomplete: true }, // Dd=1, DD=2
      ino: { type: 'sex-linked', label: '黄/白化(Ino)', symbol: 'i' },
      pallid: { type: 'sex-linked', label: '银丝(Pallid)', symbol: 'pa' },
      cinnamon: { type: 'sex-linked', label: '肉桂', symbol: 'c' },
      pied: { type: 'autosomal', label: '派特', symbol: 'p' }
    },
    // 预设颜色对应的显性/隐性基因表达
    colors: [
      { name: '绿和尚', genes: {} },
      { name: '蓝和尚', genes: { blue: 2 } }, // 2表示纯合隐性(aa)
      { name: '深绿和尚(1Dark)', genes: { dark: 1 } },
      { name: '橄榄绿和尚(2Dark)', genes: { dark: 2 } },
      { name: '钴蓝和尚(蓝+1Dark)', genes: { blue: 2, dark: 1 } },
      { name: '紫罗兰和尚(蓝+2Dark)', genes: { blue: 2, dark: 2 } },
      { name: '黄和尚(绿+Ino)', genes: { ino: 1 } },
      { name: '白和尚(蓝+Ino)', genes: { blue: 2, ino: 1 } },
      { name: '肉桂和尚', genes: { cinnamon: 1 } },
      { name: '肉桂蓝和尚', genes: { blue: 2, cinnamon: 1 } },
      { name: '银丝和尚', genes: { pallid: 1 } },
      { name: '银丝蓝和尚', genes: { blue: 2, pallid: 1 } },
      { name: '派特和尚', genes: { pied: 2 } },
      { name: '蓝派特和尚', genes: { blue: 2, pied: 2 } }
    ]
  },
  '小太阳鹦鹉': {
    loci: {
      turquoise: { type: 'autosomal', label: '蓝化', symbol: 't' },
      dilute: { type: 'autosomal', label: '稀释(Dilute)', symbol: 'd' },
      cinnamon: { type: 'sex-linked', label: '肉桂', symbol: 'c' },
      opaline: { type: 'sex-linked', label: '黄边', symbol: 'o' },
      pied: { type: 'autosomal', label: '派特', symbol: 'p' }
    },
    colors: [
      { name: '绿颊小太阳（原始）', genes: {} },
      { name: '黄边小太阳', genes: { opaline: 1 } },
      { name: '肉桂小太阳', genes: { cinnamon: 1 } },
      { name: '凤梨小太阳', genes: { opaline: 1, cinnamon: 1 } },
      { name: '蓝化小太阳', genes: { turquoise: 2 } },
      { name: '蓝化黄边', genes: { turquoise: 2, opaline: 1 } },
      { name: '蓝化肉桂', genes: { turquoise: 2, cinnamon: 1 } },
      { name: '蓝化凤梨', genes: { turquoise: 2, opaline: 1, cinnamon: 1 } },
      { name: '香吉士(Dilute)', genes: { dilute: 2 } },
      { name: '月亮(Mint)', genes: { turquoise: 2, dilute: 2 } },
      { name: 'Suncheek(阳曦)', genes: { dilute: 2, opaline: 1, cinnamon: 1 } },
      { name: 'Mooncheek(月光)', genes: { turquoise: 2, dilute: 2, opaline: 1, cinnamon: 1 } },
      { name: '派特小太阳', genes: { pied: 2 } }
    ]
  },
  '牡丹鹦鹉': {
    loci: {
      blue: { type: 'autosomal', label: '蓝化(g)', symbol: 'g' }, // gg=Blue, Gg=GreenSplitBlue
      ino: { type: 'sex-linked', label: '黄化(y)', symbol: 'y' }, // yy(sex-linked for now to be safe, user said yy)
      edged: { type: 'autosomal', label: '黄边(Ye)', symbol: 'Ye', incomplete: true }, // Dominant? User said "Ye" gene. Assuming Dominant.
      white: { type: 'autosomal', label: '白化(w)', symbol: 'w' }, // ww=White
      white_face: { type: 'autosomal', label: '白面(Wf)', symbol: 'Wf', incomplete: true }, // Dominant
      cinnamon: { type: 'sex-linked', label: '肉桂(c)', symbol: 'c' },
      cinnamon_aus: { type: 'sex-linked', label: '澳桂(c_aus)', symbol: 'c_aus' }, // Aussie Cinnamon
      silver: { type: 'autosomal', label: '银丝(s)', symbol: 's' }, // ss=Silver
      pied_dom: { type: 'autosomal', label: '派特(P)', symbol: 'P', incomplete: true } // Dominant Pied Pp/PP
    },
    colors: [
      { name: '野生型（绿桃）', genes: {} },
      { name: '蓝银顶', genes: { blue: 2 } }, // gg
      { name: '绿金顶', genes: { blue: 1 } }, // Gg (Split Blue)
      { name: '黄桃（黄化）', genes: { ino: 1 } },
      { name: '黄边桃', genes: { edged: 1 } }, // Ye_
      { name: '白桃（白化）', genes: { white: 2 } }, // ww
      { name: '白面桃', genes: { white_face: 1 } }, // Wf_
      { name: '肉桂桃', genes: { cinnamon: 1 } },
      { name: '银丝桃', genes: { silver: 2 } }, // ss
      { name: '派特桃', genes: { pied_dom: 1 } }, // Pp
      { name: '苹果绿澳桂', genes: { cinnamon_aus: 1 } }, // Aussie Cinnamon (Green Series)
      { name: '蓝化黄边', genes: { blue: 2, edged: 1 } },
      { name: '白化派特', genes: { white: 2, pied_dom: 1 } },
      { name: '肉桂蓝化', genes: { cinnamon: 1, blue: 2 } }
    ]
  }
}

Page({
  data: {
    speciesOptions: ['和尚鹦鹉', '小太阳鹦鹉', '牡丹鹦鹉'],
    speciesIndex: 0,
    
    // 颜色列表
    colorOptions: [],
    motherColorIndex: 0,
    fatherColorIndex: 0,
    
    // 携带基因选项 (Splits)
    availableSplits: [], 
    motherSplits: [], // 选中的 split id 数组
    fatherSplits: [],

    results: [],
    sexBreakdown: { male: [], female: [] },
    
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
    this.setData({ motherColorIndex: mi, fatherColorIndex: fi, motherSplits: ms, fatherSplits: fs }, () => this.compute())
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
      fatherSplits: []
    }, () => {
      this.compute()
    })
  },

  onMotherColorChange(e) {
    this.setData({ motherColorIndex: Number(e.detail.value) }, () => this.compute())
  },
  onFatherColorChange(e) {
    this.setData({ fatherColorIndex: Number(e.detail.value) }, () => this.compute())
  },
  onMotherSplitsChange(e) {
    this.setData({ motherSplits: e.detail.value }, () => this.compute())
  },
  onFatherSplitsChange(e) {
    this.setData({ fatherSplits: e.detail.value }, () => this.compute())
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
      for (const g of gametes) {
        const g1 = { ...g, [key]: alleles[0] }
        const g2 = { ...g, [key]: alleles[1] }
        newGametes.push(g1, g2)
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
      // 苹果绿澳桂 = Green Series + Aussie Cinnamon
      if (isCinAus) {
         if (color === '野生型（绿桃）' || color === '绿金顶') return '苹果绿澳桂'
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
