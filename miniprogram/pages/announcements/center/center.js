// pages/announcements/center/center.js
const app = getApp()

Page({
  data: {
    loading: false,
    announcements: [],
    limit: 20,
    hasMore: true,
    // 详情页改为新页面，不再使用弹窗
  },

  onLoad(options) {
    // 支持通过参数 id 进行深链，进入页面后自动打开对应公告
    this.pendingAnnouncementId = options && options.id ? String(options.id) : null
    this.loadAnnouncements()
  },
  onPullDownRefresh() { this.resetAndReload().finally(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore) { this.loadMore() } },

  async resetAndReload() {
    this.setData({ announcements: [], limit: 20, hasMore: true })
    await this.loadAnnouncements()
  },

  async loadAnnouncements() {
    this.setData({ loading: true })
    try {
      const { limit } = this.data
      const res = await app.request({ url: '/api/announcements', method: 'GET', data: { limit } })
      if (res && res.success) {
        const list = (res.data && res.data.announcements) ? res.data.announcements : []
        const formatted = list.map(a => ({
          ...a,
          created_at_display: a.created_at ? a.created_at.replace('T',' ').slice(0,19) : '',
          image_url: a.image_url ? app.resolveUploadUrl(a.image_url) : ''
        }))
        this.setData({ announcements: formatted, hasMore: list.length >= limit && limit < 50 })
        // 若存在待打开的公告ID，跳转到详情页
        if (this.pendingAnnouncementId) {
          const target = formatted.find(a => String(a.id) === String(this.pendingAnnouncementId))
          if (target) {
            try {
              wx.navigateTo({ url: `/pages/announcements/detail/detail?id=${encodeURIComponent(target.id)}` })
            } catch (_) {}
          }
          this.pendingAnnouncementId = null
        }
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取公告失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    const next = Math.min(50, (this.data.limit || 20) + 10)
    this.setData({ limit: next })
    await this.loadAnnouncements()
  },

  openAnnouncementDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    try { wx.navigateTo({ url: `/pages/announcements/detail/detail?id=${encodeURIComponent(id)}` }) } catch (_) {}
  }
})
