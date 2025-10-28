const app = getApp()

Component({
  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: 'add' },
    title: { type: String, value: '' },
    parrot: { type: Object, value: null },
    parrotTypes: { type: Array, value: [] },
    speciesList: { type: Array, value: [] }
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
    typeIndex: 0
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

      // 空值清理，保留可为空字符串的字段
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' && key !== 'parrot_number' && key !== 'ring_number') {
          delete submitData[key]
        }
      })

      const payload = { id: f.id, data: submitData, mode: this.data.mode }
      this.triggerEvent('submit', payload)
    }
  }
})
