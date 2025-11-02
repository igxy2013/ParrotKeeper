// pages/points/plan/plan.js
const app = getApp()

Page({
  data: {
    rules: [
      {
        title: '每日签到',
        desc: '每日首次登录成功，自动获得 1 积分。'
      },
      {
        title: '首页访问',
        desc: '每日首次访问“数据统计-总览”，获得 1 积分。'
      },
      {
        title: '记录加分（每日首次）',
        desc: '喂食、清洁、健康检查、繁育，每种类型当日首次记录各 +1 积分。'
      },
      {
        title: '财务记录（每日首次）',
        desc: '当日首次添加支出或收入（二者合计仅 +1 分）。'
      },
      {
        title: '加分规则说明',
        desc: '同一类型每天仅首次加分；团队模式的操作积分计入个人账户；积分可在“个人中心”查看。'
      }
    ]
  },

  onLoad() {
    // 轻量主题适配（若全局提供主题信息）
    try {
      const theme = app.globalData.theme || 'system'
      this.setData({ pageThemeClass: theme === 'dark' ? 'theme-dark' : '' })
    } catch (_) {}
  }
})

