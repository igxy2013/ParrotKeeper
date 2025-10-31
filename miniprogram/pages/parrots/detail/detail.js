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
    speciesList: [],
    // 与首页一致的 PNG 图标路径
    iconPaths: {
      actions: {
        quickFeeding: '/images/remix/ri-restaurant-fill-orange.png',
        quickHealth: '/images/remix/ri-heart-fill-purple.png',
        quickCleaning: '/images/remix/ri-calendar-fill-blue.png',
        quickBreeding: '/images/remix/ri-book-fill-green.png',
        // 抠图按钮图标（如缺失需用户下载）
        removeBg: '/images/remix/magic-line.png'
      }
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

  // 抠图前确认
  confirmRemoveBg() {
    if (!this.data.parrot || !this.data.parrot.photo_url) {
      app.showError('暂无可处理的照片')
      return
    }
    wx.showModal({
      title: 'AI一键抠图',
      content: '将使用AI对当前照片进行抠图，移除背景，并替换为新照片。是否继续？',
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
    let isLoading = false;
    try {
      app.showLoading('抠图处理中...');
      isLoading = true;
      const currentUrl = this.data.parrot.photo_url;
      console.log('发送抠图请求，图片路径:', currentUrl); // 添加日志以便调试
      
      // 检查图片路径是否为空
      if (!currentUrl) {
        throw new Error('图片路径为空');
      }
      
      const res = await app.request({
        url: '/api/image/process-existing',
        method: 'POST',
        data: { image_path: currentUrl }
      });

      // 接口约定：成功时返回 processed_url
      const processedUrl = res && (res.processed_url || (res.data && res.data.processed_url));
      if (!processedUrl) {
        throw new Error(res && (res.error || res.message) || '抠图处理失败');
      }

      // 统一存储相对路径（与上传逻辑一致）：提取 /uploads/ 之后的部分
      let storagePath = processedUrl;
      const m = String(processedUrl).match(/\/uploads\/(.+)$/);
      if (m && m[1]) storagePath = m[1];

      // 更新后端鹦鹉照片URL
      const saveRes = await app.request({
        url: `/api/parrots/${this.data.parrotId}`,
        method: 'PUT',
        data: { photo_url: storagePath }
      });

      if (!saveRes || !saveRes.success) {
        throw new Error((saveRes && saveRes.message) || '保存照片失败');
      }

      // 刷新本地展示
      const resolved = app.resolveUploadUrl(storagePath);
      this.setData({ parrot: { ...this.data.parrot, photo_url: resolved } });
      app.showSuccess('抠图成功，已替换照片');
    } catch (e) {
      console.error('抠图失败:', e);
      wx.showModal({
        title: '温馨提示',
        content: '今日AI免费抠图名额已耗尽，请明天再来试试吧！',
        showCancel: false
      })
    } finally {
      if (isLoading) {
        app.hideLoading();
      }
    }
  },

  // 解析服务端时间字符串：优先按本地时间解析，避免无时区字符串被当作 UTC
  parseServerTime(value) {
    if (!value) return null
    try {
      if (value instanceof Date) return value
      if (typeof value === 'number') {
        const dNum = new Date(value)
        return isNaN(dNum.getTime()) ? null : dNum
      }
      if (typeof value === 'string') {
        const s = value.trim()
        // 仅日期：YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return new Date(`${s}T00:00:00`)
        }
        // 已包含 Z 或时区偏移，直接解析
        if (/[Zz]|[+\-]\d{2}:?\d{2}$/.test(s)) {
          const d = new Date(s)
          return isNaN(d.getTime()) ? null : d
        }

        // iOS 不支持 "YYYY-MM-DD HH:mm[:ss]" 的直接解析，先规范化
        const isDashSpace = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)
        if (isDashSpace) {
          // 优先转换为斜杠并补秒：YYYY/MM/DD HH:mm:ss
          let fixed = s.replace(/-/g, '/')
          if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(fixed)) {
            fixed = fixed + ':00'
          }
          const d1 = new Date(fixed)
          if (!isNaN(d1.getTime())) return d1
          // 兜底：转换为 ISO T 格式并补秒：YYYY-MM-DDTHH:mm:ss
          let iso = s.replace(' ', 'T')
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) {
            iso = iso + ':00'
          }
          const d2 = new Date(iso)
          if (!isNaN(d2.getTime())) return d2
        }

        // 无时区信息：按本地时间解析（iOS 兼容）
        if (s.includes('T')) {
          // iOS 需要补秒：YYYY-MM-DDTHH:mm:ss
          let iso = s
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) {
            iso = iso + ':00'
          }
          const d = new Date(iso)
          if (!isNaN(d.getTime())) return d
        } else {
          // 先尝试斜杠格式
          let local = s.replace(/-/g, '/')
          if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(local)) {
            local = local + ':00'
          }
          let d = new Date(local)
          if (!isNaN(d.getTime())) return d
          // 最后再尝试原始字符串（避免 iOS 警告命中率高的格式）
          d = new Date(s)
          if (!isNaN(d.getTime())) return d
        }
        return null
      }
      return null
    } catch (e) {
      return null
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
        const rawParrot = detailRes.data
        // 规范化图片URL，兼容后端返回相对路径
        const speciesName = rawParrot.species && rawParrot.species.name ? rawParrot.species.name : (rawParrot.species_name || '')
        const parrot = {
          ...rawParrot,
          photo_url: app.resolveUploadUrl(rawParrot.photo_url),
          avatar_url: rawParrot.avatar_url ? app.resolveUploadUrl(rawParrot.avatar_url) : app.getDefaultAvatarForParrot({
            gender: rawParrot.gender,
            species_name: speciesName,
            name: rawParrot.name
          })
        }
        
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
        // 统一从真实字段提取时间，并生成展示文本
        const recentRecords = recordsRaw.map(r => {
          // 根据记录类型选择真实时间字段
          let rawTime = ''
          if (r.type === 'feeding') {
            rawTime = (r.data && r.data.feeding_time) || ''
          } else if (r.type === 'health') {
            rawTime = (r.data && r.data.record_date) || ''
          } else if (r.type === 'cleaning') {
            rawTime = (r.data && r.data.cleaning_time) || ''
          } else if (r.type === 'breeding') {
            rawTime = r.mating_date || r.created_at || ''
          } else {
            rawTime = r.created_at || r.time || ''
          }

          // 统一解析为 Date，避免跨平台解析偏差
          const dt = this.parseServerTime(rawTime)
          // 展示用：仅在解析成功时使用相对时间，避免 iOS 对字符串解析警告
          const displayText = dt ? getApp().formatRelativeTime(dt) : ''

          return {
            ...r,
            time: rawTime,
            // 仍沿用 created_at 字段在 WXML 中显示：解析成功则格式化，否则直接使用原始字符串
            created_at: dt ? getApp().formatDateTime(dt, 'YYYY-MM-DD HH:mm') : (rawTime ? rawTime : ''),
            display_time_text: displayText
          }
        })

        // 是否存在喂食记录
        const hasFeedingRecords = recentRecords.some(r => r.type === 'feeding')

        // 按类型分类记录
        const feedingRecords = recentRecords.filter(r => r.type === 'feeding')
        const healthRecords = recentRecords.filter(r => r.type === 'health')
        const breedingRecords = recentRecords.filter(r => r.type === 'breeding')

        // 计算最后喂食时间信息（基于真实时间字段，按本地时间解析）
        let lastFeedingInfo = '暂无喂食记录'
        if (feedingRecords.length > 0) {
          // 按时间倒序取最近的一条（统一解析后比较）
          const sortedFeeding = feedingRecords.slice().sort((a, b) => {
            const ta = a.time ? (this.parseServerTime(a.time)?.getTime() || 0) : 0
            const tb = b.time ? (this.parseServerTime(b.time)?.getTime() || 0) : 0
            return tb - ta
          })
          const lastFeeding = sortedFeeding[0]
          if (lastFeeding && lastFeeding.time) {
            const lastTime = this.parseServerTime(lastFeeding.time) || this.parseServerTime(lastFeeding.created_at) || new Date(lastFeeding.time)
            const now = new Date()
            const diffMs = now - lastTime
            const diffHours = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60))
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
          const last = this.parseServerTime(lastFeeding.time) || new Date(lastFeeding.time)
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
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=feeding${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  // 快速健康检查
  quickHealthCheck() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=health${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
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
        // 上传到通用接口并分类到 parrots
        wx.uploadFile({
          url: app.globalData.baseUrl + '/api/upload/image',
          filePath: tempFilePath,
          name: 'file',
          formData: { category: 'parrots' },
          header: { 'X-OpenID': app.globalData.openid },
          success: (uploadRes) => {
            try {
              const data = JSON.parse(uploadRes.data)
              if (data && data.success && data.data && data.data.url) {
                const fullUrl = app.globalData.baseUrl + '/uploads/' + data.data.url
                wx.previewImage({ urls: [fullUrl] })
                wx.showToast({ title: '上传成功', icon: 'success' })
              } else {
                wx.showToast({ title: data.message || '上传失败', icon: 'none' })
              }
            } catch (_) {
              wx.showToast({ title: '上传失败', icon: 'none' })
            }
          },
          fail: () => wx.showToast({ title: '上传失败', icon: 'none' })
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
    const url = `/pages/records/add-record/add-record?type=cleaning${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  // 快速繁殖记录
  quickBreeding() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    // 跳转到繁殖记录新页面
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=breeding${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
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
  ,

  // 图标加载失败时回退为 SVG
  onDetailIconError(e) {
    try {
      const keyPath = e.currentTarget.dataset.key
      const current = this.data.iconPaths || {}
      const next = JSON.parse(JSON.stringify(current))
      const setByPath = (obj, path, value) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i]
          if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
          cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
      }
      const getByPath = (obj, path) => {
        const parts = String(path).split('.')
        let cur = obj
        for (let i = 0; i < parts.length; i++) {
          cur = cur[parts[i]]
          if (cur === undefined || cur === null) return null
        }
        return cur
      }
      const replaceExt = (p, toExt) => {
        if (!p || typeof p !== 'string') return p
        return p.replace(/\.(png|svg)$/i, `.${toExt}`)
      }
      const curVal = getByPath(next, keyPath)
      if (typeof curVal === 'string') {
        setByPath(next, keyPath, replaceExt(curVal, 'svg'))
        this.setData({ iconPaths: next })
      }
    } catch (_) {}
  }
})
