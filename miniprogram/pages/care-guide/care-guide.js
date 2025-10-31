// pages/care-guide/care-guide.js
const app = getApp()

Page({
  data: {
    pageThemeClass: '',
    loading: true,
    error: '',
    sections: []
  },

  onLoad() {
    // 简单主题适配：若全局提供主题信息可应用暗色主题类
    try {
      const theme = app.globalData.theme || 'system'
      if (theme === 'dark') {
        this.setData({ pageThemeClass: 'theme-dark' })
      } else {
        this.setData({ pageThemeClass: '' })
      }
    } catch (_) {}

    this.fetchCareGuide()
  }
  ,

  fetchCareGuide() {
    this.setData({ loading: true, error: '' })
    app.request({ url: '/api/care-guide' })
      .then(res => {
        if (res && res.success && res.data) {
          const sections = Array.isArray(res.data.sections) ? res.data.sections : []
          // 直接使用后端结构；若未来提供 iconUrl 可直接渲染
          this.setData({ sections, loading: false })
        } else {
          this.setData({ error: res && res.message ? res.message : '加载失败', loading: false })
        }
      })
      .catch(err => {
        this.setData({ error: (err && err.message) || '网络错误', loading: false })
      })
  }
})
