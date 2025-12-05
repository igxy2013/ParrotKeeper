const app = getApp()

Component({
  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: 'add' },
    title: { type: String, value: '' },
    parrot: { type: Object, value: null },
    parrotTypes: { type: Array, value: [] },
    speciesList: { type: Array, value: [] },
    disableBlur: { type: Boolean, value: false }
  },
  data: {
    form: {
      id: '',
      name: '',
      type: '',
      weight: '',
      gender: '',
      gender_display: '',
      color: '',
      birth_date: '',
      notes: '',
      parrot_number: '',
      ring_number: '',
      acquisition_date: '',
      photo_url: ''
    },
    typeIndex: 0,
    createMode: 'form',
    claimCode: ''
  },
  observers: {
    'parrot, parrotTypes': function(parrot, types) {
      if (!parrot) return
      // 初始化表单
      const genderDisplay = this.apiGenderToDisplay(parrot.gender)
      const form = {
        id: parrot.id || '',
        name: parrot.name || '',
        type: parrot.type || parrot.species_name || '',
        weight: parrot.weight || '',
        gender: parrot.gender || '',
        gender_display: genderDisplay,
        color: parrot.color || '',
        birth_date: parrot.birth_date || parrot.birthDate || '',
        notes: parrot.notes || '',
        parrot_number: parrot.parrot_number || '',
        ring_number: parrot.ring_number || '',
        acquisition_date: parrot.acquisition_date || '',
        photo_url: parrot.photo_url || parrot.avatar_url || ''
      }
      let typeIndex = 0
      if (types && types.length && form.type) {
        const idx = types.indexOf(form.type)
        typeIndex = idx >= 0 ? idx : 0
      }
      this.setData({ form, typeIndex })
    }
  },
  methods: {
    stopPropagation() {},
    onOverlayTap() { this.triggerEvent('cancel') },
    onCancel() { this.triggerEvent('cancel') },

    setCreateMode(e) {
      const m = e.currentTarget.dataset.mode
      this.setData({ createMode: m || 'form' })
    },

    onInputChange(e) {
      const field = e.currentTarget.dataset.field
      const value = e.detail.value
      this.setData({ [`form.${field}`]: value })
    },
    onTypePickerChange(e) {
      const idx = Number(e.detail.value)
      const type = (this.data.parrotTypes || [])[idx]
      this.setData({ typeIndex: idx, 'form.type': type })
    },
    setGenderDisplay(e) {
      const d = e.currentTarget.dataset.gender
      const apiGender = this.displayGenderToApi(d)
      this.setData({ 'form.gender_display': d, 'form.gender': apiGender })
    },
    onDateChange(e) {
      const field = e.currentTarget.dataset.field
      const value = e.detail.value
      this.setData({ [`form.${field}`]: value })
    },

    onInputClaimCode(e) {
      const value = (e && e.detail && e.detail.value) || ''
      this.setData({ claimCode: value.toUpperCase() })
    },

    // 图片相关
    choosePhoto() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath
          this.uploadPhoto(tempFilePath)
        }
      })
    },
    async uploadPhoto(filePath) {
      try {
        app.showLoading('上传中...')
        const uploadRes = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: app.globalData.baseUrl + '/api/upload/image',
            filePath,
            name: 'file',
            formData: { category: 'parrots' },
            header: { 'X-OpenID': app.globalData.openid },
            success: resolve,
            fail: reject
          })
        })
        const result = JSON.parse(uploadRes.data)
        if (result.success) {
          const fullUrl = app.globalData.baseUrl + '/uploads/' + result.data.url
          this.setData({ 'form.photo_url': fullUrl })
          app.showSuccess('上传成功')
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error('上传照片失败:', error)
        app.showError('上传照片失败')
      } finally {
        app.hideLoading()
      }
    },
    previewPhoto() {
      if (!this.data.form.photo_url) return
      wx.previewImage({ urls: [this.data.form.photo_url] })
    },
    deletePhoto() {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'form.photo_url': '' })
          }
        }
      })
    },

    // 抠图前确认
    confirmRemoveBg() {
      if (!this.data.form || !this.data.form.photo_url) {
        app.showError('暂无可处理的照片')
        return
      }
      wx.showModal({
        title: 'AI一键抠图',
        content: '将使用AI对当前照片进行抠图，移除背景并裁剪空白。是否继续？',
        confirmText: '继续',
        success: (res) => {
          if (res.confirm) {
            this.processPhotoRemoveBg()
          }
        }
      })
    },

    // 调用后端进行抠图并替换
    async processPhotoRemoveBg() {
      let isLoading = false
      try {
        app.showLoading('抠图处理中...')
        isLoading = true
        const currentUrl = this.data.form.photo_url
        console.log('发送抠图请求，图片路径:', currentUrl)
        
        if (!currentUrl) {
          throw new Error('图片路径为空')
        }
        
        const res = await app.request({
          url: '/api/image/process-existing',
          method: 'POST',
          data: { image_path: currentUrl }
        })

        const processedUrl = res && (res.processed_url || (res.data && res.data.processed_url))
        if (!processedUrl) {
          throw new Error(res && (res.error || res.message) || '抠图处理失败')
        }

        // 统一存储相对路径（与上传逻辑一致）：提取 /uploads/ 之后的部分
        let storagePath = processedUrl
        const m = String(processedUrl).match(/\/uploads\/(.+)$/)
        if (m && m[1]) storagePath = m[1]

        // 更新表单中的照片URL
        const fullUrl = app.resolveUploadUrl(storagePath)
        this.setData({ 'form.photo_url': fullUrl })
        app.showSuccess('抠图成功')
      } catch (e) {
        console.error('抠图失败:', e)
        wx.showModal({
          title: '温馨提示',
          content: '今日AI免费抠图名额已耗尽，请明天再来试试吧！',
          showCancel: false
        })
      } finally {
        if (isLoading) {
          app.hideLoading()
        }
      }
    },

    // 性别映射（显示<->接口）
    apiGenderToDisplay(g) {
      if (g === 'male') return '雄性'
      if (g === 'female') return '雌性'
      return ''
    },
    displayGenderToApi(d) {
      if (d === '雄性') return 'male'
      if (d === '雌性') return 'female'
      return 'unknown'
    },

    // 提交（仅做校验与规范化，网络请求由父页面处理）
    onSubmit() {
      // 认领模式：直接把过户码上抛给父页面
      if (this.data.mode !== 'edit' && this.data.createMode === 'claim') {
        const code = (this.data.claimCode || '').trim()
        if (!code || code.length !== 8) {
          app.showError('请输入 8 位过户码')
          return
        }
        const payload = { id: '', data: { code }, mode: 'claim' }
        this.triggerEvent('submit', payload)
        return
      }

      const f = { ...this.data.form }
      if (!f.name || !f.type) {
        app.showError('请填写必填项：名字与品种')
        return
      }
      // 处理 species_id 映射
      let species_id = ''
      try {
        const match = (this.data.speciesList || []).find(s => s.name === f.type)
        if (match) species_id = match.id
      } catch (_) { species_id = '' }

      // 处理数字字段
      if (f.weight) {
        const num = parseFloat(f.weight)
        if (!isNaN(num)) f.weight = num
      }

      const submitData = {
        name: f.name,
        species_id,
        gender: f.gender || this.displayGenderToApi(f.gender_display),
        birth_date: f.birth_date || '',
        color: f.color || '',
        weight: f.weight || '',
        notes: f.notes || '',
        parrot_number: f.parrot_number || '',
        ring_number: f.ring_number || '',
        acquisition_date: f.acquisition_date || '',
        photo_url: f.photo_url || ''
      }

      // 空值清理：保留可为空字符串的字段（包括 photo_url 用于清空照片）
      Object.keys(submitData).forEach(key => {
        if (
          submitData[key] === '' &&
          key !== 'parrot_number' &&
          key !== 'ring_number' &&
          key !== 'photo_url'
        ) {
          delete submitData[key]
        }
      })

      const payload = { id: f.id, data: submitData, mode: this.data.mode }
      this.triggerEvent('submit', payload)
    }
  }
})
