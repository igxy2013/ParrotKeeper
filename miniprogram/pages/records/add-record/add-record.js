// pages/records/add-record/add-record.js
const app = getApp()

Page({
  data: {
    // 记录类型
    recordType: 'feeding',
    
    // 表单数据
    formData: {
      parrot_id: '',
      record_date: '',
      record_time: '',
      notes: '',
      photos: [],
      
      // 喂食记录字段
      food_type: '',
      amount: '',
      
      // 健康检查字段
      weight: '',
      temperature: '',
      health_status: 'healthy'
    },
    
    // 选择器数据
    parrotList: [],
    selectedParrotName: '',
    healthStatusText: '健康',
    
    // 弹窗状态
    showParrotModal: false,
    showHealthStatusModal: false,
    
    // 表单状态
    canSubmit: false,
    submitting: false,
    
    // 其他
    today: '',
    recordId: null // 编辑模式下的记录ID
  },

  onLoad(options) {
    // 设置今天日期和当前时间
    const now = new Date()
    const todayStr = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0')
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                   String(now.getMinutes()).padStart(2, '0')
    
    this.setData({
      today: todayStr,
      'formData.record_date': todayStr,
      'formData.record_time': timeStr
    })
    
    // 处理传入参数
    if (options.type) {
      this.setData({
        recordType: options.type
      })
    }
    
    if (options.parrotId && options.parrotName) {
      this.setData({
        'formData.parrot_id': options.parrotId,
        selectedParrotName: decodeURIComponent(options.parrotName)
      })
    }
    
    // 检查是否为编辑模式
    if (options.id) {
      this.setData({
        recordId: options.id
      })
      wx.setNavigationBarTitle({
        title: '编辑记录'
      })
      this.loadRecordData(options.id)
    } else {
      wx.setNavigationBarTitle({
        title: '添加记录'
      })
    }
    
    this.loadParrotList()
    this.validateForm()
  },

  // 加载鹦鹉列表
  async loadParrotList() {
    try {
      const res = await app.request('/api/parrots', 'GET', { limit: 100 })
      if (res.success) {
        this.setData({
          parrotList: res.data.parrots || []
        })
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载记录数据（编辑模式）
  async loadRecordData(recordId) {
    try {
      app.showLoading('加载中...')
      const res = await app.request(`/api/records/${recordId}`, 'GET')
      if (res.success) {
        const record = res.data
        
        // 查找鹦鹉名称
        const parrot = this.data.parrotList.find(p => p.id === record.parrot_id)
        const selectedParrotName = parrot ? parrot.name : ''
        
        // 获取健康状态文本
        const healthStatusMap = {
          'healthy': '健康',
          'sick': '生病',
          'recovering': '康复中',
          'observation': '观察中'
        }
        
        // 解析记录时间
        const recordTime = new Date(record.record_time)
        const dateStr = recordTime.getFullYear() + '-' + 
                       String(recordTime.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(recordTime.getDate()).padStart(2, '0')
        const timeStr = String(recordTime.getHours()).padStart(2, '0') + ':' + 
                       String(recordTime.getMinutes()).padStart(2, '0')
        
        this.setData({
          recordType: record.type,
          formData: {
            parrot_id: record.parrot_id || '',
            record_date: dateStr,
            record_time: timeStr,
            notes: record.notes || '',
            photos: record.photos ? JSON.parse(record.photos) : [],
            
            // 喂食记录字段
            food_type: record.food_type || '',
            amount: record.amount ? String(record.amount) : '',
            
            // 健康检查字段
            weight: record.weight ? String(record.weight) : '',
            temperature: record.temperature ? String(record.temperature) : '',
            health_status: record.health_status || 'healthy'
          },
          selectedParrotName,
          healthStatusText: healthStatusMap[record.health_status] || '健康'
        })
        
        this.validateForm()
      }
    } catch (error) {
      console.error('加载记录数据失败:', error)
      app.showError('加载记录数据失败')
    } finally {
      app.hideLoading()
    }
  },

  // 选择记录类型
  selectType(e) {
    const { type } = e.currentTarget.dataset
    this.setData({
      recordType: type
    })
    this.validateForm()
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

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.record_date': e.detail.value
    })
    this.validateForm()
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.record_time': e.detail.value
    })
    this.validateForm()
  },

  // 显示鹦鹉选择器
  showParrotPicker() {
    this.setData({
      showParrotModal: true
    })
  },

  // 隐藏鹦鹉选择器
  hideParrotPicker() {
    this.setData({
      showParrotModal: false
    })
  },

  // 选择鹦鹉
  selectParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      'formData.parrot_id': id,
      selectedParrotName: name,
      showParrotModal: false
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

  // 选择照片
  choosePhoto() {
    const maxCount = 3 - this.data.formData.photos.length
    if (maxCount <= 0) {
      app.showError('最多只能添加3张照片')
      return
    }
    
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        res.tempFiles.forEach(file => {
          this.uploadPhoto(file.tempFilePath)
        })
      }
    })
  },

  // 上传照片
  async uploadPhoto(filePath) {
    try {
      app.showLoading('上传中...')
      
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.apiBase + '/api/upload/image',
          filePath: filePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: resolve,
          fail: reject
        })
      })
      
      const result = JSON.parse(uploadRes.data)
      if (result.success) {
        const photos = [...this.data.formData.photos, result.data.url]
        this.setData({
          'formData.photos': photos
        })
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

  // 预览照片
  previewPhoto(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: this.data.formData.photos
    })
  },

  // 删除照片
  deletePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = [...this.data.formData.photos]
    photos.splice(index, 1)
    
    this.setData({
      'formData.photos': photos
    })
  },

  // 表单验证
  validateForm() {
    const { parrot_id, record_date, record_time } = this.data.formData
    const canSubmit = parrot_id && record_date && record_time
    
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
    const { parrot_id, record_date, record_time } = this.data.formData
    if (!parrot_id) {
      app.showError('请选择鹦鹉')
      return
    }
    if (!record_date || !record_time) {
      app.showError('请选择记录时间')
      return
    }

    this.setData({
      submitting: true
    })

    try {
      // 准备提交数据
      const submitData = {
        type: this.data.recordType,
        parrot_id: this.data.formData.parrot_id,
        record_time: `${this.data.formData.record_date} ${this.data.formData.record_time}:00`,
        notes: this.data.formData.notes,
        photos: JSON.stringify(this.data.formData.photos)
      }
      
      // 根据记录类型添加特定字段
      if (this.data.recordType === 'feeding') {
        if (this.data.formData.food_type) {
          submitData.food_type = this.data.formData.food_type
        }
        if (this.data.formData.amount) {
          submitData.amount = parseFloat(this.data.formData.amount)
        }
      } else if (this.data.recordType === 'health_check') {
        if (this.data.formData.weight) {
          submitData.weight = parseFloat(this.data.formData.weight)
        }
        if (this.data.formData.temperature) {
          submitData.temperature = parseFloat(this.data.formData.temperature)
        }
        submitData.health_status = this.data.formData.health_status
      }
      
      // 移除空字段
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
          delete submitData[key]
        }
      })

      let res
      if (this.data.recordId) {
        // 编辑模式
        res = await app.request(`/api/records/${this.data.recordId}`, 'PUT', submitData)
      } else {
        // 添加模式
        res = await app.request('/api/records', 'POST', submitData)
      }

      if (res.success) {
        app.showSuccess(this.data.recordId ? '编辑成功' : '添加成功')
        
        // 返回上一页并刷新
        setTimeout(() => {
          wx.navigateBack({
            success: () => {
              // 通知上一页刷新数据
              const pages = getCurrentPages()
              const prevPage = pages[pages.length - 2]
              if (prevPage) {
                if (prevPage.loadRecords) {
                  prevPage.loadRecords()
                } else if (prevPage.loadOverview) {
                  prevPage.loadOverview()
                } else if (prevPage.loadParrotDetail) {
                  prevPage.loadParrotDetail()
                }
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