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
      
      // 清洁记录字段
      cleaning_type: '',
      description: '',
      
      // 健康检查字段
      weight: '',
      temperature: '',
      health_status: 'healthy',
      
      // 繁殖记录字段
      male_parrot_id: '',
      female_parrot_id: '',
      mating_date: '',
      egg_laying_date: '',
      egg_count: '',
      hatching_date: '',
      chick_count: '',
      success_rate: ''
    },
    
    // 选择器数据
    parrotList: [],
    maleParrotList: [],
    femaleParrotList: [],
    selectedParrotName: '',
    selectedMaleParrotName: '',
    selectedFemaleParrotName: '',
    healthStatusText: '健康',
    feedTypeList: [],
    selectedFeedTypeName: '',
    cleaningTypeText: '',
    
    // 弹窗状态
    showParrotModal: false,
    showMaleParrotModal: false,
    showFemaleParrotModal: false,
    showHealthStatusModal: false,
    showFeedTypeModal: false,
    showCleaningTypeModal: false,
    
    // 表单状态
    canSubmit: false,
    submitting: false,
    
    // 其他
    today: '',
    recordId: null // 编辑模式下的记录ID
  },

  async onLoad(options) {
    // 设置今天的日期
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0')
    
    this.setData({
      today: todayStr,
      'formData.record_date': todayStr,
      'formData.record_time': String(today.getHours()).padStart(2, '0') + ':' + 
                             String(today.getMinutes()).padStart(2, '0')
    })
    
    // 加载鹦鹉列表
    await this.loadParrotList()
    
    // 加载饲料类型列表
    await this.loadFeedTypeList()
    
    // 检查是否是编辑模式
    if (options.id) {
      this.setData({
        recordId: parseInt(options.id)
      })
      // 设置编辑模式的页面标题
      wx.setNavigationBarTitle({
        title: '编辑记录'
      })
      await this.loadRecordData(options.id)
    } else {
      // 设置添加模式的页面标题
      wx.setNavigationBarTitle({
        title: '添加记录'
      })
      
      // 检查是否指定了记录类型（仅在添加模式下）
      if (options.type) {
        this.setData({
          recordType: options.type
        })
      }
    }
    
    this.validateForm()
  },

  // 加载鹦鹉列表
  async loadParrotList() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      if (res.success) {
        const allParrots = res.data.parrots || []
        
        // 过滤雄性鹦鹉（包括性别未知的）
        const maleParrots = allParrots.filter(parrot => 
          parrot.gender === 'male' || parrot.gender === 'unknown' || !parrot.gender
        )
        
        // 过滤雌性鹦鹉（包括性别未知的）
        const femaleParrots = allParrots.filter(parrot => 
          parrot.gender === 'female' || parrot.gender === 'unknown' || !parrot.gender
        )
        
        this.setData({
          parrotList: allParrots,
          maleParrotList: maleParrots,
          femaleParrotList: femaleParrots
        })
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载饲料类型列表
  async loadFeedTypeList() {
    try {
      const res = await app.request({
        url: '/api/records/feed-types',
        method: 'GET'
      })
      if (res.success) {
        this.setData({
          feedTypeList: res.data
        })
      }
    } catch (error) {
      console.error('加载饲料类型失败:', error)
    }
  },

  // 加载记录数据（编辑模式）
  async loadRecordData(recordId) {
    try {
      app.showLoading('加载中...')
      const res = await app.request({
        url: `/api/records/${recordId}`,
        method: 'GET'
      })
      if (res.success) {
        const record = res.data
        
        // 查找鹦鹉名称 - 后端返回的是嵌套的parrot对象
        let selectedParrotName = ''
        let parrotId = ''
        if (record.parrot) {
          selectedParrotName = record.parrot.name
          parrotId = record.parrot.id
        } else if (record.parrot_id) {
          // 如果没有嵌套对象，从列表中查找
          const parrot = this.data.parrotList.find(p => p.id === record.parrot_id)
          selectedParrotName = parrot ? parrot.name : ''
          parrotId = record.parrot_id
        }
        
        // 查找饲料类型名称 - 后端返回的是嵌套的feed_type对象
        let selectedFeedTypeName = ''
        let feedTypeId = ''
        if (record.feed_type) {
          selectedFeedTypeName = record.feed_type.name
          feedTypeId = record.feed_type.id
        } else if (record.feed_type_id) {
          // 如果没有嵌套对象，从列表中查找
          const feedType = this.data.feedTypeList.find(f => f.id === record.feed_type_id)
          selectedFeedTypeName = feedType ? feedType.name : ''
          feedTypeId = record.feed_type_id
        }
        
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
        
        // 根据记录类型设置表单数据
        let formData = {
          parrot_id: parrotId || '',
          record_date: dateStr,
          record_time: timeStr,
          notes: record.notes || '',
          photos: record.photos ? JSON.parse(record.photos) : [],
          
          // 喂食记录字段
          food_type: feedTypeId ? String(feedTypeId) : '',
          amount: record.amount ? String(record.amount) : '',
          
          // 健康检查字段
          weight: record.weight ? String(record.weight) : '',
          temperature: record.temperature ? String(record.temperature) : '',
          health_status: record.health_status || 'healthy',
          
          // 清洁记录字段
          cleaning_type: record.cleaning_type || '',
          description: record.description || '',
          
          // 繁殖记录字段
          male_parrot_id: record.male_parrot_id ? String(record.male_parrot_id) : '',
          female_parrot_id: record.female_parrot_id ? String(record.female_parrot_id) : '',
          mating_date: record.mating_date || '',
          egg_laying_date: record.egg_laying_date || '',
          egg_count: record.egg_count ? String(record.egg_count) : '',
          hatching_date: record.hatching_date || '',
          chick_count: record.chick_count ? String(record.chick_count) : '',
          success_rate: record.success_rate ? String(record.success_rate) : ''
        }
        
        // 查找雄性和雌性鹦鹉名称（繁殖记录）
        let selectedMaleParrotName = ''
        let selectedFemaleParrotName = ''
        if (record.type === 'breeding') {
          if (record.male_parrot) {
            selectedMaleParrotName = record.male_parrot.name
          } else if (record.male_parrot_id) {
            const maleParrot = this.data.parrotList.find(p => p.id === record.male_parrot_id)
            selectedMaleParrotName = maleParrot ? maleParrot.name : ''
          }
          
          if (record.female_parrot) {
            selectedFemaleParrotName = record.female_parrot.name
          } else if (record.female_parrot_id) {
            const femaleParrot = this.data.parrotList.find(p => p.id === record.female_parrot_id)
            selectedFemaleParrotName = femaleParrot ? femaleParrot.name : ''
          }
        }
        
        // 设置清洁类型显示文本
        let cleaningTypeText = ''
        if (record.type === 'cleaning' && record.cleaning_type) {
          const cleaningTypeMap = {
            'cage': '笼子清洁',
            'toys': '玩具清洁',
            'perches': '栖木清洁',
            'food_water': '食物和水清洁'
          }
          cleaningTypeText = cleaningTypeMap[record.cleaning_type] || ''
        }
        
        this.setData({
          recordType: record.type,
          formData: formData,
          selectedParrotName,
          selectedFeedTypeName,
          selectedMaleParrotName,
          selectedFemaleParrotName,
          healthStatusText: healthStatusMap[record.health_status] || '健康',
          cleaningTypeText
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
        notes: this.data.formData.notes,
        photos: JSON.stringify(this.data.formData.photos)
      }
      
      // 根据记录类型添加特定字段和时间字段
      if (this.data.recordType === 'feeding') {
        submitData.feeding_time = `${this.data.formData.record_date} ${this.data.formData.record_time}:00`
        if (this.data.formData.food_type) {
          submitData.feed_type_id = this.data.formData.food_type
        }
        if (this.data.formData.amount) {
          submitData.amount = parseFloat(this.data.formData.amount)
        }
      } else if (this.data.recordType === 'health') {
        submitData.record_date = `${this.data.formData.record_date} ${this.data.formData.record_time}:00`
        if (this.data.formData.weight) {
          submitData.weight = parseFloat(this.data.formData.weight)
        }
        if (this.data.formData.temperature) {
          submitData.temperature = parseFloat(this.data.formData.temperature)
        }
        if (this.data.formData.health_status) {
          submitData.health_status = this.data.formData.health_status
        }
      } else if (this.data.recordType === 'cleaning') {
        submitData.cleaning_time = `${this.data.formData.record_date} ${this.data.formData.record_time}:00`
        if (this.data.formData.cleaning_type) {
          submitData.cleaning_type = this.data.formData.cleaning_type
        }
        if (this.data.formData.description) {
          submitData.description = this.data.formData.description
        }
      } else if (this.data.recordType === 'breeding') {
        // 繁殖记录特殊处理
        if (this.data.formData.male_parrot_id) {
          submitData.male_parrot_id = this.data.formData.male_parrot_id
        }
        if (this.data.formData.female_parrot_id) {
          submitData.female_parrot_id = this.data.formData.female_parrot_id
        }
        if (this.data.formData.mating_date) {
          submitData.mating_date = this.data.formData.mating_date
        }
        if (this.data.formData.egg_laying_date) {
          submitData.egg_laying_date = this.data.formData.egg_laying_date
        }
        if (this.data.formData.egg_count) {
          submitData.egg_count = parseInt(this.data.formData.egg_count)
        }
        if (this.data.formData.hatching_date) {
          submitData.hatching_date = this.data.formData.hatching_date
        }
        if (this.data.formData.chick_count) {
          submitData.chick_count = parseInt(this.data.formData.chick_count)
        }
        if (this.data.formData.success_rate) {
          submitData.success_rate = parseFloat(this.data.formData.success_rate)
        }
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
        res = await app.request({
          url: `/api/records/${this.data.recordId}`,
          method: 'PUT',
          data: submitData
        })
      } else {
        // 添加模式
        res = await app.request({
          url: '/api/records',
          method: 'POST',
          data: submitData
        })
      }

      if (res.success) {
        app.showSuccess(this.data.recordId ? '编辑成功' : '添加成功')
        
        // 返回上一页并刷新
        setTimeout(() => {
          wx.navigateBack({
            success: () => {
              // 通知上一页刷新数据
              setTimeout(() => {
                const pages = getCurrentPages()
                const prevPage = pages[pages.length - 1] // 修正索引，返回后当前页面就是上一页
                if (prevPage) {
                  if (prevPage.loadRecords) {
                    prevPage.loadRecords(true) // 传递refresh=true参数强制刷新
                  } else if (prevPage.loadOverview) {
                    prevPage.loadOverview()
                  } else if (prevPage.loadParrotDetail) {
                    prevPage.loadParrotDetail()
                  }
                }
              }, 100) // 添加小延迟确保页面已经完全返回
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

  // 显示饲料类型选择器
  showFeedTypePicker() {
    this.setData({
      showFeedTypeModal: true
    })
  },

  // 隐藏饲料类型选择器
  hideFeedTypePicker() {
    this.setData({
      showFeedTypeModal: false
    })
  },

  // 选择饲料类型
  selectFeedType(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      'formData.food_type': String(id),
      selectedFeedTypeName: name,
      showFeedTypeModal: false
    })
    this.validateForm()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 显示雄性鹦鹉选择器
  showMaleParrotPicker() {
    this.setData({
      showMaleParrotModal: true
    })
  },

  // 隐藏雄性鹦鹉选择器
  hideMaleParrotPicker() {
    this.setData({
      showMaleParrotModal: false
    })
  },

  // 选择雄性鹦鹉
  selectMaleParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      'formData.male_parrot_id': id,
      selectedMaleParrotName: name,
      showMaleParrotModal: false
    })
    this.validateForm()
  },

  // 显示雌性鹦鹉选择器
  showFemaleParrotPicker() {
    this.setData({
      showFemaleParrotModal: true
    })
  },

  // 隐藏雌性鹦鹉选择器
  hideFemaleParrotPicker() {
    this.setData({
      showFemaleParrotModal: false
    })
  },

  // 选择雌性鹦鹉
  selectFemaleParrot(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      'formData.female_parrot_id': id,
      selectedFemaleParrotName: name,
      showFemaleParrotModal: false
    })
    this.validateForm()
  },

  // 繁殖记录日期选择
  onBreedingDateChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
    this.validateForm()
  },

  // 显示清洁类型选择器
  showCleaningTypePicker() {
    this.setData({
      showCleaningTypeModal: true
    })
  },

  // 隐藏清洁类型选择器
  hideCleaningTypePicker() {
    this.setData({
      showCleaningTypeModal: false
    })
  },

  // 选择清洁类型
  selectCleaningType(e) {
    const type = e.currentTarget.dataset.type
    const cleaningTypeMap = {
      'cage': '笼子清洁',
      'toys': '玩具清洁',
      'perches': '栖木清洁',
      'food_water': '食物和水清洁'
    }
    
    this.setData({
      'formData.cleaning_type': type,
      cleaningTypeText: cleaningTypeMap[type],
      showCleaningTypeModal: false
    })
    
    this.validateForm()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})