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
      birth_place_province: '',
      birth_place_city: '',
      birth_place_county: '',
      birth_place_text: '',
      birth_date: '',
      notes: '',
      parrot_number: '',
      ring_number: '',
      acquisition_date: '',
      photo_url: '',
      photo_preview: ''
    },
    regionValue: ['', '', ''],
    typeIndex: 0,
    createMode: 'form',
    claimCode: '',
    photoTouched: false,
    plumageColors: [],
    plumageColorIndex: 0,
    plumageSplits: [],
    plumageSplitIds: [],
    showPlumagePopup: false,
    plumagePopupVisible: false,
    plumageTempColorIndex: 0,
    plumageLocalSplits: []
  },
  observers: {
    'parrot, parrotTypes, speciesList': function(parrot, types, speciesList) {
      if (!parrot) return
      // 初始化表单
      const genderDisplay = this.apiGenderToDisplay(parrot.gender)
      const province = this.sanitizeRegionPart(parrot.birth_place_province)
      const city = this.sanitizeRegionPart(parrot.birth_place_city)
      const county = this.sanitizeRegionPart(parrot.birth_place_county)
      const birthPlaceTextFromApi = this.sanitizeBirthPlaceText(parrot.birth_place)
      const birthPlaceText = birthPlaceTextFromApi || this.buildBirthPlaceText(province, city, county)
      const form = {
        id: parrot.id || '',
        name: parrot.name || '',
        type: parrot.type || parrot.species_name || '',
        weight: parrot.weight || '',
        gender: parrot.gender || '',
        gender_display: genderDisplay,
        color: parrot.color || '',
        birth_place_province: province,
        birth_place_city: city,
        birth_place_county: county,
        birth_place_text: birthPlaceText,
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
      try {
        let src = form.photo_url || ''
        if (/^\/images\/parrot-avatar-.*\.svg$/.test(src)) {
          src = src.replace(/\.svg$/i, '.png')
          form.photo_url = src
        }
        const resolved = src ? app.resolveUploadUrl(src) : ''
        form.photo_preview = resolved || ''
      } catch (_) {}
      const splitIds = (parrot && Array.isArray(parrot.plumage_split_ids)) ? parrot.plumage_split_ids : []
      const rv = [
        province,
        city,
        county
      ]
      this.setData({ form, typeIndex, photoTouched: false, plumageSplitIds: splitIds, regionValue: rv })
      this.refreshPlumageOptions()
    }
  },
  methods: {
    sanitizeRegionPart(v) {
      const s = String(v == null ? '' : v).trim()
      if (!s) return ''
      if (s === '未选择' || s === '请选择') return ''
      if (s === 'null' || s === 'undefined') return ''
      return s
    },
    sanitizeBirthPlaceText(v) {
      const s = String(v == null ? '' : v)
      if (!s.trim()) return ''
      return s
        .replace(/未选择|请选择/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    },
    buildBirthPlaceText(province, city, county) {
      return [province, city, county].filter(Boolean).join(' ')
    },
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
      this.refreshPlumageOptions()
    },
    setGenderDisplay(e) {
      const d = e.currentTarget.dataset.gender
      const apiGender = this.displayGenderToApi(d)
      this.setData({ 'form.gender_display': d, 'form.gender': apiGender })
    },
    refreshPlumageOptions() {
      try {
        const type = (this.data.form || {}).type || ''
        const list = this.data.speciesList || []
        const match = list.find(s => s.name === type)
        const colors = []
        const splits = []
        if (match && match.plumage_json) {
          try {
            const j = JSON.parse(match.plumage_json)
            if (j && Array.isArray(j.colors)) {
              j.colors.forEach(c => { if (c && c.name) colors.push(c.name) })
            }
            if (j && j.loci) {
              Object.keys(j.loci).forEach(key => {
                const gene = j.loci[key]
                if (gene && ((gene.type === 'autosomal' && !gene.incomplete) || gene.type === 'sex-linked')) {
                  if (!gene.incomplete) splits.push({ id: key, name: gene.label })
                }
              })
            }
          } catch (_) {}
        }
        let colorIndex = 0
        const currentColor = (this.data.form || {}).color || ''
        if (currentColor) {
          const idx = colors.indexOf(currentColor)
          colorIndex = idx >= 0 ? idx : 0
        }
        const existingSplitIds = (this.data.plumageSplitIds || []).map(x => String(x))
        const validSplitIds = existingSplitIds.filter(id => (splits || []).some(s => String(s.id) === id))
        this.setData({ plumageColors: colors, plumageColorIndex: colorIndex, plumageSplits: splits, plumageSplitIds: validSplitIds })
      } catch (_) {
        const keepIds = this.data.plumageSplitIds || []
        this.setData({ plumageColors: [], plumageColorIndex: 0, plumageSplits: [], plumageSplitIds: keepIds })
      }
    },
    onPlumageChange(e) {
      try {
        const { colorIndex, splitIds } = e.detail || {}
        const colors = this.data.plumageColors || []
        const name = colors[colorIndex] || ''
        this.setData({ plumageColorIndex: colorIndex, 'form.color': name, plumageSplitIds: splitIds || [] })
      } catch (_) {}
    },
    onPlumageOpen(e) {
      const colorIndex = (e && e.detail && typeof e.detail.colorIndex === 'number') ? e.detail.colorIndex : this.data.plumageColorIndex
      const tempSplits = (this.data.plumageSplits || []).map(s => ({
        ...s,
        checked: (this.data.plumageSplitIds || []).includes(s.id)
      }))
      this.setData({ showPlumagePopup: true, plumageTempColorIndex: colorIndex, plumageLocalSplits: tempSplits })
      setTimeout(() => {
        this.setData({ plumagePopupVisible: true })
      }, 0)
    },
    closePlumagePopup() {
      this.setData({ plumagePopupVisible: false })
      setTimeout(() => {
        this.setData({ showPlumagePopup: false })
      }, 300)
    },
    selectHostPlumage(e) {
      const idx = Number(e.currentTarget.dataset.index)
      this.setData({ plumageTempColorIndex: idx })
    },
    selectHostSplit(e) {
      const id = e.currentTarget.dataset.id
      const list = (this.data.plumageLocalSplits || []).map(s => {
        if (String(s.id) === String(id)) { return { ...s, checked: !s.checked } }
        return s
      })
      this.setData({ plumageLocalSplits: list })
    },
    confirmHostPlumageSelection() {
      const idx = this.data.plumageTempColorIndex || 0
      const colors = this.data.plumageColors || []
      const name = colors[idx] || ''
      const splitIds = (this.data.plumageLocalSplits || []).filter(s => s.checked).map(s => s.id)
      this.setData({ plumageColorIndex: idx, 'form.color': name, plumageSplitIds: splitIds })
      this.closePlumagePopup()
    },
    onDateChange(e) {
      const field = e.currentTarget.dataset.field
      const value = e.detail.value
      this.setData({ [`form.${field}`]: value })
    },

    onBirthPlaceChange(e) {
      try {
        const arr = e && e.detail && e.detail.value ? e.detail.value : []
        const province = this.sanitizeRegionPart(arr[0])
        const city = this.sanitizeRegionPart(arr[1])
        const county = this.sanitizeRegionPart(arr[2])
        const text = this.buildBirthPlaceText(province, city, county)
        this.setData({
          'form.birth_place_province': province,
          'form.birth_place_city': city,
          'form.birth_place_county': county,
          'form.birth_place_text': text
        , regionValue: [province, city, county] })
      } catch (_) {}
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
          // 先用本地临时文件做即时预览
          this.setData({ 'form.photo_preview': tempFilePath })
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
          const fullThumb = result.data.thumb_url ? (app.globalData.baseUrl + '/uploads/' + result.data.thumb_url) : app.getThumbnailUrl(fullUrl, 128)
          // 更新提交值，并立即切换预览到原图，随后再尝试缩略图
          this.setData({ 'form.photo_url': fullUrl, 'form.photo_preview': fullUrl, photoTouched: true })
          // 预加载远程缩略图，成功后再切换预览
          try {
            wx.getImageInfo({
              src: fullThumb,
              success: () => {
                this.setData({ 'form.photo_preview': fullThumb })
              },
              fail: () => {
                // 远程缩略图不可达则保持当前本地预览
              }
            })
          } catch (_) {
            // 忽略预加载异常，保留现有预览
          }
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
      const preview = this.data.form.photo_preview || this.data.form.photo_url
      if (!preview) return
      wx.previewImage({ urls: [preview] })
    },
    onPreviewError() {
      try {
        const url = this.data.form.photo_url || ''
        if (url && this.data.form.photo_preview !== url) {
          // 回退到原图地址作为预览，不修改表单提交值
          this.setData({ 'form.photo_preview': url })
          return
        }
        // 最终兜底：使用通用默认图片，仅影响预览，不篡改 photo_url
        const fallback = '/images/parrot-avatar-green.svg'
        this.setData({ 'form.photo_preview': fallback })
      } catch (_) {
        this.setData({ 'form.photo_preview': '/images/parrot-avatar-green.svg' })
      }
    },
    deletePhoto() {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'form.photo_url': '', 'form.photo_preview': '', photoTouched: true })
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

        // 更新表单中的照片URL，并立即更新预览为抠图后的图片
        const fullUrl = app.resolveUploadUrl(storagePath)
        const fullThumb = app.getThumbnailUrl(fullUrl, 128)
        // 先立即切换到原图，保证立刻看到效果
        this.setData({ 'form.photo_url': fullUrl, 'form.photo_preview': fullUrl, photoTouched: true })
        // 预加载缩略图，成功后再平滑替换为缩略图
        try {
          wx.getImageInfo({
            src: fullThumb,
            success: () => {
              this.setData({ 'form.photo_preview': fullThumb })
            },
            fail: () => {
              // 缩略图不可达则保持原图预览
            }
          })
        } catch (_) {}
        app.showSuccess('抠图成功')
      } catch (e) {
        console.error('抠图失败:', e)
        wx.showModal({
          title: '温馨提示',
          content: '本月AI免费抠图名额已耗尽，请下个月再来试试吧！',
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
          app.showError('请输入8位过户码')
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

      // 规范化照片路径：后端偏好接收 uploads 相对路径，避免完整 URL 导致解析异常
      let normalizedPhoto = f.photo_url || ''
      try {
        const s = String(normalizedPhoto || '').trim()
        if (s) {
          if (/^https?:\/\//.test(s)) {
            const m = s.match(/\/uploads\/(.+)$/)
            if (m && m[1]) {
              normalizedPhoto = m[1].replace(/^images\//, '')
            }
          } else {
            if (/^\/?uploads\//.test(s)) {
              normalizedPhoto = s.replace(/^\/?uploads\//, '')
            } else if (/^\/?images\//.test(s)) {
              normalizedPhoto = s.startsWith('/') ? s : '/' + s
            }
          }
        }
      } catch (_) {}

      const submitData = {
        name: f.name,
        species_id,
        gender: f.gender || this.displayGenderToApi(f.gender_display),
        birth_place: f.birth_place_text || '',
        birth_place_province: f.birth_place_province || '',
        birth_place_city: f.birth_place_city || '',
        birth_place_county: f.birth_place_county || '',
        birth_date: f.birth_date || '',
        color: f.color || '',
        weight: f.weight || '',
        notes: f.notes || '',
        parrot_number: f.parrot_number || '',
        ring_number: f.ring_number || '',
        acquisition_date: f.acquisition_date || '',
        plumage_split_ids: this.data.plumageSplitIds || []
      }

      if (this.data.photoTouched) {
        submitData.photo_url = normalizedPhoto || ''
      }

      // 空值清理：保留可为空字符串的字段（包括 photo_url 用于清空照片）
      Object.keys(submitData).forEach(key => {
        if (
          submitData[key] === '' &&
          key !== 'parrot_number' &&
          key !== 'ring_number' &&
          key !== 'photo_url' &&
          !(
            this.data.mode === 'edit' &&
            (key === 'birth_place' ||
              key === 'birth_place_province' ||
              key === 'birth_place_city' ||
              key === 'birth_place_county')
          )
        ) {
          delete submitData[key]
        }
      })

      const payload = { id: f.id, data: submitData, mode: this.data.mode }
      this.triggerEvent('submit', payload)
    }
  }
})
