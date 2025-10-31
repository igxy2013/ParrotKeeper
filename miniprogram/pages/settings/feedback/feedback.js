// pages/settings/feedback/feedback.js
const app = getApp()

Page({
  data: {
    form: {
      content: ''
    },
    photos: [], // { tempPath, url }
    canSubmit: false
  },

  onLoad() {
    this.updateSubmitState()
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value || ''
    this.setData({ [`form.${field}`]: value }, () => this.updateSubmitState())
  },

  updateSubmitState() {
    const { content } = this.data.form
    this.setData({ canSubmit: !!(content && content.trim().length > 0) })
  },

  choosePhoto() {
    wx.chooseMedia({
      count: Math.max(0, 3 - this.data.photos.length),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map(f => ({ tempPath: f.tempFilePath }))
        this.setData({ photos: [...this.data.photos, ...files].slice(0, 3) })
      }
    })
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index
    const urls = this.data.photos.map(p => p.url || p.tempPath)
    wx.previewImage({ current: urls[idx], urls })
  },

  removePhoto(e) {
    const idx = e.currentTarget.dataset.index
    const arr = [...this.data.photos]
    arr.splice(idx, 1)
    this.setData({ photos: arr })
  },

  async uploadIfNeeded(photo) {
    if (photo.url) return photo.url
    // 上传到后端通用上传接口
    const uploadRes = await new Promise((resolve, reject) => {
      wx.uploadFile({
        url: app.globalData.baseUrl + '/api/upload/image',
        filePath: photo.tempPath,
        name: 'file',
        formData: { category: 'feedback' },
        header: { 'X-OpenID': app.globalData.openid },
        success: resolve,
        fail: reject
      })
    })
    const result = JSON.parse(uploadRes.data)
    if (result && result.success && result.data && result.data.url) {
      const fullUrl = app.globalData.baseUrl + '/uploads/' + result.data.url
      photo.url = fullUrl
      return fullUrl
    }
    throw new Error(result && result.message ? result.message : '上传失败')
  },

  async submitFeedback() {
    if (!this.data.canSubmit) return
    try {
      app.showLoading('提交中...')
      // 逐个上传图片，获取URL
      const image_urls = []
      for (const p of this.data.photos) {
        const url = await this.uploadIfNeeded(p)
        image_urls.push(url)
      }

      const res = await app.request({
        url: '/api/feedback',
        method: 'POST',
        data: {
          content: this.data.form.content.trim(),
          image_urls
        }
      })

      if (res && res.success) {
        app.showSuccess('反馈已提交，感谢您的宝贵意见！')
        // 清空表单
        this.setData({ form: { content: '' }, photos: [], canSubmit: false })
      } else {
        throw new Error(res && res.message ? res.message : '提交失败')
      }
    } catch (err) {
      console.error('提交反馈失败:', err)
      app.showError(err.message || '提交反馈失败')
    } finally {
      app.hideLoading()
    }
  }
})
