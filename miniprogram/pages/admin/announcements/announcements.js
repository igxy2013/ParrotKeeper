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
    imageUrls: [],
    rawImageUrls: [],
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
        const pad = (n) => (n < 10 ? '0' + n : '' + n)
        const toLocal = (isoStr, withSeconds = true, assumeUtcIfNoTz = true) => {
          if (!isoStr) return ''
          // 若字符串不包含时区信息，则默认按UTC处理再转换到本地
          const hasTz = /[zZ]|([+\-]\d{2}:?\d{2})$/.test(isoStr)
          const normalized = isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T')
          let d = new Date(hasTz ? normalized : (assumeUtcIfNoTz ? (normalized + 'Z') : normalized))
          if (isNaN(d.getTime())) {
            // 作为兜底，使用 / 分隔解析（仍按本地）
            try { d = new Date(isoStr.replace(/-/g, '/')) } catch (_) {}
          }
          if (isNaN(d.getTime())) return ''
          const Y = d.getFullYear()
          const M = pad(d.getMonth() + 1)
          const D = pad(d.getDate())
          const h = pad(d.getHours())
          const m = pad(d.getMinutes())
          const s = pad(d.getSeconds())
          return withSeconds ? `${Y}-${M}-${D} ${h}:${m}:${s}` : `${Y}-${M}-${D} ${h}:${m}`
        }
        const list = (res.data.announcements || []).map(a => ({
          ...a,
          created_at_display: toLocal(a.created_at, true, true),
          scheduled_at_display: a.scheduled_at ? toLocal(a.scheduled_at, false, false) : ''
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

  chooseImage() {
    const current = this.data.imageUrls || []
    const max = 9
    const remain = Math.max(0, max - current.length)
    if (remain <= 0) { wx.showToast({ title: '最多上传9张', icon: 'none' }); return }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles || []
        files.forEach(f => this.uploadImage(f.tempFilePath))
      }
    })
  },

  uploadImage(filePath) {
    const app = getApp()
    const baseUrl = app.globalData.baseUrl
    const openid = app.globalData.openid || wx.getStorageSync('openid')
    
    wx.showLoading({ title: '上传中...' })
    wx.uploadFile({
      url: `${baseUrl}/api/upload/image`,
      filePath: filePath,
      name: 'file',
      header: {
        'X-OpenID': openid
      },
      success: (res) => {
        wx.hideLoading()
        try {
          const data = JSON.parse(res.data)
          if (data.success && data.data && data.data.url) {
            let url = data.data.url
            if (!url.startsWith('http') && !url.startsWith('/')) {
                url = '/' + url
            }
            // 拼接完整URL用于预览，但保存时也可以保存相对路径，这里为了统一，尽量保存后端返回的原始值或者处理后的值
            // 如果后端返回的是 uploads/xxx.jpg，我们需要拼接 baseUrl 才能显示
            // 这里我们先保存 url，在显示时由 app.resolveUploadUrl 处理
            // 但是为了显示 preview，我们需要 resolve 一下
            // 这里直接 setData url，wxml 中 src 会用这个。如果 url 是相对路径，wxml image src 无法显示
            // 所以我们需要 resolve
            const resolvedUrl = app.resolveUploadUrl(url)
            const imgs = [...(this.data.imageUrls || []), resolvedUrl]
            const raws = [...(this.data.rawImageUrls || []), url]
            this.setData({ imageUrls: imgs, rawImageUrls: raws })
          } else {
            wx.showToast({ title: data.message || '上传失败', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      },
      fail: (e) => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  removeImage(e) {
    const idx = Number((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || -1)
    if (idx < 0) return
    const imgs = [...(this.data.imageUrls || [])]
    const raws = [...(this.data.rawImageUrls || [])]
    imgs.splice(idx, 1)
    raws.splice(idx, 1)
    this.setData({ imageUrls: imgs, rawImageUrls: raws })
  },

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
    const arr = this.data.rawImageUrls || []
    const image_urls = arr
    const image_url = arr.length > 0 ? arr[0] : ''
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
        data: { title, content, status, scheduled_at, image_url, image_urls }
      })
      if (res && res.success) {
        wx.showToast({ title: '已创建', icon: 'none' })
        this.setData({ title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '', imageUrls: [], rawImageUrls: [] })
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
    const arr = this.data.rawImageUrls || []
    const image_urls = arr
    const image_url = arr.length > 0 ? arr[0] : ''
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
        data: { title, content, status, scheduled_at, image_url, image_urls }
      })
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'none' })
        this.setData({ editingId: null, title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '', imageUrls: [], rawImageUrls: [] })
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
    const rawArr = Array.isArray(item.image_urls) ? item.image_urls : []
    const raws = rawArr.map(u => String(u))
    const imgs = raws.map(u => app.resolveUploadUrl(u))
    this.setData({ editingId: id, title: item.title || '', content: item.content || '', statusIndex: idx, scheduledDate, scheduledTime, imageUrls: imgs, rawImageUrls: raws })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({ editingId: null, title: '', content: '', statusIndex: 0, scheduledDate: '', scheduledTime: '', imageUrls: [], rawImageUrls: [] })
  },

  useAnnouncementAsTemplate(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const item = (this.data.announcements || []).find(a => a.id === id)
    if (!item) return
    const rawArr = Array.isArray(item.image_urls) ? item.image_urls : []
    const raws = rawArr.map(u => String(u))
    const imgs = raws.map(u => app.resolveUploadUrl(u))
    this.setData({ editingId: null, title: item.title || '', content: item.content || '', statusIndex: 0, scheduledDate: '', scheduledTime: '', imageUrls: imgs, rawImageUrls: raws })
    try { wx.showToast({ title: '已载入模板', icon: 'none' }) } catch (_) {}
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
