function computeRange(day) {
  if (day >= 1 && day <= 4) {
    return { envTemp: '35-36℃', humidity: '63-68%', feed: '每2小时1次', perMeal: '1-2ml', food: '奶粉', foodTemp: '38-40℃' }
  }
  if (day >= 5 && day <= 9) {
    return { envTemp: '33-35℃', humidity: '60-66%', feed: '每3小时1次', perMeal: '2-4ml', food: '奶粉', foodTemp: '38-40℃' }
  }
  if (day >= 10 && day <= 15) {
    return { envTemp: '33-35℃', humidity: '60-66%', feed: '5次/天', perMeal: '4-6ml', food: '奶粉+蛋黄', foodTemp: '38-40℃' }
  }
  if (day >= 16 && day <= 21) {
    return { envTemp: '29-32℃', humidity: '57-62%', feed: '4次/天', perMeal: '7-10ml', food: '奶粉+蛋黄', foodTemp: '38-40℃' }
  }
  if (day >= 22 && day <= 28) {
    return { envTemp: '26-29℃', humidity: '54-60%', feed: '3次/天', perMeal: '11-15ml', food: '小米+蛋黄', foodTemp: '28-32℃' }
  }
  if (day >= 29 && day <= 35) {
    return { envTemp: '26-29℃', humidity: '50-58%', feed: '3次/天', perMeal: '11-15ml', food: '小米+蛋黄', foodTemp: '28-32℃' }
  }
  return null
}

function buildChickCareAlert(parrot, day) {
  const r = computeRange(day)
  if (!r) return null
  const extra = day <= 1 ? '刚出壳先喂温水/电解质水，排便后再喂奶粉。' : ''
  const mix = '奶粉用50-60℃热水冲泡，冷却至38-40℃再喂。'
  const sick = '生病时优先保温28-32℃，呼吸道症状湿度约60%。'
  return {
    id: `chick-${parrot.id}-${day}`,
    parrot_id: parrot.id,
    title: `${parrot.name}：雏鸟第${day}天护理提醒`,
    description: `环境温度${r.envTemp}，湿度${r.humidity}；喂食${r.feed}，每餐${r.perMeal}；食物${r.food}，食物温度${r.foodTemp}。${extra}${mix}${sick}`,
    severity: 'low',
    type: 'chick_care'
  }
}

function getChickCareGuideSections() {
  const guideItems = [
    { text: '1-4天：35-36℃，湿度63-68%；每2小时1次，每餐1-2ml；奶粉，食物温度38-40℃' },
    { text: '5-9天：33-35℃，湿度60-66%；每3小时1次，每餐2-4ml；奶粉，食物温度38-40℃' },
    { text: '10-15天：33-35℃，湿度60-66%；5次/天，每餐4-6ml；奶粉+蛋黄，食物温度38-40℃' },
    { text: '16-21天：29-32℃，湿度57-62%；4次/天，每餐7-10ml；奶粉+蛋黄，食物温度38-40℃' },
    { text: '22-28天：26-29℃，湿度54-60%；3次/天，每餐11-15ml；小米+蛋黄，食物温度28-32℃' },
    { text: '29-30天：26-29℃，湿度50-58%；3次/天，每餐11-15ml；小米+蛋黄，食物温度28-32℃' }
  ]
  const tips = [
    { text: '开食时机：刚出壳先喂温水/电解质水，排便后再喂奶' },
    { text: '奶粉冲泡：50-60℃热水冲泡，冷却至38-40℃喂食' },
    { text: '生病处理：置于28-32℃恒温环境，必要时微调保温箱' },
    { text: '呼吸道护理：湿度约60%，避免过干风暖' },
    { text: '数据参考：消化快则奶调稠，消化慢则喂流食' }
  ]
  const keyPoints = [
    { text: '严格控制环境温度、湿度与食物温度' },
    { text: '根据消化情况动态调整喂食量与食物性状' },
    { text: '遇病首要原则是保温' }
  ]
  return [
    { title: '0-30天手养指南', items: guideItems },
    { title: '温馨提示', items: tips },
    { title: '核心要点', items: keyPoints }
  ]
}

module.exports = {
  buildChickCareAlert,
  getChickCareGuideSections
}
