
// Genetics simulation logic ported from miniprogram

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
    
    // 4. Aussie Cinnamon (澳桂)
    if (isCinAus) {
       if (isWhiteFace) return '白面澳桂'
       if (color === '野生型（绿桃）' || color === '绿金顶') return '苹果绿澳桂(红面澳桂)'
       if (color === '蓝银顶') return '蓝化澳桂'
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
