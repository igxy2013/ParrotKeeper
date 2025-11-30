// pages/admin/feedbacks/feedbacks.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    feedbacks: []
  },

  onShow() { this.initAccessAndLoad() },
  onPullDownRefresh() { this.loadFeedbacks().finally(() => wx.stopPullDownRefresh()) },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadFeedbacks()
  },

  async loadFeedbacks() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/feedback', method: 'GET' })
      if (res && res.success) {
        const list = res.data || []
        this.setData({ feedbacks: list })
        try {
          const prev = wx.getStorageSync('feedback_last_count') || 0
          const hasNew = (list.length || 0) > (prev || 0)
          if (hasNew) {
            const appInst = getApp()
            if (appInst && appInst.setFeedbackUnread) { appInst.setFeedbackUnread(true) }
          }
          wx.setStorageSync('feedback_last_count', list.length || 0)
        } catch (_) {}
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatTime(iso) {
    try { return app.formatDate(iso) } catch(_) { return iso }
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    wx.previewImage({ urls: [src], current: src })
  },

  async deleteFeedback(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const confirm = await new Promise(resolve => {
      wx.showModal({ title: '确认删除', content: '删除后不可恢复，是否继续？', success: r => resolve(r.confirm) })
    })
    if (!confirm) return
    try {
      const res = await app.request({ url: `/api/feedback/${id}`, method: 'DELETE' })
      if (res && res.success) {
        wx.showToast({ title: '已删除', icon: 'none' })
        this.loadFeedbacks()
      } else {
        wx.showToast({ title: res && res.message ? res.message : '删除失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  markAllRead(){
    try{
      // 服务端同步：标记全部为已读
      app.request({ url: '/api/feedback/mark_all_read', method: 'POST' })
        .then(res => {
          if (res && res.success) {
            const appInst = getApp()
            if (appInst && appInst.setFeedbackUnread) { appInst.setFeedbackUnread(false) }
            wx.setStorageSync('feedback_read_ack', Date.now())
            const cnt = (this.data.feedbacks || []).length || 0
            wx.setStorageSync('feedback_last_count', cnt)
            wx.showToast({ title: '已标记为已读', icon: 'none' })
          } else {
            wx.showToast({ title: (res && res.message) || '服务端标记失败', icon: 'none' })
          }
        })
        .catch(_ => {
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
    }catch(_){ wx.showToast({ title: '操作失败', icon: 'none' }) }
  }
})
