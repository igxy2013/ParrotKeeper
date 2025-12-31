const app = getApp()

Page({
  data: {
    sourceUrl: '',
    resultUrl: '',
    generating: false
  },

  async choosePhoto() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] })
      if (!res || !res.tempFiles || !res.tempFiles.length) return
      const filePath = res.tempFiles[0].tempFilePath || res.tempFiles[0].filePath
      app.showLoading('正在上传...')
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: (app.globalData.baseUrl || '') + '/api/upload/image',
          filePath,
          name: 'file',
          formData: { category: 'id_photos' },
          header: {
            'X-OpenID': app.globalData.openid || '',
            'X-User-Mode': app.globalData.userMode || 'personal'
          },
          success: r => resolve(r),
          fail: e => reject(e)
        })
      })
      app.hideLoading()
      if (uploadRes.statusCode !== 200) { wx.showToast({ title: '上传失败', icon: 'none' }); return }
      let payload = {}
      try { payload = JSON.parse(uploadRes.data || '{}') } catch (_) { payload = {} }
      if (!payload || !payload.success || !payload.data || !payload.data.url) { wx.showToast({ title: payload.message || '上传失败', icon: 'none' }); return }
      const resolved = app.resolveUploadUrl(payload.data.url)
      this.setData({ sourceUrl: resolved, resultUrl: '' })
    } catch (e) {
      app.hideLoading()
      wx.showToast({ title: '选择或上传失败', icon: 'none' })
    }
  },

  async generateIdPhoto() {
    if (!this.data.sourceUrl || this.data.generating) return
    try {
      this.setData({ generating: true })
      app.showLoading('正在制作...')
      let raw = String(this.data.sourceUrl || '').trim()
      let imagePath = raw
      if (/^https?:\/:\//.test(raw)) {
        const m = raw.match(/\/uploads\/(.+)$/)
        if (m && m[1]) imagePath = m[1]
      } else {
        imagePath = raw.replace(/^\/?uploads\//, '').replace(/^\/?images\//, '')
      }
      const res = await app.request({
        url: '/api/image/generate-id-photo',
        method: 'POST',
        data: {
          image_path: imagePath,
          prompt: '为这只鹦鹉做一张类似于苹果高管的白底证件照。'
        }
      })
      const url = (res && (res.processed_url || res.generated_url || (res.data && (res.data.processed_url || res.data.generated_url || res.data.url)) || res.url)) || ''
      if (url) {
        const final = app.resolveUploadUrl(url)
        this.setData({ resultUrl: final })
        app.showSuccess('制作完成')
      } else {
        wx.showToast({ title: (res && res.message) || '制作失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '制作失败', icon: 'none' })
    } finally {
      app.hideLoading()
      this.setData({ generating: false })
    }
  },

  previewSource() {
    if (!this.data.sourceUrl) return
    wx.previewImage({ urls: [this.data.sourceUrl] })
  },

  previewResult() {
    if (!this.data.resultUrl) return
    wx.previewImage({ urls: [this.data.resultUrl] })
  },

  async saveResult() {
    if (!this.data.resultUrl) return
    try {
      const info = await wx.getImageInfo({ src: this.data.resultUrl })
      await wx.saveImageToPhotosAlbum({ filePath: info.path })
      wx.showToast({ title: '已保存到相册', icon: 'none' })
    } catch (_) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
