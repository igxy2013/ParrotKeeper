// pages/parrots/add-parrot/add-parrot.js
const app = getApp()

Page({
  data: {
    // 表单数据
    formData: {
      name: '',
      species_id: '',
      gender: '',
      birth_date: '',
      acquisition_date: '',
      weight: '',
      health_status: 'healthy',
      photo_url: '',
      processed_photo_url: '', // 添加抠图后的图片URL
      avatar_url: '/images/parrot-avatar-green.svg', // 默认头像
      notes: '',
      parrot_number: '',
      ring_number: ''
    },
    
    // 选择器数据
    speciesList: [],
    selectedSpeciesName: '',
    healthStatusText: '健康',
    
    // 头像选项
    avatarOptions: [
      { id: 1, name: '绿色', url: '/images/parrot-avatar-green.svg' },
      { id: 2, name: '蓝色', url: '/images/parrot-avatar-blue.svg' },
      { id: 3, name: '红色', url: '/images/parrot-avatar-red.svg' },
      { id: 4, name: '黄色', url: '/images/parrot-avatar-yellow.svg' },
      { id: 5, name: '紫色', url: '/images/parrot-avatar-purple.svg' },
      { id: 6, name: '橙色', url: '/images/parrot-avatar-orange.svg' }
    ],
    
    // 弹窗状态
    showSpeciesModal: false,
    showHealthStatusModal: false,
    showAvatarModal: false,
    
    // 表单状态
    canSubmit: false,
    submitting: false,
    
    // 其他
    today: '',
    parrotId: null // 编辑模式下的鹦鹉ID
  },

  async onLoad(options) {
    // 设置今天日期
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0')
    
    this.setData({
      today: todayStr
    })
    
    // 先加载品种列表
    await this.loadSpeciesList()
    
    // 检查是否为编辑模式
    if (options.id) {
      this.setData({
        parrotId: options.id
      })
      wx.setNavigationBarTitle({
        title: '编辑鹦鹉'
      })
      await this.loadParrotData(options.id)
    } else {
      wx.setNavigationBarTitle({
        title: '添加鹦鹉'
      })
    }
  },

  // 加载鹦鹉品种列表
  async loadSpeciesList() {
    try {
      const res = await app.request({
        url: '/api/parrots/species',
        method: 'GET'
      })
      if (res.success) {
        this.setData({
          speciesList: res.data
        })
      }
    } catch (error) {
      console.error('加载品种列表失败:', error)
      app.showError('加载品种列表失败')
    }
  },

  // 加载鹦鹉数据（编辑模式）
  async loadParrotData(parrotId) {
    try {
      app.showLoading('加载中...')
      const res = await app.request({
        url: `/api/parrots/${parrotId}`,
        method: 'GET'
      })
      if (res.success) {
        const parrot = res.data
        console.log('加载的鹦鹉数据:', parrot)
        console.log('当前品种列表:', this.data.speciesList)
        
        // 规范化品种ID，优先使用species_id，其次使用嵌套的species.id
        let speciesId = parrot.species_id
        if (!speciesId && parrot.species && parrot.species.id) {
          speciesId = parrot.species.id
          console.log('从嵌套species对象获取到品种ID:', speciesId)
        }
        
        // 初始品种名称，优先使用嵌套的species.name或返回的species_name
        let selectedSpeciesName = (parrot.species && parrot.species.name) || parrot.species_name || ''
        
        // 确保品种列表已加载，然后通过ID匹配品种名称
        if (!this.data.speciesList || this.data.speciesList.length === 0) {
          console.log('品种列表为空，重新加载...')
          await this.loadSpeciesList()
        }
        
        console.log('可用于匹配的品种列表:', this.data.speciesList.map(s => ({ id: s.id, type: typeof s.id, name: s.name })))
        console.log('待匹配的鹦鹉品种ID:', speciesId, '类型:', typeof speciesId)
        
        if (speciesId) {
          const matched = this.data.speciesList.find(s => String(s.id) === String(speciesId))
          if (matched) {
            selectedSpeciesName = matched.name
            console.log('根据ID匹配到的品种:', matched)
          } else {
            console.log('未能通过ID匹配到品种，保留后端提供的名称:', selectedSpeciesName)
          }
        } else {
          console.log('鹦鹉没有设置品种ID')
        }
        
        // 获取健康状态文本
        const healthStatusMap = {
          'healthy': '健康',
          'sick': '生病',
          'recovering': '康复中',
          'observation': '观察中'
        }
        
        this.setData({
          formData: {
            name: parrot.name || '',
            species_id: speciesId || '',
            gender: parrot.gender || '',
            birth_date: parrot.birth_date || '',
            acquisition_date: parrot.acquisition_date || '',
            weight: parrot.weight ? String(parrot.weight) : '',
            health_status: parrot.health_status || 'healthy',
            photo_url: parrot.photo_url || '',
            avatar_url: parrot.avatar_url || '/images/parrot-avatar-green.svg', // 从数据库加载头像
            notes: parrot.notes || '',
            parrot_number: parrot.parrot_number || '',
            ring_number: parrot.ring_number || ''
          },
          selectedSpeciesName,
          healthStatusText: healthStatusMap[parrot.health_status] || '健康'
        })
        
        console.log('设置后的数据:', {
          formData: this.data.formData,
          selectedSpeciesName: this.data.selectedSpeciesName
        })
        
        this.validateForm()
      }
    } catch (error) {
      console.error('加载鹦鹉数据失败:', error)
      app.showError('加载鹦鹉数据失败')
    } finally {
      app.hideLoading()
    }
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value
    })
    
    this.validateForm()
  },

  // 性别选择
  onGenderChange(e) {
    const gender = e.detail.value
    this.setData({
      'formData.gender': gender
    })
    this.validateForm()
  },

  // 出生日期选择
  onBirthDateChange(e) {
    this.setData({
      'formData.birth_date': e.detail.value
    })
    this.validateForm()
  },

  // 入住日期选择
  onAcquisitionDateChange(e) {
    this.setData({
      'formData.acquisition_date': e.detail.value
    })
    this.validateForm()
  },

  // 显示品种选择器
  showSpeciesPicker() {
    this.setData({
      showSpeciesModal: true
    })
  },

  // 隐藏品种选择器
  hideSpeciesPicker() {
    this.setData({
      showSpeciesModal: false
    })
  },

  // 选择品种
  selectSpecies(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      'formData.species_id': id,
      selectedSpeciesName: name,
      showSpeciesModal: false
    })
    this.validateForm()
  },

  // 显示健康状态选择器
  showHealthStatusPicker() {
    this.setData({
      showHealthStatusModal: true
    })
  },

  // 隐藏健康状态选择器
  hideHealthStatusPicker() {
    this.setData({
      showHealthStatusModal: false
    })
  },

  // 选择健康状态
  selectHealthStatus(e) {
    const { status } = e.currentTarget.dataset
    const statusMap = {
      'healthy': '健康',
      'sick': '生病',
      'recovering': '康复中',
      'observation': '观察中'
    }
    
    this.setData({
      'formData.health_status': status,
      healthStatusText: statusMap[status],
      showHealthStatusModal: false
    })
    this.validateForm()
  },

  // 显示头像选择器
  showAvatarPicker() {
    this.setData({
      showAvatarModal: true
    })
  },

  // 隐藏头像选择器
  hideAvatarPicker() {
    this.setData({
      showAvatarModal: false
    })
  },

  // 选择头像
  selectAvatar(e) {
    const { url, name } = e.currentTarget.dataset
    this.setData({
      'formData.avatar_url': url,
      showAvatarModal: false
    })
    this.validateForm()
  },

  // 选择照片
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadPhoto(tempFilePath)
      }
    })
  },

  // 上传照片并自动抠图
  async uploadPhoto(filePath) {
    try {
      app.showLoading('上传并处理中...')
      
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.baseUrl + '/api/image/remove-background',
          filePath: filePath,
          name: 'image',
          header: {
            'X-OpenID': app.globalData.openid
          },
          success: (res) => {
            console.log('上传响应:', res)
            if (res.statusCode === 200) {
              resolve(res)
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.data}`))
            }
          },
          fail: (err) => {
            console.error('上传请求失败:', err)
            reject(err)
          }
        })
      })
      
      console.log('解析响应数据:', uploadRes.data)
      const result = JSON.parse(uploadRes.data)
      
      if (result.original_url) {
        // 设置原图和抠图后的图片URL
        this.setData({
          'formData.photo_url': result.original_url
        })
        
        if (result.processed_url) {
          this.setData({
            'formData.processed_photo_url': result.processed_url
          })
          app.showSuccess('上传成功，已自动抠图')
        } else {
          app.showSuccess('上传成功，抠图处理失败')
        }
      } else if (result.error) {
        throw new Error(result.error)
      } else {
        throw new Error('上传失败，未知错误')
      }
    } catch (error) {
      console.error('上传照片失败:', error)
      app.showError(`上传照片失败: ${error.message}`)
    } finally {
      app.hideLoading()
    }
  },

  // 手动对已上传图片进行抠图
  async processExistingImage() {
    if (!this.data.formData.photo_url) {
      app.showError('请先上传图片')
      return
    }
    
    try {
      app.showLoading('抠图处理中...')
      
      const res = await app.request({
        url: '/api/image/process-existing',
        method: 'POST',
        data: {
          image_path: this.data.formData.photo_url
        }
      })
      
      if (res.processed_url) {
        this.setData({
          'formData.processed_photo_url': res.processed_url
        })
        app.showSuccess('抠图处理成功')
      } else {
        throw new Error(res.error || '抠图处理失败')
      }
    } catch (error) {
      console.error('抠图处理失败:', error)
      app.showError('抠图处理失败')
    } finally {
      app.hideLoading()
    }
  },

  // 预览照片
  previewPhoto() {
    wx.previewImage({
      urls: [this.data.formData.photo_url]
    })
  },

  // 删除照片
  deletePhoto() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'formData.photo_url': ''
          })
        }
      }
    })
  },

  // 表单验证
  validateForm() {
    const { name, species_id, gender } = this.data.formData
    const canSubmit = name.trim() && species_id && gender
    
    this.setData({
      canSubmit
    })
  },

  // 提交表单
  async submitForm() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    // 验证必填字段
    const { name, species_id, gender } = this.data.formData
    if (!name.trim()) {
      app.showError('请输入鹦鹉名称')
      return
    }
    if (!species_id) {
      app.showError('请选择品种')
      return
    }
    if (!gender) {
      app.showError('请选择性别')
      return
    }

    this.setData({
      submitting: true
    })

    try {
      // 准备提交数据
      const submitData = { ...this.data.formData }
      
      // 处理数字字段
      if (submitData.weight) {
        submitData.weight = parseFloat(submitData.weight)
      }
      
      // 移除空字段（但保留parrot_number和ring_number，允许它们为空字符串）
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' && key !== 'parrot_number' && key !== 'ring_number') {
          delete submitData[key]
        }
      })

      let res
      if (this.data.parrotId) {
        // 编辑模式
        res = await app.request({
          url: `/api/parrots/${this.data.parrotId}`,
          method: 'PUT',
          data: submitData
        })
      } else {
        // 添加模式
        res = await app.request({
          url: '/api/parrots',
          method: 'POST',
          data: submitData
        })
      }

      if (res.success) {
        app.showSuccess(this.data.parrotId ? '编辑成功' : '添加成功')
        
        // 返回上一页并刷新
        setTimeout(() => {
          wx.navigateBack({
            success: () => {
              // 通知上一页刷新数据
              const pages = getCurrentPages()
              const prevPage = pages[pages.length - 2]
              if (prevPage && prevPage.loadParrots) {
                prevPage.loadParrots(true) // 传递refresh=true参数强制刷新
              }
            }
          })
        }, 1500)
      } else {
        throw new Error(res.message)
      }
    } catch (error) {
      console.error('保存失败:', error)
      app.showError(error.message || '保存失败')
    } finally {
      this.setData({
        submitting: false
      })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})