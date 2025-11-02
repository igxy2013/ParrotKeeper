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
    // 发布类型：现在发布、定时发布、草稿（后台枚举：published/scheduled/draft）
    statusOptions: ['现在发布', '定时发布', '草稿'],
    statusValues: ['published', 'scheduled', 'draft'],
    statusIndex: 0,
    // 定时发布时间（仅当选择定时发布显示并提交）
    scheduledDate: '',
    scheduledTime: '',
    today: ''
  },

  onShow() { 
    // 设置今日日期用于选择器的开始范围
    try {
      const d = new Date()
      const pad = (n) => (n < 10 ? '0'+n : ''+n)
      const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
      this.setData({ today })
    } catch (_) {}
    this.initAccessAndLoad() 
  },
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
  onStatusChange(e) { 
    const idx = Number(e.detail.value)
    this.setData({ statusIndex: idx })
    // 当选择“定时发布”时，若未选择过时间，则默认预选当前日期与时间
    try {
      if (this.data.statusValues[idx] === 'scheduled') {
        const hasDate = !!(this.data.scheduledDate && this.data.scheduledDate.trim())
        const hasTime = !!(this.data.scheduledTime && this.data.scheduledTime.trim())
        if (!hasDate || !hasTime) {
          const d = new Date()
          const pad = (n) => (n < 10 ? '0'+n : ''+n)
          const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
          const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
          this.setData({ scheduledDate: date, scheduledTime: time })
        }
      }
    } catch (_) {}
  },
  onScheduledDateChange(e) { this.setData({ scheduledDate: e.detail.value }) },
  onScheduledTimeChange(e) { this.setData({ scheduledTime: e.detail.value }) },

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
    // 组合定时发布时间（若选择了定时发布）
    let scheduled_at = ''
    if (status === 'scheduled') {
      const d = (this.data.scheduledDate || '').trim()
      const t = (this.data.scheduledTime || '').trim()
      if (!d || !t) { wx.showToast({ title: '请选择发布时间', icon: 'none' }); return }
      scheduled_at = `${d} ${t}`
      // 简单校验：必须晚于当前时间
      const nowTs = Date.now()
      const ts = Date.parse(scheduled_at.replace(/-/g,'/'))
      if (!ts || ts <= nowTs) { wx.showToast({ title: '发布时间需晚于当前时间', icon: 'none' }); return }
    }
    try {
      app.showLoading('提交中...')
      const res = await app.request({
        url: '/api/admin/announcements',
        method: 'POST',
        data: { title, content, status, scheduled_at }
      })
      if (res && res.success) {
        wx.showToast({ title: '已创建', icon: 'none' })
        this.setData({ title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '' })
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
    let scheduled_at = ''
    if (status === 'scheduled') {
      const d = (this.data.scheduledDate || '').trim()
      const t = (this.data.scheduledTime || '').trim()
      if (!d || !t) { wx.showToast({ title: '请选择发布时间', icon: 'none' }); return }
      scheduled_at = `${d} ${t}`
      const nowTs = Date.now()
      const ts = Date.parse(scheduled_at.replace(/-/g,'/'))
      if (!ts || ts <= nowTs) { wx.showToast({ title: '发布时间需晚于当前时间', icon: 'none' }); return }
    }
    try {
      app.showLoading('保存中...')
      const res = await app.request({
        url: `/api/admin/announcements/${id}`,
        method: 'PUT',
        data: { title, content, status, scheduled_at }
      })
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'none' })
        this.setData({ editingId: null, title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '' })
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
    // 允许编辑草稿与定时发布；已发布不可编辑
    if (item.status === 'published') {
      wx.showToast({ title: '已发布公告不可编辑', icon: 'none' })
      return
    }
    const idx = Math.max(0, this.data.statusValues.indexOf(item.status))
    const sched = item.scheduled_at || ''
    let scheduledDate = ''
    let scheduledTime = ''
    if (sched) {
      // 格式：YYYY-MM-DDTHH:mm:ss -> 分解为日期与时间
      try {
        scheduledDate = sched.slice(0,10)
        scheduledTime = sched.slice(11,16)
      } catch (_) {}
    }
    this.setData({ editingId: id, title: item.title || '', content: item.content || '', statusIndex: idx, scheduledDate, scheduledTime })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({ editingId: null, title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '' })
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
