// pages/parrots/detail/detail.js
const app = getApp()

Page({
  data: {
    parrotId: null,
    parrot: {},
    statistics: null,
    recentRecords: [],
    hasFeedingRecords: false,
    loading: true,
    hasOperationPermission: false,
    // 菜单状态
    showMenu: false,
    // 选项卡
    activeTab: '基本信息',
    tabs: ['基本信息', '喂食记录', '健康档案', '繁殖记录'],
    
    // 健康状态映射
    healthStatusText: '',
    
    // 年龄和天数
    age: '',
    daysWithUs: 0,
    
    // 记录类型映射
    typeNames: {
      'feeding': '喂食记录',
      'cleaning': '清洁记录',
      'health_check': '健康检查',
      'training': '训练记录',
      'breeding': '繁殖记录'
    },
    
    typeIcons: {
      'feeding': '🍽️',
      'cleaning': '🧹',
      'health_check': '🏥',
      'training': '🎯',
      'breeding': '🐣'
    },

    // 喂食记录数据
    feedingRecords: [],
    // 健康档案数据
    healthRecords: [],
    // 繁殖记录数据
    breedingRecords: [],
    
    // 最后喂食时间信息
    lastFeedingInfo: '',

    // 复用弹窗组件（编辑）
    showParrotModal: false,
    parrotFormMode: 'edit',
    parrotFormTitle: '编辑鹦鹉',
    currentParrotForm: null,
    parrotTypes: [],
    speciesList: []
  },

  onLoad(options) {
    // 检查操作权限
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ hasOperationPermission })
    
    if (options.id) {
      this.setData({
        parrotId: options.id
      })
      this.loadParrotDetail()
    } else {
      app.showError('参数错误')
      wx.navigateBack()
    }
  },

  onShow() {
    // 检查操作权限
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ hasOperationPermission })
    
    // 从其他页面返回时刷新数据
    if (this.data.parrotId) {
      this.loadParrotDetail()
    }
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      // 无历史栈时返回到鹦鹉列表
      wx.switchTab({ url: '/pages/parrots/parrots' })
    }
  },

  // 切换选项卡
  setActiveTab(e) {
    const tab = e.currentTarget.dataset.tab || e.detail || '基本信息'
    this.setData({ activeTab: tab })
  },

  // 加载鹦鹉详情
  async loadParrotDetail() {
    try {
      this.setData({ loading: true })
      
      // 并行加载数据
      const [detailRes, statsRes, recordsRes] = await Promise.all([
        app.request({ url: `/api/parrots/${this.data.parrotId}`, method: 'GET' }),
        app.request({ url: `/api/parrots/${this.data.parrotId}/statistics`, method: 'GET' }),
        app.request({ url: `/api/parrots/${this.data.parrotId}/records`, method: 'GET', data: { limit: 5 } })
      ])
      
      if (detailRes.success) {
        const parrot = detailRes.data
        
        // 计算年龄和入住天数
        const age = this.calculateAge(parrot.birth_date)
        const daysWithUs = this.calculateDaysWithUs(parrot.acquisition_date)
        
        // 获取健康状态文本
        const healthStatusMap = {
          'healthy': '健康',
          'sick': '生病',
          'recovering': '康复中',
          'observation': '观察中'
        }
        
        // 获取饲养难度文本
        const careLevelMap = {
          'easy': '容易',
          'medium': '中等',
          'hard': '困难'
        }
        
        this.setData({
          parrot,
          age,
          daysWithUs,
          healthStatusText: healthStatusMap[parrot.health_status] || '健康',
          careLevelText: parrot.species ? careLevelMap[parrot.species.care_level] || '未知' : '未知'
        })
        
        wx.setNavigationBarTitle({ title: parrot.name })
      }
      
      // 先处理最近记录，便于计算"距上次喂食"
      if (recordsRes.success) {
        const recordsRaw = recordsRes.data.records || []
        const recentRecords = recordsRaw.map(r => ({
          ...r,
          created_at: r.time ? new Date(r.time).toLocaleString() : ''
        }))
        const hasFeedingRecords = recentRecords.some(r => r.type === 'feeding')
        
        // 按类型分类记录
        const feedingRecords = recentRecords.filter(r => r.type === 'feeding')
        const healthRecords = recentRecords.filter(r => r.type === 'health')
        const breedingRecords = recentRecords.filter(r => r.type === 'breeding')
        
        // 计算最后喂食时间信息
        let lastFeedingInfo = '暂无喂食记录'
        if (feedingRecords.length > 0) {
          const lastFeeding = feedingRecords[0] // 假设记录已按时间排序
          if (lastFeeding.time) {
            const lastTime = new Date(lastFeeding.time)
            const now = new Date()
            const diffHours = Math.floor((now - lastTime) / (1000 * 60 * 60))
            if (diffHours < 1) {
              lastFeedingInfo = '刚刚喂食'
            } else if (diffHours < 24) {
              lastFeedingInfo = `${diffHours}小时前`
            } else {
              const diffDays = Math.floor(diffHours / 24)
              lastFeedingInfo = `${diffDays}天前`
            }
          }
        }
        
        this.setData({ 
          recentRecords, 
          hasFeedingRecords,
          feedingRecords,
          healthRecords,
          breedingRecords,
          lastFeedingInfo
        })
      }
      
      // 将后端统计数据映射到前端所需字段
      if (statsRes.success) {
        const monthStats = (statsRes.data && statsRes.data.month) ? statsRes.data.month : {}
        let daysSinceLastFeeding = 0
        const recent = this.data.recentRecords || []
        const lastFeeding = recent.find(r => r.type === 'feeding' && r.time)
        if (lastFeeding && lastFeeding.time) {
          const last = new Date(lastFeeding.time)
          const now = new Date()
          daysSinceLastFeeding = Math.max(0, Math.floor((now - last) / (1000 * 60 * 60 * 24)))
        }
        const mappedStatistics = {
          total_feeding: monthStats.feeding || 0,
          total_cleaning: monthStats.cleaning || 0,
          total_health_check: monthStats.health || 0,
          days_since_last_feeding: daysSinceLastFeeding
        }
        this.setData({ statistics: mappedStatistics })
      }
      
    } catch (error) {
      console.error('加载鹦鹉详情失败:', error)
      app.showError('加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算年龄
  calculateAge(birthDate) {
    if (!birthDate) return ''
    
    const birth = new Date(birthDate)
    const now = new Date()
    const diffTime = now - birth
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays}天`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months}个月`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`
    }
  },

  // 计算入住天数
  calculateDaysWithUs(acquisitionDate) {
    if (!acquisitionDate) return 0
    
    const acquisition = new Date(acquisitionDate)
    const now = new Date()
    const diffTime = now - acquisition
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  },

  // 预览照片
  previewPhoto() {
    if (this.data.parrot.photo_url) {
      wx.previewImage({
        urls: [this.data.parrot.photo_url]
      })
    }
  },

  // 快速喂食
  quickFeeding() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    wx.navigateTo({
      url: `/pages/records/feeding/feeding${this.data.parrotId ? `?parrot_id=${this.data.parrotId}` : ''}`
    })
  },

  // 快速健康检查
  quickHealthCheck() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    wx.navigateTo({
      url: `/pages/records/health/health${this.data.parrotId ? `?parrot_id=${this.data.parrotId}` : ''}`
    })
  },

  // 快速训练记录
  quickTraining() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    wx.navigateTo({
      url: `/pages/records/add-record/add-record?type=training&parrotId=${this.data.parrotId}&parrotName=${this.data.parrot.name}`
    })
  },

  // 快速拍照
  quickPhoto() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        // 这里可以添加上传照片的逻辑
        wx.showToast({
          title: '照片功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // 快速清洁（保留原有功能）
  quickCleaning() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    wx.navigateTo({
      url: `/pages/records/cleaning/cleaning${pid ? `?parrot_id=${pid}` : ''}`
    })
  },

  // 快速繁殖记录
  quickBreeding() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    // 跳转到繁殖记录新页面
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    wx.navigateTo({
      url: `/pages/breeding/breeding${pid ? `?parrot_id=${pid}` : ''}`
    })
  },

  // 切换菜单显示状态
  toggleMenu() {
    this.setData({
      showMenu: !this.data.showMenu
    })
  },

  // 关闭菜单
  closeMenu() {
    this.setData({
      showMenu: false
    })
  },

  // 编辑鹦鹉（打开弹窗）
  editParrot() {
    this.setData({ showMenu: false })
    const p = this.data.parrot || {}
    const form = {
      id: p.id,
      name: p.name || '',
      type: p.species_name || '',
      weight: p.weight || '',
      gender: p.gender || '',
      gender_display: p.gender === 'male' ? '雄性' : (p.gender === 'female' ? '雌性' : ''),
      color: p.color || '',
      birth_date: p.birth_date || '',
      notes: p.notes || '',
      parrot_number: p.parrot_number || '',
      ring_number: p.ring_number || '',
      acquisition_date: p.acquisition_date || '',
      photo_url: p.photo_url || p.avatar_url || ''
    }
    this.setData({ 
      currentParrotForm: form, 
      showParrotModal: true,
      parrotFormMode: 'edit',
      parrotFormTitle: '编辑鹦鹉'
    })
    this.loadSpeciesListForModal()
  },

  // 查看记录
  viewRecords() {
    wx.navigateTo({
      url: `/pages/records/records?parrotId=${this.data.parrotId}`
    })
  },

  // 查看所有记录
  viewAllRecords() {
    this.viewRecords()
  },

  // 加载品种列表供弹窗组件使用
  async loadSpeciesListForModal() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res.success) {
        const species = res.data || []
        const names = species.map(s => s.name)
        this.setData({ speciesList: species, parrotTypes: names })
      }
    } catch (e) {
      // 静默失败
    }
  },

  // 组件事件：取消
  onParrotModalCancel() {
    this.setData({ showParrotModal: false, currentParrotForm: null })
  },

  // 组件事件：提交编辑
  async onParrotModalSubmit(e) {
    const { id, data } = e.detail || {}
    if (!id) {
      app.showError('缺少鹦鹉ID，无法提交')
      return
    }
    try {
      app.showLoading('保存中...')
      const res = await app.request({ url: `/api/parrots/${id}`, method: 'PUT', data })
      if (res.success) {
        app.showSuccess('编辑成功')
        this.setData({ showParrotModal: false, currentParrotForm: null })
        // 刷新详情
        this.loadParrotDetail()
      } else {
        app.showError(res.message || '编辑失败')
      }
    } catch (error) {
      app.showError('网络错误，请稍后重试')
    } finally {
      app.hideLoading()
    }
  },

  // 删除鹦鹉
  deleteParrot() {
    this.setData({ showMenu: false }) // 关闭菜单
    
    // 检查parrotId是否存在
    if (!this.data.parrotId) {
      app.showError('鹦鹉ID不存在，无法删除')
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除鹦鹉"${this.data.parrot.name}"吗？删除后将无法恢复，相关的所有记录也会被删除。`,
      confirmText: '删除',
      confirmColor: '#f44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            app.showLoading('删除中...')
            
            const result = await app.request({
              url: `/api/parrots/${this.data.parrotId}`,
              method: 'DELETE'
            })
            
            if (result.success) {
              app.showSuccess('删除成功')
              
              // 返回上一页并刷新
              setTimeout(() => {
                wx.navigateBack({
                  success: () => {
                    // 通知上一页刷新数据
                    const pages = getCurrentPages()
                    const prevPage = pages[pages.length - 2]
                    console.log('删除成功，尝试刷新上一页数据', prevPage)
                    if (prevPage) {
                      console.log('上一页路由:', prevPage.route)
                      // 检查是否是鹦鹉档案页面
                      if (prevPage.route === 'pages/parrots/parrots' && prevPage.refreshData) {
                        console.log('调用鹦鹉档案页面的refreshData方法')
                        // 延迟刷新，确保页面完全返回
                        setTimeout(() => {
                          prevPage.refreshData() // 使用refreshData确保完全刷新
                        }, 100)
                      }
                      // 检查是否是首页
                      else if (prevPage.route === 'pages/index/index' && prevPage.onShow) {
                        console.log('调用首页的onShow方法')
                        setTimeout(() => {
                          prevPage.onShow()
                        }, 100)
                      }
                    }
                  }
                })
              }, 1500)
            } else {
              throw new Error(result.message)
            }
          } catch (error) {
            console.error('删除失败:', error)
            app.showError(error.message || '删除失败')
          } finally {
            app.hideLoading()
          }
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadParrotDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})
