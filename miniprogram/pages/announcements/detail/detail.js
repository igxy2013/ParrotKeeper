// pages/announcements/detail/detail.js
const app = getApp()

Page({
  data: {
    loading: false,
    announcement: null,
    imageList: [],
    imageStyles: [],
    containerWidthPx: 0
  },

  onLoad(options) {
    const id = options && options.id ? String(options.id) : ''
    this.annId = id
    try {
      const sys = wx.getSystemInfoSync()
      const w = sys && sys.windowWidth ? Number(sys.windowWidth) : 0
      const paddingRpx = 24
      const paddingPx = w ? (paddingRpx * w / 750) : 0
      const containerWidthPx = Math.max(0, w - 2 * paddingPx)
      this.setData({ containerWidthPx })
    } catch (_) {}
    this.loadDetail()
  },

  async loadDetail() {
    if (!this.annId) { this.setData({ announcement: null }); return }
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: `/api/announcements/${encodeURIComponent(this.annId)}`, method: 'GET' })
      if (res && res.success && res.data && res.data.announcement) {
        const a = res.data.announcement
        const created_at_display = a.created_at ? a.created_at.replace('T',' ').slice(0,19) : ''
        const raws = Array.isArray(a.image_urls) ? a.image_urls : (a.image_url ? [a.image_url] : [])
        const imgs = raws.map(u => app.resolveUploadUrl(u))
        this.setData({ announcement: { ...a, created_at_display }, imageList: imgs })
        this.computeImageStyles(imgs)
      } else {
        this.setData({ announcement: null })
      }
    } catch (e) {
      this.setData({ announcement: null })
    } finally {
      this.setData({ loading: false })
    }
  },

  async computeImageStyles(imgs) {
    try {
      const arr = Array.isArray(imgs) ? imgs : []
      const maxW = Number(this.data.containerWidthPx || 0)
      const tasks = arr.map(src => new Promise(resolve => {
        try {
          wx.getImageInfo({
            src,
            success: (info) => {
              const naturalW = Number(info && info.width) || 0
              const w = (maxW && naturalW) ? Math.min(naturalW, maxW) : (maxW || naturalW || 0)
              resolve(w > 0 ? `width:${w}px;` : '')
            },
            fail: () => resolve('')
          })
        } catch (_) { resolve('') }
      }))
      const styles = await Promise.all(tasks)
      this.setData({ imageStyles: styles })
    } catch (_) { this.setData({ imageStyles: [] }) }
  },

  previewImage(e) {
    const idx = Number((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0)
    const urls = this.data.imageList || []
    if (!urls.length) return
    try {
      wx.previewImage({ current: urls[idx] || urls[0], urls })
    } catch (_) {}
  }
})
