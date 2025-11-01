// pages/announcements/center/center.js
const app = getApp()

Page({
  data: {
    loading: false,
    announcements: [],
    limit: 20,
    hasMore: true,
    showDetailModal: false,
    currentAnnouncement: null
  },

  onLoad() { this.loadAnnouncements() },
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
          created_at_display: a.created_at ? a.created_at.replace('T',' ').slice(0,19) : ''
        }))
        this.setData({ announcements: formatted, hasMore: list.length >= limit && limit < 50 })
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
    const item = (this.data.announcements || []).find(a => String(a.id) === String(id))
    if (!item) return
    this.setData({ currentAnnouncement: item, showDetailModal: true })
  },
  closeAnnouncementDetail() { this.setData({ showDetailModal: false, currentAnnouncement: null }) },
  stopPropagation() {}
})
