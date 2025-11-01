// pages/admin/announcements/announcements.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    announcements: [],
    title: '',
    content: '',
    editingId: null,
    // 中文显示项，后台仍使用英文枚举
    statusOptions: ['草稿', '已发布'],
    statusValues: ['draft', 'published'],
    statusIndex: 1
  },

  onShow() { this.initAccessAndLoad() },
  onPullDownRefresh() { this.loadAnnouncements().finally(() => wx.stopPullDownRefresh()) },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadAnnouncements()
  },

  async loadAnnouncements() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/admin/announcements', method: 'GET' })
      if (res && res.success) {
        const list = (res.data.announcements || []).map(a => ({
          ...a,
          created_at_display: a.created_at ? a.created_at.replace('T',' ').slice(0,19) : ''
        }))
        this.setData({ announcements: list })
      } else {
        wx.showToast({ title: res && res.message ? res.message : '获取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  onContentInput(e) { this.setData({ content: e.detail.value }) },
  onStatusChange(e) { this.setData({ statusIndex: Number(e.detail.value) }) },

  // 统一提交入口：创建或更新
  submitAnnouncement() {
    if (this.data.editingId) {
      this.updateAnnouncement()
    } else {
      this.createAnnouncement()
    }
  },

  async createAnnouncement() {
    const title = (this.data.title || '').trim()
    const content = (this.data.content || '').trim()
    const status = this.data.statusValues[this.data.statusIndex]
    if (!title) { wx.showToast({ title: '标题不能为空', icon: 'none' }); return }
    if (!content) { wx.showToast({ title: '内容不能为空', icon: 'none' }); return }
    try {
      app.showLoading('提交中...')
      const res = await app.request({
        url: '/api/admin/announcements',
        method: 'POST',
        data: { title, content, status }
      })
      if (res && res.success) {
        wx.showToast({ title: '已创建', icon: 'none' })
        this.setData({ title: '', content: '', statusIndex: 1 })
        this.loadAnnouncements()
      } else {
        wx.showToast({ title: res && res.message ? res.message : '创建失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      app.hideLoading()
    }
  },

  async updateAnnouncement() {
    const id = this.data.editingId
    if (!id) return
    const title = (this.data.title || '').trim()
    const content = (this.data.content || '').trim()
    const status = this.data.statusValues[this.data.statusIndex]
    if (!title) { wx.showToast({ title: '标题不能为空', icon: 'none' }); return }
    if (!content) { wx.showToast({ title: '内容不能为空', icon: 'none' }); return }
    try {
      app.showLoading('保存中...')
      const res = await app.request({
        url: `/api/admin/announcements/${id}`,
        method: 'PUT',
        data: { title, content, status }
      })
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'none' })
        this.setData({ editingId: null, title: '', content: '', statusIndex: 1 })
        this.loadAnnouncements()
      } else {
        wx.showToast({ title: res && res.message ? res.message : '更新失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      app.hideLoading()
    }
  },

  // 开始编辑草稿
  startEditAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const item = (this.data.announcements || []).find(a => a.id === id)
    if (!item) return
    // 仅允许编辑草稿
    if (item.status !== 'draft') {
      wx.showToast({ title: '已发布公告不可编辑', icon: 'none' })
      return
    }
    const idx = Math.max(0, this.data.statusValues.indexOf(item.status))
    this.setData({ editingId: id, title: item.title || '', content: item.content || '', statusIndex: idx })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({ editingId: null, title: '', content: '', statusIndex: 1 })
  },

  async deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    try {
      const res = await wx.showModal({ title: '删除公告', content: '确定删除该公告吗？', confirmText: '删除', cancelText: '取消' })
      if (!res.confirm) return
    } catch (_) { return }
    try {
      app.showLoading('删除中...')
      const resp = await app.request({ url: `/api/admin/announcements/${id}`, method: 'DELETE' })
      if (resp && resp.success) {
        wx.showToast({ title: '已删除', icon: 'none' })
        this.loadAnnouncements()
      } else {
        wx.showToast({ title: resp && resp.message ? resp.message : '删除失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      app.hideLoading()
    }
  }
})
