// pages/parrots/detail/detail.js
const app = getApp()

Page({
  data: {
    parrotId: null,
    parrot: {},
    statistics: null,
    recentRecords: [],
    loading: true,
    hasOperationPermission: false,
    
    // 健康状态映射
    healthStatusText: '',
    
    // 年龄和天数
    age: '',
    daysWithUs: 0,
    
    // 记录类型映射
    typeNames: {
      'feeding': '喂食记录',
      'cleaning': '清洁记录',
      'health_check': '健康检查'
    },
    
    typeIcons: {
      'feeding': '🍽️',
      'cleaning': '🧹',
      'health_check': '🏥'
    }
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
      
      // 先处理最近记录，便于计算“距上次喂食”
      if (recordsRes.success) {
        const recordsRaw = recordsRes.data.records || []
        const recentRecords = recordsRaw.map(r => ({
          ...r,
          created_at: r.time ? new Date(r.time).toLocaleString() : ''
        }))
        this.setData({ recentRecords })
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
    wx.navigateTo({
      url: `/pages/records/add-record/add-record?type=feeding&parrotId=${this.data.parrotId}&parrotName=${this.data.parrot.name}`
    })
  },

  // 快速清洁
  quickCleaning() {
    wx.navigateTo({
      url: `/pages/records/add-record/add-record?type=cleaning&parrotId=${this.data.parrotId}&parrotName=${this.data.parrot.name}`
    })
  },

  // 快速健康检查
  quickHealthCheck() {
    wx.navigateTo({
      url: `/pages/records/add-record/add-record?type=health_check&parrotId=${this.data.parrotId}&parrotName=${this.data.parrot.name}`
    })
  },

  // 编辑鹦鹉
  editParrot() {
    wx.navigateTo({
      url: `/pages/parrots/add-parrot/add-parrot?id=${this.data.parrotId}`
    })
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

  // 删除鹦鹉
  deleteParrot() {
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