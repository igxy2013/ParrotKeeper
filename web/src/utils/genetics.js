
// Genetics simulation logic ported from miniprogram

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

function uniq(list) {
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

function normalizeLovebirdNameForMatch(name) {
  return String(name || '').replace(/\s+/g, '').replace(/薰/g, '熏')
}

function chooseLovebirdAliasFromGenes(genes, splitGenes) {
  const g = genes || {}
  const sg = splitGenes || {}

  const isPied = !!(g.pied_dom || g.pied)
  const isFallow = !!g.fallow
  const isIno = !!g.ino
  const isPallid = !!g.pallid
  const isSmoke = !!g.smoke
  const isFlash = !!g.flash
  const isWhiteFace = !!g.white_face
  const isGoldHead = !!g.goldhead
  const isGoldFace = !!g.goldface
  const isGreenGoldFace = !!g.greengoldface
  const isVioletFace = !!g.violet_face
  const isAppleGreen = !!g.apple_green
  const isTurquoise = !!g.turquoise
  const isBlue = !!g.blue
  const violetCount = Number(g.violet || 0)

  const hasAliasMarkers = (
    isPallid ||
    isSmoke ||
    isFlash ||
    isFallow ||
    isGoldHead ||
    isGoldFace ||
    isGreenGoldFace ||
    isVioletFace ||
    isAppleGreen ||
    isTurquoise
  )

  if (!hasAliasMarkers) return ''

  const allowed = uniq(LOVE_BIRD_COMMON_COLOR_NAMES)
  const allowedSet = new Set(allowed.map(normalizeLovebirdNameForMatch))

  if (isGoldFace && allowedSet.has(normalizeLovebirdNameForMatch('黄金面'))) return '黄金面'
  if (isGreenGoldFace && allowedSet.has(normalizeLovebirdNameForMatch('绿金面'))) return '绿金面'
  if (isGoldHead && isIno && allowedSet.has(normalizeLovebirdNameForMatch('金头黄化'))) return '金头黄化'
  if (isFallow && isWhiteFace && allowedSet.has(normalizeLovebirdNameForMatch('白面澳闪'))) return '白面澳闪'
  if (isFallow && isGoldHead && allowedSet.has(normalizeLovebirdNameForMatch('金头澳闪'))) return '金头澳闪'
  if (isFallow && isAppleGreen && allowedSet.has(normalizeLovebirdNameForMatch('苹果绿澳闪'))) return '苹果绿澳闪'
  if (isVioletFace && isPallid && allowedSet.has(normalizeLovebirdNameForMatch('紫面伊'))) return '紫面伊'

  let base = '松'
  if (isTurquoise) base = '松石'
  else if (isBlue && violetCount > 0) base = '紫'
  else if (isBlue) base = '蓝'
  else if (isAppleGreen) base = '苹果绿'

  let mod = ''
  if (isPallid) mod = '伊莎'
  else if (isSmoke) mod = '熏'
  else if (isFlash) mod = '闪'
  else if (isFallow) mod = '澳闪'
  else if (isIno) mod = '黄化'

  let candidate = base + mod
  if (isPied) {
    if (candidate && (candidate.endsWith('伊莎') || candidate.endsWith('熏') || candidate.endsWith('闪') || candidate.endsWith('薰') || candidate.endsWith('澳闪'))) {
      candidate = candidate + '派'
    }
  }

  const normCandidate = normalizeLovebirdNameForMatch(candidate)
  if (allowedSet.has(normCandidate)) {
    const idx = allowed.findIndex(a => normalizeLovebirdNameForMatch(a) === normCandidate)
    return idx >= 0 ? allowed[idx] : candidate
  }

  return ''
}

export function simulatePairing(speciesName, config, mIdx, fIdx, mSplits, fSplits) {
  if (!config) return []
  
  const mColorConfig = config.colors[mIdx]
  const fColorConfig = config.colors[fIdx]

  // 1. Build Genotypes
  const motherGenotype = buildGenotype(config, mColorConfig.genes, mSplits, 'female')
  const fatherGenotype = buildGenotype(config, fColorConfig.genes, fSplits, 'male')

  // 2. Generate Gametes
  const mGametes = generateGametes(config, motherGenotype)
  const fGametes = generateGametes(config, fatherGenotype)

  // 3. Combine Gametes
  const offsprings = []
  for (const mg of mGametes) {
    for (const fg of fGametes) {
      offsprings.push(combineGametes(config, mg, fg))
    }
  }

  // 4. Analyze Offspring
  const analyzed = offsprings.map(o => analyzeOffspring(speciesName, config, o))

  // 5. Aggregate Results
  return aggregateResults(analyzed)
}

export function simulatePairingDetailed(speciesName, config, mIdx, fIdx, mSplits, fSplits) {
  if (!config) return { sexBreakdown: { male: [], female: [] } }
  const mColorConfig = config.colors[mIdx]
  const fColorConfig = config.colors[fIdx]
  const motherGenotype = buildGenotype(config, mColorConfig.genes, mSplits, 'female')
  const fatherGenotype = buildGenotype(config, fColorConfig.genes, fSplits, 'male')
  const mGametes = generateGametes(config, motherGenotype)
  const fGametes = generateGametes(config, fatherGenotype)
  const offsprings = []
  for (const mg of mGametes) {
    for (const fg of fGametes) {
      offsprings.push(combineGametes(config, mg, fg))
    }
  }
  const analyzed = offsprings.map(o => analyzeOffspring(speciesName, config, o))
  const total = analyzed.length
  const male = analyzed.filter(o => o.sex === 'male')
  const female = analyzed.filter(o => o.sex === 'female')
  const agg = (list) => {
    const m = {}
    list.forEach(o => { const key = o.fullName; m[key] = (m[key] || 0) + 1 })
    return Object.keys(m).map(k => ({ label: k, prob: (Math.round(m[k] / total * 1000) / 10).toFixed(1) }))
  }
  return { sexBreakdown: { male: agg(male), female: agg(female) } }
}

export function analyzeAllOffsprings(speciesName, config, mIdx, fIdx, mSplits, fSplits) {
  if (!config) return []
  const mColorConfig = config.colors[mIdx]
  const fColorConfig = config.colors[fIdx]
  const motherGenotype = buildGenotype(config, mColorConfig.genes, mSplits, 'female')
  const fatherGenotype = buildGenotype(config, fColorConfig.genes, fSplits, 'male')
  const mGametes = generateGametes(config, motherGenotype)
  const fGametes = generateGametes(config, fatherGenotype)
  const offsprings = []
  for (const mg of mGametes) {
    for (const fg of fGametes) {
      offsprings.push(combineGametes(config, mg, fg))
    }
  }
  return offsprings.map(o => analyzeOffspring(speciesName, config, o))
}

function buildGenotype(config, visualGenes, splitList, sex) {
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
          else if (isVisual === 1) genotype[key] = [1, 0] // Handle user preset "blue: 1"
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
}

function generateGametes(config, genotype) {
  const keys = Object.keys(genotype)
  let gametes = [{}] 
  
  for (const key of keys) {
    const alleles = genotype[key]
    const newGametes = []
    
    // Optimization: if alleles are identical, don't branch
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
}

function combineGametes(config, g1, g2) {
  const zygote = {}
  for (const key of Object.keys(g1)) {
    zygote[key] = [g1[key], g2[key]].sort((a, b) => b - a)
  }
  return zygote
}

function analyzeOffspring(speciesName, config, zygote) {
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

  const name = generateName(speciesName, config, visualParts, splitParts)
  
  let displaySplits = splitParts.map(s => config.loci[s.gene].label)
  if (name.includes('绿金顶')) {
      displaySplits = displaySplits.filter(l => l !== '蓝化(g)')
  }
  
  const splitStr = displaySplits.join('、')
  const fullName = name + (splitStr ? ` (携带${splitStr})` : '')
  
  return { sex, name, fullName, splitNames: splitStr }
}

function generateName(species, config, visuals, splits) {
  const genes = {}
  visuals.forEach(v => genes[v.gene] = v.count)
  const splitGenes = {}
  splits.forEach(s => splitGenes[s.gene] = true)
  
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
    const n = chooseLovebirdAliasFromGenes(genes, splitGenes)
    if (n) return n

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

    if (isFallow) {
      if (isWhiteFace) return '白面澳闪'
      if (isBlue) return '蓝化澳闪'
      return '红面澳闪'
    }

    if (isWhite) {
      if (isPied) return '白化派特'
      return '白桃（白化）'
    }

    if (isIno) {
      return '黄桃（黄化）'
    }

    let color = ''

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

    if (isCinAus) {
      if (isWhiteFace) return '白面澳桂'
      if (color === '野生型（绿桃）' || color === '绿金顶') return '苹果绿澳桂(红面澳桂)'
      if (color === '蓝银顶') return '蓝化澳桂'
      return '澳桂(' + color + ')'
    }

    if (isEdged) {
      if (color.includes('蓝')) color = '蓝化黄边'
      else color = '黄边桃'
    }

    if (isSilver) {
      color = '银丝桃'
    }

    if (isCin) {
      if (color.includes('蓝') || color === '蓝银顶') return '肉桂蓝化'
      return '肉桂桃'
    }

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
}

function aggregateResults(offsprings) {
  const total = offsprings.length
  const map = {}
  // Key by fullName to group identical phenotypes + splits
  offsprings.forEach(o => {
    const key = o.fullName
    if (!map[key]) {
        map[key] = {
            count: 0,
            name: o.name,
            splitNames: o.splitNames
        }
    }
    map[key].count++
  })

  return Object.values(map).map(item => ({
    name: item.name,
    splitNames: item.splitNames,
    prob: (Math.round(item.count / total * 1000) / 10).toFixed(1)
  })).sort((a, b) => parseFloat(b.prob) - parseFloat(a.prob))
}
