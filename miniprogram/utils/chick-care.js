function computeRange(day) {
  if (!Number.isFinite(day) || day < 1) return null
  let envTemp = '', humidity = ''
  if (day <= 5) { envTemp = '35-36℃'; humidity = '63-68%' }
  else if (day <= 10) { envTemp = '33-35℃'; humidity = '60-66%' }
  else if (day <= 15) { envTemp = '32-33℃'; humidity = '59-64%' }
  else if (day <= 21) { envTemp = '29-32℃'; humidity = '57-62%' }
  else if (day <= 28) { envTemp = '26-29℃'; humidity = '54-60%' }
  else if (day <= 35) { envTemp = '26-29℃'; humidity = '50-58%' }
  else { envTemp = '26-29℃'; humidity = '55%' }

  let feed = '', perMeal = '', food = '', foodTemp = ''
  if (day <= 4) { feed = '2h/次'; perMeal = '1-2ml'; food = '奶粉'; foodTemp = '38-40℃' }
  else if (day <= 7) { feed = '3h/次'; perMeal = '2-3ml'; food = '奶粉'; foodTemp = '38-40℃' }
  else if (day <= 14) { feed = '5次/天'; perMeal = '4-6ml'; food = '奶粉+蛋黄'; foodTemp = '38-40℃' }
  else if (day <= 24) { feed = '4次/天'; perMeal = '7-10ml'; food = '奶粉+蛋黄'; foodTemp = '38-40℃' }
  else if (day <= 34) { feed = '3次/天'; perMeal = '11-15ml'; food = '小米+蛋黄'; foodTemp = '30-35℃' }
  else if (day <= 44) { feed = '2次/天'; perMeal = '11-15ml'; food = '小米+蛋黄'; foodTemp = '28-32℃' }
  else { feed = '1次/天'; perMeal = '11-15ml'; food = '小米+蛋黄'; foodTemp = '28-33℃' }

  return { envTemp, humidity, feed, perMeal, food, foodTemp }
}

function buildChickCareAlert(parrot, day) {
  const r = computeRange(day)
  if (!r) return null
  const extra = day <= 1 ? '刚出壳先喂温水/电解质水，排便后再喂奶粉。' : ''
  const mix = '奶粉用50-60℃热水冲泡，冷却至38-40℃再喂，过热易烫伤喉咙，过冷易积食。'
  const sick = '出现积食/炸毛先保温；呼吸道问题湿度约60%，避免过干风暖。'
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

module.exports = {
  buildChickCareAlert,
  getChickCareGuideSections
}
