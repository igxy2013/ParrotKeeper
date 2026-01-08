// pages/parrots/detail/detail.js
const app = getApp()
const cache = require('../../../utils/cache')

Page({
  data: {
    parrotId: null,
    parrot: {},
    statistics: null,
    recentRecords: [],
    hasFeedingRecords: false,
    loading: true,
    hasOperationPermission: false,
    isPro: false,
    // 菜单状态
    showMenu: false,
    // 选项卡
    activeTab: '基本信息',
    tabs: ['基本信息', '体重趋势', '喂食记录', '健康档案', '繁殖记录'],
    
    // 体重趋势数据
    weightSeries: [],
    weightDays: 30,
    weightRangeDates: [],
    weightStartIndex: 0,
    weightEndIndex: 0,
    weightStartDate: '',
    weightEndDate: '',
    weightLeft: 0,
    weightRight: 100,
    weightWidth: 100,
    weightAvgChart: '',
    weightRefChart: '',
    weightRefValue: null,
    activeWeightPoint: null,
    weightColors: ['#10b981'],
    
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
        removeBg: '/images/remix/magic-line-white.png'
      }
    },
    // 过户弹窗与输入
    showTransferModal: false,
    transferTargetId: '',
    transferTargetOpenid: '',
    transferTargetUsername: '',
    transferTargetPhone: '',
    transferSubmitting: false,
    // 过户码弹窗
    showTransferCodeModal: false,
    transferCode: '',
    transferCodeGenerating: false
    ,
    suppressPullDownUntil: 0,
    showPermissionModal: false,
    permissionMessage: ''
  },

  formatBirthPlaceDisplay(p) {
    const clean = (v) => {
      const s = String(v || '').trim()
      if (!s) return ''
      if (s === '未选择' || s === '请选择') return ''
      if (s.includes('未选择') || s.includes('请选择')) return ''
      if (s === 'null' || s === 'undefined') return ''
      return s
    }
    const province = clean(p && p.birth_place_province)
    const city = clean(p && p.birth_place_city)
    const county = clean(p && p.birth_place_county)
    const parts = [province, city, county].filter(Boolean)
    if (parts.length) return parts.join('')
    const bp = clean(p && p.birth_place)
    if (!bp) return ''
    return String(bp).replace(/未选择|请选择/g, '').replace(/\s+/g, ' ').trim()
  },

  onLoad(options) {
    // 检查操作权限
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ hasOperationPermission })
    try {
      const userInfo = app.globalData.userInfo || {}
      const tier = String(userInfo.subscription_tier || '').toLowerCase()
      const isPro = tier === 'pro' || tier === 'team'
      this.setData({ isPro })
    } catch(_) {}
    
    if (options.id) {
      this.setData({
        parrotId: options.id
      })
      try {
        const cached = cache.get(`parrot_detail_${options.id}`)
        if (cached && cached.rawParrot) {
          const parrot = this.normalizeParrot(cached.rawParrot)
          const ageShort = this.calculateAgeShort(parrot.birth_date)
          const agePrecise = this.calculateAgePrecise(parrot.birth_date)
          const daysWithUs = this.calculateDaysWithUs(parrot.acquisition_date)
          const healthStatusMap = {
            'healthy': '健康',
            'sick': '生病',
            'recovering': '康复中',
            'observation': '观察中'
          }
          const careLevelMap = {
            'easy': '容易',
            'medium': '中等',
            'hard': '困难'
          }
          this.setData({
            parrot,
            age: ageShort,
            agePrecise,
            daysWithUs,
            healthStatusText: healthStatusMap[parrot.health_status] || '健康',
            careLevelText: parrot.species ? careLevelMap[parrot.species.care_level] || '未知' : '未知'
          })
          wx.setNavigationBarTitle({ title: parrot.name || '鹦鹉详情' })
          this.setData({ loading: false })
          setTimeout(() => this.loadParrotDetail(), 0)
        } else {
          this.loadParrotDetail()
        }
      } catch (_) {
        this.loadParrotDetail()
      }
    } else {
      app.showError('参数错误')
      wx.navigateBack()
    }
  },

  normalizeParrot(rawParrot) {
    const speciesName = rawParrot.species && rawParrot.species.name ? rawParrot.species.name : (rawParrot.species_name || '')
    const parrot = {
      ...rawParrot,
      photo_url_raw: rawParrot.photo_url,
      photo_url: app.resolveUploadUrl(rawParrot.photo_url),
      avatar_url: rawParrot.avatar_url ? app.resolveUploadUrl(rawParrot.avatar_url) : app.getDefaultAvatarForParrot({
        gender: rawParrot.gender,
        species_name: speciesName,
        name: rawParrot.name
      })
    }
    try {
      let keeperName = ''
      if (rawParrot && rawParrot.owner_name) {
        keeperName = rawParrot.owner_name || ''
      }
      if (!keeperName) {
        const ownerObj = rawParrot && rawParrot.owner
        if (ownerObj) {
          keeperName = ownerObj.nickname || ownerObj.account_username || ownerObj.username || ''
        }
      }
      parrot.keeper_name = keeperName
    } catch(_) {}
    try {
      const photoThumb = parrot.photo_url ? app.getThumbnailUrl(parrot.photo_url, 160) : ''
      const avatarThumb = parrot.avatar_url ? app.getThumbnailUrl(parrot.avatar_url, 128) : ''
      parrot.photo_thumb = photoThumb
      parrot.avatar_thumb = avatarThumb
    } catch (_) {}
    try {
      const w = parrot.weight
      let weightDisplay = ''
      if (w !== null && w !== undefined && w !== '') {
        const num = typeof w === 'number' ? w : parseFloat(String(w))
        if (!isNaN(num) && isFinite(num)) {
          const rounded = Math.round(num * 10) / 10
          weightDisplay = `${rounded}g`
        }
      }
      parrot.weight_display = weightDisplay
    } catch (e) {
      parrot.weight_display = ''
    }
    parrot.birth_place_display = this.formatBirthPlaceDisplay(parrot)
    parrot.plumageSplitsText = this.computePlumageSplitsText(parrot)
    return parrot
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

  scheduleSilentRefresh(delayMs = 0) {
    const ms = typeof delayMs === 'number' ? delayMs : 0
    const until = Date.now() + ms
    this.setData({ suppressPullDownUntil: until })
    setTimeout(() => { this.loadParrotDetail() }, ms)
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
    if (tab === '体重趋势') {
      this._loadParrotRefWeight && this._loadParrotRefWeight(this.data.parrotId)
      // 如果尚未加载数据或需要刷新，则加载
      if (!this.data.weightSeries || this.data.weightSeries.length === 0) {
        this.loadWeightTrends()
      } else {
        // 切换回来时可能需要重绘 Canvas
        setTimeout(() => {
          this.drawWeightChart()
        }, 200)
      }
    }
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
      const rawUrl = this.data.parrot.photo_url_raw || '';
      console.log('发送抠图请求，图片路径:', currentUrl); // 添加日志以便调试
      
      // 检查图片路径是否为空
      if (!currentUrl && !rawUrl) {
        throw new Error('图片路径为空');
      }
      
      let raw = String(rawUrl || currentUrl).trim()
      let imagePath = raw
      if (/^https?:\/\//.test(raw)) {
        const m = raw.match(/\/uploads\/(.+)$/)
        if (m && m[1]) imagePath = m[1]
        else throw new Error('图片URL不合法')
      } else {
        imagePath = raw.replace(/^\/?uploads\/?/, '').replace(/^\/?images\/?/, '')
      }
      const res = await app.request({
        url: '/api/image/process-existing',
        method: 'POST',
        data: { image_path: imagePath }
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

      const appendV = (u) => {
        if (!u) return ''
        const s = String(u)
        if (/^(wxfile|ttfile|file):\/\//.test(s)) return s
        if (/^\/?images\//.test(s)) return s
        const v = Date.now()
        return s.includes('?') ? `${s}&v=${v}` : `${s}?v=${v}`
      }
      const resolvedBase = app.resolveUploadUrl(storagePath)
      const resolved = appendV(resolvedBase)
      const thumb = resolved ? app.getThumbnailUrl(resolved, 160) : ''
      this.setData({ parrot: { ...this.data.parrot, photo_url_raw: storagePath, photo_url: resolved, photo_thumb: thumb } })
      app.showSuccess('抠图成功，已替换照片');
    } catch (e) {
      console.error('抠图失败:', e);
      wx.showModal({
        title: '温馨提示',
        content: '本月AI免费抠图名额已耗尽，请下个月再来试试吧！',
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
        const parrot = this.normalizeParrot(rawParrot)
        const ageShort = this.calculateAgeShort(parrot.birth_date)
        const agePrecise = this.calculateAgePrecise(parrot.birth_date)
        const daysWithUs = this.calculateDaysWithUs(parrot.acquisition_date)
        const healthStatusMap = {
          'healthy': '健康',
          'sick': '生病',
          'recovering': '康复中',
          'observation': '观察中'
        }
        const careLevelMap = {
          'easy': '容易',
          'medium': '中等',
          'hard': '困难'
        }
        this.setData({
          parrot,
          age: ageShort,
          agePrecise,
          daysWithUs,
          healthStatusText: healthStatusMap[parrot.health_status] || '健康',
          careLevelText: parrot.species ? careLevelMap[parrot.species.care_level] || '未知' : '未知',
          plumageSplitsText: this.computePlumageSplitsText(parrot)
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
      
      const healthReq = app.request({
        url: '/api/records/health',
        method: 'GET',
        data: { parrot_id: this.data.parrotId, page: 1, per_page: 50 }
      })
      const breedingMaleReq = app.request({
        url: '/api/records/breeding',
        method: 'GET',
        data: { male_parrot_id: this.data.parrotId, per_page: 50 }
      })
      const breedingFemaleReq = app.request({
        url: '/api/records/breeding',
        method: 'GET',
        data: { female_parrot_id: this.data.parrotId, per_page: 50 }
      })
      const [healthRes, breedingMaleRes, breedingFemaleRes] = await Promise.all([healthReq, breedingMaleReq, breedingFemaleReq])
      if (healthRes && healthRes.success) {
        const items = Array.isArray(healthRes.data?.items) ? healthRes.data.items : (Array.isArray(healthRes.data) ? healthRes.data : [])
        const mapped = items.map(r => {
          let merged = ''
          const rd = (r.record_date || '').trim()
          const rt0 = (r.record_time || '').trim()
          if (rd || rt0) {
            if (rd && rt0) {
              let rt = rt0
              if (rt.length === 5) rt = `${rt}:00`
              if (rt.length > 8) rt = rt.substring(0, 8)
              merged = `${rd}T${rt}`
            } else {
              const s = rd || rt0
              merged = s.includes(' ') ? s.replace(' ', 'T') : s
            }
          }
          const dt = this.parseServerTime(merged) || this.parseServerTime(r.record_time || '') || this.parseServerTime(r.created_at || '')
          const ts = dt ? dt.getTime() : 0
          return {
            id: r.id,
            type: 'health',
            created_at: dt ? getApp().formatDateTime(dt, 'YYYY-MM-DD HH:mm') : (r.record_date || ''),
            ts,
            data: {
              health_status_text: r.health_status_text || r.health_status,
              health_status: r.health_status,
              weight: r.weight,
              notes: r.notes
            }
          }
        }).sort((a, b) => (b.ts - a.ts))
        this.setData({ healthRecords: mapped })
      }
      const feedingRes = await app.request({
        url: '/api/records/feeding',
        method: 'GET',
        data: { parrot_id: this.data.parrotId, page: 1, per_page: 100 }
      })
      if (feedingRes && feedingRes.success) {
        const items = Array.isArray(feedingRes.data?.items) ? feedingRes.data.items : (Array.isArray(feedingRes.data) ? feedingRes.data : [])
        const normalized = (items || []).map(rec => {
          const ft = []
          if (rec.feed_type) {
            const name = rec.feed_type.name || rec.feed_type_name || '食物'
            const type = rec.feed_type.type
            const unit = (String(name).indexOf('坚果') !== -1) ? 'g' : ((type === 'milk_powder' || type === 'supplement') ? 'ml' : 'g')
            ft.push({ id: rec.feed_type.id, name, amount: rec.amount, unit, type })
          } else if (rec.feed_type_name) {
            ft.push({ id: rec.feed_type_id, name: rec.feed_type_name, amount: rec.amount, unit: 'g' })
          }
          const feeding_time = rec.feeding_time || rec.record_time || rec.time || ''
          return { ...rec, feeding_time, food_types: ft }
        })
        const groups = {}
        normalized.forEach(r => {
          const timeStr = r.feeding_time || ''
          const notesStr = r.notes || ''
          const amt = r.amount
          const amtStr = typeof amt === 'number' ? String(amt) : (amt ? String(amt) : '')
          const key = `${timeStr}|${amtStr}|${notesStr}`
          if (!groups[key]) {
            groups[key] = {
              key,
              feeding_time: timeStr,
              notes: notesStr,
              record_ids: [],
              food_types_map: {}
            }
          }
          const g = groups[key]
          if (r.id && !g.record_ids.includes(r.id)) g.record_ids.push(r.id)
          if (Array.isArray(r.food_types)) {
            r.food_types.forEach(ft => {
              const id = ft.id || r.feed_type_id
              const name = ft.name || r.feed_type_name || '食物'
              const amount = typeof ft.amount === 'number' ? ft.amount : parseFloat(ft.amount || 0)
              const sname = String(name)
              const isNut = sname.indexOf('坚果') !== -1
              const byType = (ft.type === 'milk_powder' || ft.type === 'supplement')
              const byName = (sname.indexOf('奶粉') !== -1 || sname.indexOf('保健品') !== -1 || sname.indexOf('幼鸟奶粉') !== -1)
              const unit = ft.unit || (!isNut && (byType || byName) ? 'ml' : 'g')
              const kid = id || name
              if (!g.food_types_map[kid]) {
                g.food_types_map[kid] = { id, name, amount: amount || 0, unit }
              }
            })
          } else {
            const kid = r.feed_type_id || 'none'
            const name = r.feed_type_name || '总用量'
            const amount = typeof r.amount === 'number' ? r.amount : parseFloat(r.amount || 0)
            if (!g.food_types_map[kid]) {
              g.food_types_map[kid] = { id: r.feed_type_id, name, amount: amount || 0, unit: 'g' }
            }
          }
        })
        const aggregated = Object.values(groups)
        aggregated.sort((a, b) => {
          const ta = this.parseServerTime(a.feeding_time)?.getTime() || 0
          const tb = this.parseServerTime(b.feeding_time)?.getTime() || 0
          return tb - ta
        })
        const feedingMapped = aggregated.map(g => {
          const dt = this.parseServerTime(g.feeding_time || '')
          const list = Object.values(g.food_types_map)
          return {
            id: (g.record_ids && g.record_ids.length ? g.record_ids[0] : g.key),
            created_at: dt ? getApp().formatDateTime(dt, 'YYYY-MM-DD HH:mm') : (g.feeding_time || ''),
            data: {
              food_types: list.map(x => ({
                id: x.id,
                name: x.name,
                amount: Number((parseFloat(x.amount) || 0).toFixed(1)),
                unit: x.unit
              })),
              notes: g.notes || ''
            }
          }
        })
        this.setData({ hasFeedingRecords: feedingMapped.length > 0, feedingRecords: feedingMapped })
      }
      const maleItems = (breedingMaleRes && breedingMaleRes.success && Array.isArray(breedingMaleRes.data?.items)) ? breedingMaleRes.data.items : []
      const femaleItems = (breedingFemaleRes && breedingFemaleRes.success && Array.isArray(breedingFemaleRes.data?.items)) ? breedingFemaleRes.data.items : []
      const mergedMap = new Map()
      maleItems.concat(femaleItems).forEach(r => { if (r && r.id != null) mergedMap.set(r.id, r) })
      const merged = Array.from(mergedMap.values())
      merged.sort((a, b) => {
        const ta = this.parseServerTime(a.record_time || a.created_at || '')?.getTime() || 0
        const tb = this.parseServerTime(b.record_time || b.created_at || '')?.getTime() || 0
        return tb - ta
      })
      const breedingMapped = merged.map(r => {
        const dt = this.parseServerTime(r.record_time || r.created_at || '')
        return {
          id: r.id,
          created_at: dt ? getApp().formatDateTime(dt, 'YYYY-MM-DD HH:mm') : (r.record_time || ''),
          male_parrot_name: r.male_parrot_name || (r.male_parrot && r.male_parrot.name) || '',
          female_parrot_name: r.female_parrot_name || (r.female_parrot && r.female_parrot.name) || '',
          mating_date: r.mating_date || '',
          egg_laying_date: r.egg_laying_date || '',
          hatching_date: r.hatching_date || '',
          egg_count: r.egg_count,
          chick_count: r.chick_count,
          notes: r.notes || ''
        }
      })
      this.setData({ breedingRecords: breedingMapped })
      
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

  viewRecordDetail(e) {
    const ds = e.currentTarget.dataset || {}
    const type = ds.type || ''
    const id = ds.id || ''
    if (!type || !id) return
    wx.navigateTo({ url: `/pages/records/detail/detail?type=${type}&id=${id}` })
  },

  calculateAgeShort(birthDate) {
    if (!birthDate) return ''
    let birth = birthDate instanceof Date ? birthDate : new Date(birthDate)
    if (isNaN(birth.getTime())) {
      const s = String(birthDate)
      const d = new Date(s.replace(/-/g, '/').replace('T', ' '))
      if (isNaN(d.getTime())) return ''
      birth = d
    }
    const now = new Date()
    const birthMid = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate())
    const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = Math.floor((nowMid.getTime() - birthMid.getTime()) / 86400000)
    if (diffDays < 30) {
      return `${diffDays}天`
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months}个月`
    }
    const years = Math.floor(diffDays / 365)
    const remainingMonths = Math.floor((diffDays % 365) / 30)
    return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`
  },

  computePlumageSplitsText(parrot) {
    try {
      const ids = Array.isArray(parrot && parrot.plumage_split_ids) ? parrot.plumage_split_ids : []
      if (!ids.length) return ''
      let labels = []
      const jstr = parrot && parrot.species && parrot.species.plumage_json
      if (jstr) {
        try {
          const j = JSON.parse(jstr)
          const loci = j && j.loci ? j.loci : {}
          ids.forEach(id => {
            const g = loci && loci[id]
            if (g && g.label) labels.push(g.label)
          })
        } catch (_) {}
      }
      if (!labels.length) labels = ids.map(String)
      return labels.join('、')
    } catch (_) { return '' }
  },

  calculateAgePrecise(birthDate) {
    if (!birthDate) return ''
    const birth = new Date(birthDate)
    const now = new Date()
    const noonBirth = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate())
    const noonNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = Math.floor((noonNow - noonBirth) / 86400000)
    if (diffDays < 30) {
      return `${diffDays}天`
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      return days > 0 ? `${months}个月${days}天` : `${months}个月`
    }
    const years = Math.floor(diffDays / 365)
    const remainingDays = diffDays % 365
    const months = Math.floor(remainingDays / 30)
    const days = remainingDays % 30
    if (months > 0 && days > 0) return `${years}年${months}个月${days}天`
    if (months > 0) return `${years}年${months}个月`
    if (days > 0) return `${years}年${days}天`
    return `${years}年`
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
  async quickFeeding() {
    if (!this.data.parrotId) { app.showError('数据未加载，请稍后重试'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canCreate = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.create') : true
      if (!canCreate) { this.setData({ showPermissionModal: true, permissionMessage: '您没有新增记录的权限，请联系管理员分配权限' }); return }
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=feeding${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  // 快速健康检查
  async quickHealthCheck() {
    if (!this.data.parrotId) { app.showError('数据未加载，请稍后重试'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canCreate = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.create') : true
      if (!canCreate) { this.setData({ showPermissionModal: true, permissionMessage: '您没有新增记录的权限，请联系管理员分配权限' }); return }
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=health${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  

  // 快速清洁（保留原有功能）
  async quickCleaning() {
    if (!this.data.parrotId) { app.showError('数据未加载，请稍后重试'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canCreate = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.create') : true
      if (!canCreate) { this.setData({ showPermissionModal: true, permissionMessage: '您没有新增记录的权限，请联系管理员分配权限' }); return }
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=cleaning${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  // 快速繁殖记录
  async quickBreeding() {
    if (!this.data.parrotId) { app.showError('数据未加载，请稍后重试'); return }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
      try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){ }
      const canCreate = app && typeof app.hasPermission === 'function' ? app.hasPermission('record.create') : true
      if (!canCreate) { this.setData({ showPermissionModal: true, permissionMessage: '您没有新增记录的权限，请联系管理员分配权限' }); return }
    }
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    const url = `/pages/records/add-record/add-record?type=breeding${pid ? `&parrot_ids=${pid}` : ''}`
    wx.navigateTo({ url })
  },

  closePermissionModal() {
    this.setData({ showPermissionModal: false, permissionMessage: '' })
  },

  // 照片加载失败时回退为默认头像
  onPhotoError(e) {
    try {
      const p = this.data.parrot || {}
      const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
      const fallback = getApp().getDefaultAvatarForParrot({
        gender: p.gender,
        species_name: speciesName,
        name: p.name
      })
      const resolved = fallback ? getApp().resolveUploadUrl(fallback) : '/images/parrot-avatar-green.svg'
      this.setData({
        parrot: { ...p, photo_url: '', photo_thumb: '', avatar_url: resolved, avatar_thumb: '' }
      })
    } catch (_) {
      const p = this.data.parrot || {}
      this.setData({ parrot: { ...p, photo_url: '', photo_thumb: '', avatar_url: '/images/parrot-avatar-green.svg', avatar_thumb: '' } })
    }
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

  // 打开生成过户码弹窗
  openGenerateTransferCode() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    this.setData({
      showMenu: false,
      showTransferCodeModal: true,
      transferCode: '',
      transferCodeGenerating: false
    })
  },

  // 关闭过户码弹窗
  closeTransferCodeModal() {
    if (this.data.transferCodeGenerating) return
    this.setData({
      showTransferCodeModal: false,
      transferCode: ''
    })
  },

  // 生成过户码
  async generateTransferCode() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    if (this.data.transferCodeGenerating) return
    const parrotId = this.data.parrotId
    if (!parrotId) {
      app.showError('缺少鹦鹉ID')
      return
    }
    try {
      this.setData({ transferCodeGenerating: true })
      const res = await app.request({
        url: `/api/parrots/${parrotId}/transfer/code`,
        method: 'POST'
      })
      if (res && res.success && res.data && res.data.code) {
        this.setData({ transferCode: res.data.code })
        wx.showToast({ title: '生成成功', icon: 'success' })
      } else {
        app.showError(res && res.message ? res.message : '生成失败')
      }
    } catch (err) {
      app.showError('生成失败，请稍后重试')
    } finally {
      this.setData({ transferCodeGenerating: false })
    }
  },

  // 复制过户码到剪贴板
  copyTransferCode() {
    const code = this.data.transferCode
    if (!code) {
      app.showError('请先生成过户码')
      return
    }
    wx.setClipboardData({
      data: String(code),
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      },
      fail: () => {
        app.showError('复制失败，请重试')
      }
    })
  },

  // 打开过户弹窗
  openTransferModal() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    this.setData({
      showMenu: false,
      showTransferModal: true,
      transferTargetId: '',
      transferTargetOpenid: '',
      transferTargetUsername: '',
      transferTargetPhone: '',
      transferSubmitting: false
    })
  },

  // 关闭过户弹窗
  closeTransferModal() {
    if (this.data.transferSubmitting) return
    this.setData({
      showTransferModal: false,
      transferTargetId: '',
      transferTargetOpenid: '',
      transferTargetUsername: '',
      transferTargetPhone: ''
    })
  },

  // 输入事件
  onInputTransferId(e) {
    this.setData({ transferTargetId: e.detail.value })
  },
  onInputTransferOpenid(e) {
    this.setData({ transferTargetOpenid: e.detail.value })
  },
  onInputTransferUsername(e) {
    this.setData({ transferTargetUsername: e.detail.value })
  },
  onInputTransferPhone(e) {
    this.setData({ transferTargetPhone: e.detail.value })
  },

  // 提交过户
  async submitTransfer() {
    if (!this.data.hasOperationPermission) {
      app.showError('您没有操作权限')
      return
    }
    const { transferTargetId, transferTargetOpenid, transferTargetUsername, transferTargetPhone, parrotId } = this.data
    if (!transferTargetId && !transferTargetOpenid && !transferTargetUsername && !transferTargetPhone) {
      app.showError('请至少填写一个目标用户信息')
      return
    }
    try {
      this.setData({ transferSubmitting: true })
      app.showLoading('过户中...')
      const payload = {}
      if (transferTargetId) payload.new_owner_id = transferTargetId
      if (transferTargetOpenid) payload.new_owner_openid = transferTargetOpenid
      if (transferTargetUsername) payload.new_owner_username = transferTargetUsername
      if (transferTargetPhone) payload.new_owner_phone = transferTargetPhone

      const res = await app.request({
        url: `/api/parrots/${parrotId}/transfer`,
        method: 'POST',
        data: payload
      })
      if (res && res.success) {
        app.hideLoading()
        app.showSuccess('过户成功')
        this.setData({ showTransferModal: false })
        // 刷新详情
        await this.loadParrotDetail()
      } else {
        app.hideLoading()
        app.showError((res && res.message) || '过户失败')
      }
    } catch (e) {
      console.error('过户失败:', e)
      app.hideLoading()
      app.showError('网络错误，请稍后重试')
    } finally {
      app.hideLoading()
      this.setData({ transferSubmitting: false })
    }
  },

  // 编辑鹦鹉（打开弹窗）
  editParrot() {
    if (!app.hasPermission('parrot.edit')) {
      this.setData({ showMenu: false })
      app.showError('您没有编辑鹦鹉档案的权限')
      return
    }

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
      birth_place_province: p.birth_place_province || '',
      birth_place_city: p.birth_place_city || '',
      birth_place_county: p.birth_place_county || '',
      birth_place_text: p.birth_place || '',
      birth_date: p.birth_date || '',
      notes: p.notes || '',
      parrot_number: p.parrot_number || '',
      ring_number: p.ring_number || '',
      acquisition_date: p.acquisition_date || '',
      photo_url: p.photo_url || p.avatar_url || '',
      plumage_split_ids: Array.isArray(p.plumage_split_ids) ? p.plumage_split_ids : []
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
    const pid = encodeURIComponent(String(this.data.parrotId || ''))
    wx.navigateTo({
      url: `/pages/records/feeding/feeding${pid ? `?parrotId=${pid}` : ''}`
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
    this.setData({ suppressPullDownUntil: Date.now() + 800 })
  },

  // 组件事件：提交编辑
  async onParrotModalSubmit(e) {
    const { id, data } = e.detail || {}
    
    if (!app.hasPermission('parrot.edit')) {
      app.showError('您没有编辑鹦鹉档案的权限')
      return
    }

    if (!id) {
      app.showError('缺少鹦鹉ID，无法提交')
      return
    }
    try {
      app.showLoading('保存中...')
      const res = await app.request({ url: `/api/parrots/${id}`, method: 'PUT', data })
      if (res.success) {
        app.hideLoading()
        app.showSuccess('编辑成功')
        try {
          const currentUserId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || ''
          const targetOwnerId = data && data.target_owner_id
          const pid = id || this.data.parrotId
          if (targetOwnerId && String(targetOwnerId) !== String(currentUserId) && pid) {
            await app.request({ url: `/api/parrots/${pid}/transfer`, method: 'POST', data: { new_owner_id: targetOwnerId } })
          }
        } catch (_) {}
        this.setData({ showParrotModal: false, currentParrotForm: null })

        if (data && Object.prototype.hasOwnProperty.call(data, 'photo_url')) {
          const appendV = (u) => {
            if (!u) return ''
            const s = String(u)
            if (/^(wxfile|ttfile|file):\/\//.test(s)) return s
            if (/^\/?images\//.test(s)) return s
            const v = Date.now()
            return s.includes('?') ? `${s}&v=${v}` : `${s}?v=${v}`
          }
          const raw = data.photo_url
          const resolvedBase = raw ? app.resolveUploadUrl(raw) : ''
          const resolved = appendV(resolvedBase)
          const thumb = resolved ? app.getThumbnailUrl(resolved, 160) : ''
          const p = this.data.parrot || {}
          this.setData({ parrot: { ...p, photo_url_raw: raw, photo_url: resolved, photo_thumb: thumb } })
        }

        this.scheduleSilentRefresh(1000)
      } else {
        app.hideLoading()
        app.showError(res.message || '编辑失败')
      }
    } catch (error) {
      app.hideLoading()
      app.showError('网络错误，请稍后重试')
    } finally {
      app.hideLoading()
    }
  },

  // 删除鹦鹉
  deleteParrot() {
    this.setData({ showMenu: false }) // 关闭菜单
    
    const mode = (app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team') {
       try { if (app && typeof app.ensureEffectivePermissions === 'function') app.ensureEffectivePermissions() } catch(_){ }
       const hasPerm = app && typeof app.hasPermission === 'function' ? app.hasPermission('parrot.delete') : true
       if (!hasPerm) {
         wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 })
         return
       }
    }

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
              app.hideLoading() // 先隐藏loading，避免覆盖showSuccess
              app.showSuccess('删除成功')
              try { const c = require('../../../utils/cache'); c.clear && c.clear('parrots_list_default_v2'); c.clear && c.clear('parrots_list_default_raw') } catch(_) {}
              try { if (app && app.globalData) { app.globalData.needRefresh = true } } catch(_) {}
              
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
              }, 2000)
            } else {
              throw new Error(result.message)
            }
          } catch (error) {
            console.error('删除失败:', error)
            app.hideLoading() // 先隐藏loading
            setTimeout(() => {
              app.showError(error.message || '删除失败')
            }, 100)
          }
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    const now = Date.now()
    const until = this.data.suppressPullDownUntil || 0
    if (now < until) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadParrotDetail().finally(() => { wx.stopPullDownRefresh() })
  }
  ,

  // 图标加载失败时回退为 SVG
  // 加载体重趋势
  async loadWeightTrends() {
    try {
      // 获取所有含体重的健康记录
      const res = await app.request({
        url: '/api/records/health',
        method: 'GET',
        data: { 
          parrot_id: this.data.parrotId, 
          page: 1, 
          per_page: 100 
        }
      })
      
      if (res.success) {
        const records = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : [])
        const weightData = (records || [])
          .map(r => {
            const rd = String(r.record_date || '').trim()
            let rt = String(r.record_time || '').trim()
            if (rt.length === 5) rt = `${rt}:00`
            if (rt.length > 8) rt = rt.substring(0, 8)
            let merged = ''
            if (rd || rt) {
              merged = rd && rt ? `${rd}T${rt}` : (rd || rt)
            }
            const dt = this.parseServerTime(merged) || this.parseServerTime(r.created_at || '')
            const wraw = (r.weight != null ? r.weight : (r.data && r.data.weight))
            const w = typeof wraw === 'string' ? parseFloat(wraw) : wraw
            return {
              date: dt ? getApp().formatDateTime(dt, 'YYYY-MM-DD') : (r.record_date || ''),
              value: (typeof w === 'number' && isFinite(w) && !isNaN(w)) ? w : null,
              timestamp: dt ? dt.getTime() : 0
            }
          })
          .filter(p => p.value != null)
          .sort((a, b) => a.timestamp - b.timestamp)

        if (weightData.length > 0) {
          const series = [{
            parrot_id: this.data.parrotId,
            parrot_name: this.data.parrot.name || '当前鹦鹉',
            data: weightData
          }]
          
          this.setData({ weightSeries: series })
          // 初始化图表范围
          this.initWeightRange(series)
        } else {
          this.setData({ weightSeries: [] })
        }
      }
    } catch (err) {
      console.error('加载体重趋势失败:', err)
      // 不显示错误提示，以免打扰用户，显示空状态即可
    }
  },

  // 初始化体重图表范围
  initWeightRange(series) {
    if (!series || series.length === 0) return
    
    // 收集所有日期
    let allDates = []
    series.forEach(s => {
      if (s.data && s.data.length > 0) {
        s.data.forEach(p => allDates.push(p.date))
      }
    })
    
    // 去重并排序
    allDates = [...new Set(allDates)].sort()
    
    if (allDates.length === 0) return
    
    // 默认显示最近30个点；免费版仅允许查看最近30个点
    const totalPoints = allDates.length
    let startIndex = 0
    const limitPoints = 30
    if (!this.data.isPro && totalPoints > limitPoints) {
      startIndex = totalPoints - limitPoints
    } else if (totalPoints > limitPoints) {
      startIndex = 0
    }
    
    this.setData({
      weightRangeDates: allDates,
      weightStartIndex: startIndex,
      weightEndIndex: totalPoints - 1,
      weightLeft: (startIndex / (totalPoints - 1 || 1)) * 100,
      weightRight: 100,
      weightWidth: ((totalPoints - 1 - startIndex) / (totalPoints - 1 || 1)) * 100
    })
    
    this.updateWeightDateLabels()
    
    // 延迟绘制
    setTimeout(() => {
      this.drawWeightChart()
    }, 100)
  },

  // 更新体重日期标签
  updateWeightDateLabels() {
    const dates = this.data.weightRangeDates
    if (!dates || dates.length === 0) return
    const start = dates[this.data.weightStartIndex]
    const end = dates[this.data.weightEndIndex]
    this.setData({
      weightStartDate: start || '',
      weightEndDate: end || ''
    })
  },

  // 绘制体重趋势图
  drawWeightChart() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#weightCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return
      const canvas = res[0].node
      const width = res[0].width
      const height = res[0].height
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      
      this.renderWeightChart(ctx, width, height)
    })
  },

  // 渲染图表核心逻辑
  renderWeightChart(ctx, width, height) {
    const series = this.data.weightSeries
    const dates = this.data.weightRangeDates
    const startIndex = this.data.weightStartIndex
    const endIndex = this.data.weightEndIndex
    
    ctx.clearRect(0, 0, width, height)
    
    if (!series || series.length === 0 || !dates || dates.length === 0) {
      // 空状态
      return
    }
    
    // 筛选当前时间范围内的数据点
    const validDates = dates.slice(startIndex, endIndex + 1)
    if (validDates.length === 0) return
    
    // 计算Y轴范围
    let minVal = Infinity
    let maxVal = -Infinity
    
    // 收集范围内所有点的值
    const pointsMap = {} // date -> { parrotId: value }
    
    series.forEach(s => {
      if (!s.data) return
      s.data.forEach(p => {
        if (validDates.includes(p.date)) {
          minVal = Math.min(minVal, p.value)
          maxVal = Math.max(maxVal, p.value)
          
          if (!pointsMap[p.date]) pointsMap[p.date] = {}
          pointsMap[p.date][s.parrot_id] = p.value
        }
      })
    })
    
    if (minVal === Infinity) return
    
    // Y轴留白
    const range = maxVal - minVal
    const padding = range === 0 ? (minVal * 0.1) : (range * 0.2)
    const yMin = Math.max(0, minVal - padding)
    const yMax = maxVal + padding
    const yRange = yMax - yMin
    
    // 绘制区域（与统计页对齐）
    const chartLeft = 40
    const chartRight = width - 12
    const chartTop = 18
    const chartBottom = height - 36
    const chartWidth = chartRight - chartLeft
    const chartHeight = chartBottom - chartTop
    
    // 绘制坐标轴（与统计页一致风格）
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    
    // Y轴网格线与刻度（4条，与统计页一致）
    ctx.fillStyle = '#666'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const t = i / 4
      const y = chartTop + (1 - t) * chartHeight
      const val = yMin + (yRange * t)
      ctx.strokeStyle = '#eee'
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(chartRight, y)
      ctx.stroke()
      ctx.fillStyle = '#666'
      ctx.fillText(isFinite(val) && !isNaN(val) ? val.toFixed(1) : '0.0', chartLeft - 6, y)
    }
    
    // X轴均匀采样最多6个刻度与竖向网格（与统计页一致）
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const fmtDate = (dStr) => {
      const d = new Date(dStr)
      return `${d.getMonth() + 1}/${d.getDate()}`
    }
    const maxXTicks = Math.min(6, validDates.length)
    for (let i = 0; i < maxXTicks; i++) {
      let idx, x
      if (validDates.length === 1) {
        idx = 0
        x = chartLeft + chartWidth / 2
      } else {
        idx = Math.round((i / (maxXTicks - 1)) * (validDates.length - 1))
        x = chartLeft + (idx / (validDates.length - 1)) * chartWidth
      }
      const label = fmtDate(validDates[idx])
      const yAxis = chartBottom
      ctx.strokeStyle = '#eee'
      ctx.beginPath()
      ctx.moveTo(x, chartTop)
      ctx.lineTo(x, yAxis)
      ctx.stroke()
      ctx.fillStyle = '#666'
      if (idx === 0) {
        ctx.textAlign = 'left'
        const lx = Math.max(x, chartLeft + 2)
        ctx.fillText(label, lx, yAxis + 4)
      } else if (idx === validDates.length - 1) {
        ctx.textAlign = 'right'
        const rx = Math.min(x, chartRight - 2)
        ctx.fillText(label, rx, yAxis + 4)
      } else {
        ctx.textAlign = 'center'
        ctx.fillText(label, x, yAxis + 4)
      }
    }
    
    // 绘制折线
    const xStep = chartWidth / (validDates.length - 1 || 1)
    
    // 保存坐标用于交互
    this._chartLayout = {
      chartLeft, chartRight, chartTop, chartBottom, chartWidth, chartHeight,
      yMin, yMax, yRange, xStep, validDates, pointsMap
    }
    
    let totalSum = 0
    let totalCount = 0
    series.forEach((s) => {
      const color = '#7c3aed'
      const pts = []
      validDates.forEach((date, idx) => {
        const val = pointsMap[date] && pointsMap[date][s.parrot_id]
        if (val !== undefined) {
          totalSum += val
          totalCount++
          const x = chartLeft + idx * xStep
          const y = chartBottom - ((val - yMin) / yRange) * chartHeight
          pts.push({ x, y })
        }
      })
      if (pts.length === 0) return
      if (pts.length === 1) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      const n = pts.length
      const xs = pts.map(p => p.x)
      const ys = pts.map(p => p.y)
      const dxArr = new Array(n - 1)
      const mArr = new Array(n - 1)
      for (let i = 0; i < n - 1; i++) {
        const dx = xs[i + 1] - xs[i]
        dxArr[i] = dx
        mArr[i] = dx !== 0 ? ((ys[i + 1] - ys[i]) / dx) : 0
      }
      const tArr = new Array(n)
      tArr[0] = mArr[0]
      tArr[n - 1] = mArr[n - 2]
      for (let i = 1; i <= n - 2; i++) {
        const m0 = mArr[i - 1]
        const m1 = mArr[i]
        if (m0 * m1 <= 0) tArr[i] = 0
        else {
          const dx0 = dxArr[i - 1]
          const dx1 = dxArr[i]
          tArr[i] = (dx0 + dx1) / ((dx1 / m0) + (dx0 / m1))
        }
      }
      for (let i = 0; i < n - 1; i++) {
        const x0 = xs[i], y0 = ys[i]
        const x1 = xs[i + 1], y1 = ys[i + 1]
        const dx = dxArr[i]
        const cp1x = x0 + dx / 3
        const cp1y = y0 + tArr[i] * dx / 3
        const cp2x = x1 - dx / 3
        const cp2y = y1 - tArr[i + 1] * dx / 3
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
      }
      const last = pts[pts.length - 1]
      const first = pts[0]
      ctx.lineTo(last.x, chartBottom)
      ctx.lineTo(first.x, chartBottom)
      const gradient = ctx.createLinearGradient(0, chartTop, 0, chartBottom)
      gradient.addColorStop(0, 'rgba(124, 58, 237, 0.25)')
      gradient.addColorStop(0.7, 'rgba(124, 58, 237, 0.10)')
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0.02)')
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < n - 1; i++) {
        const x0 = xs[i], y0 = ys[i]
        const x1 = xs[i + 1], y1 = ys[i + 1]
        const dx = dxArr[i]
        const cp1x = x0 + dx / 3
        const cp1y = y0 + tArr[i] * dx / 3
        const cp2x = x1 - dx / 3
        const cp2y = y1 - tArr[i + 1] * dx / 3
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1)
      }
      ctx.stroke()
    })
    
    // 更新平均体重
    if (totalCount > 0) {
      this.setData({
        weightAvgChart: (totalSum / totalCount).toFixed(1) + 'g'
      })
    }

    // 绘制参考体重虚线（与统计页一致）
    if (typeof this.data.weightRefValue === 'number' && isFinite(this.data.weightRefValue) && yRange > 0) {
      const norm = (this.data.weightRefValue - yMin) / yRange
      if (isFinite(norm) && !isNaN(norm)) {
        const yRef = chartTop + (1 - norm) * chartHeight
        ctx.save()
        ctx.strokeStyle = '#7c3aed'
        ctx.lineWidth = 1
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(chartLeft, yRef)
        ctx.lineTo(chartRight, yRef)
        ctx.stroke()
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])
        ctx.restore()
      }
    }
    
    // 绘制高亮交叉线
    if (this.data.activeWeightPoint) {
      const { x, y, value, date } = this.data.activeWeightPoint
      
      // 垂直线
      ctx.strokeStyle = '#cccccc'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, chartTop)
      ctx.lineTo(x, chartBottom)
      ctx.stroke()
      ctx.setLineDash([])
      
      // 提示框
      const tipText = `${value}g`
      const dateText = fmtDate(date)
      const tipWidth = ctx.measureText(tipText).width + 20
      const tipHeight = 40
      
      let tipX = x - tipWidth / 2
      let tipY = y - tipHeight - 10
      
      if (tipX < chartLeft) tipX = chartLeft
      if (tipX + tipWidth > chartRight) tipX = chartRight - tipWidth
      if (tipY < chartTop) tipY = y + 10
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(tipX, tipY, tipWidth, tipHeight)
      
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(dateText, tipX + tipWidth / 2, tipY + 12)
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(tipText, tipX + tipWidth / 2, tipY + 28)
    }
  },

  async _loadParrotRefWeight(parrotId) {
    try {
      if (!parrotId) {
        this.setData({ weightRefValue: null, weightRefChart: '' })
        return
      }
      const detailRes = await app.request({ url: `/api/parrots/${parrotId}`, method: 'GET' })
      let speciesId = ''
      let speciesName = ''
      if (detailRes && detailRes.success && detailRes.data) {
        const p = detailRes.data
        speciesId = p.species_id || (p.species && p.species.id) || ''
        speciesName = (p.species && p.species.name) || p.species_name || ''
      }
      const speciesRes = await app.request({ url: '/api/parrots/species', method: 'GET' })
      let refWeight = null
      if (speciesRes && speciesRes.success && Array.isArray(speciesRes.data)) {
        const list = speciesRes.data
        let matched = null
        if (speciesId) {
          matched = list.find(s => String(s.id) === String(speciesId)) || null
        }
        if (!matched && speciesName) {
          matched = list.find(s => String(s.name) === String(speciesName)) || null
        }
        if (matched) {
          const raw = (matched.reference_weight_g != null ? matched.reference_weight_g : matched.reference_weight)
          const num = typeof raw === 'string' ? parseFloat(raw) : raw
          if (typeof num === 'number' && isFinite(num) && !isNaN(num) && num > 0) {
            refWeight = num
          }
        }
      }
      if (typeof refWeight === 'number') {
        this.setData({ weightRefValue: refWeight, weightRefChart: refWeight.toFixed(1) + 'g' }, () => this.drawWeightChart())
      } else {
        this.setData({ weightRefValue: null, weightRefChart: '' }, () => this.drawWeightChart())
      }
    } catch (_) {
      this.setData({ weightRefValue: null, weightRefChart: '' }, () => this.drawWeightChart())
    }
  },

  // 图表触摸开始
  onWeightTouchStart(e) {
    this.handleWeightTouch(e)
  },

  // 图表触摸移动
  onWeightTouchMove(e) {
    this.handleWeightTouch(e)
  },
  
  // 图表触摸结束
  onWeightTouchEnd(e) {
    // 延迟清除，方便查看
    // setTimeout(() => {
    //   this.setData({ activeWeightPoint: null })
    //   this.drawWeightChart()
    // }, 2000)
  },
  
  // 关闭高亮
  closeWeightHoverLabel() {
    if (this.data.activeWeightPoint) {
      this.setData({ activeWeightPoint: null })
      this.drawWeightChart()
    }
  },
  
  // 处理图表触摸
  handleWeightTouch(e) {
    if (!this._chartLayout) return
    const { chartLeft, chartRight, chartTop, chartBottom, chartWidth, chartHeight, yMin, yRange, xStep, validDates, pointsMap } = this._chartLayout
    
    const touch = e.touches[0]
    const rect = e.target.offsetLeft // 简化处理，实际需要 boundingClientRect
    // 由于是 canvas 2d，事件坐标通常是相对于 canvas 的
    const x = touch.x
    const y = touch.y
    
    if (x < chartLeft || x > chartRight || y < chartTop || y > chartBottom) return
    
    // 找到最近的日期索引
    const idx = Math.round((x - chartLeft) / xStep)
    if (idx < 0 || idx >= validDates.length) return
    
    const date = validDates[idx]
    const pointX = chartLeft + idx * xStep
    
    // 找到最近的值
    let bestVal = null
    let bestY = null
    let minDiff = Infinity
    
    const series = this.data.weightSeries
    series.forEach(s => {
      const val = pointsMap[date] && pointsMap[date][s.parrot_id]
      if (val !== undefined) {
        const py = chartBottom - ((val - yMin) / yRange) * chartHeight
        const diff = Math.abs(y - py)
        if (diff < minDiff) {
          minDiff = diff
          bestVal = val
          bestY = py
        }
      }
    })
    
    if (bestVal !== null) {
      this.setData({
        activeWeightPoint: {
          x: pointX,
          y: bestY,
          value: bestVal,
          date: date
        }
      })
      this.drawWeightChart()
    }
  },

  // 滑块触摸开始
  onSliderTouchStart(e) {
    this._sliderTouching = e.currentTarget.dataset.type
    this._sliderStartX = e.touches[0].clientX
  },

  // 滑块触摸移动
  onSliderTouchMove(e) {
    if (!this._sliderTouching) return
    
    const query = wx.createSelectorQuery().in(this)
    query.select('#slider-area').boundingClientRect(rect => {
      if (!rect) return
      
      const touchX = e.touches[0].clientX
      const width = rect.width
      const offsetX = touchX - rect.left
      let percentage = (offsetX / width) * 100
      
      // 限制范围
      percentage = Math.max(0, Math.min(100, percentage))
      
      const currentLeft = this.data.weightLeft
      const currentRight = this.data.weightRight // 注意：slider-handle 的 right 是指百分比位置
      // 但这里 right handle 的 style left 是 weightRight%
      // 所以 weightRight 实际上是右滑块的位置百分比
      
      const dates = this.data.weightRangeDates
      const total = dates.length
      
      if (this._sliderTouching === 'start') {
        // 左滑块不能超过右滑块，且至少保留2个点
        const maxLeft = this.data.weightRight - (2 / total * 100)
        percentage = Math.min(percentage, maxLeft)
        
        this.setData({
          weightLeft: percentage,
          weightWidth: this.data.weightRight - percentage
        })
      } else {
        // 右滑块不能小于左滑块
        const minRight = this.data.weightLeft + (2 / total * 100)
        percentage = Math.max(percentage, minRight)
        
        this.setData({
          weightRight: percentage,
          weightWidth: percentage - this.data.weightLeft
        })
      }
      
      // 更新索引（免费版限制最大窗口为30个点）
      const startIndex = Math.floor((this.data.weightLeft / 100) * (total - 1))
      const endIndex = Math.ceil((this.data.weightRight / 100) * (total - 1))
      if (!this.data.isPro) {
        const maxWindow = 30
        const windowSize = endIndex - startIndex + 1
        if (windowSize > maxWindow) {
          const adjustedEnd = startIndex + maxWindow - 1
          const adjustedRight = (adjustedEnd / (total - 1 || 1)) * 100
          this.setData({ weightRight: adjustedRight, weightWidth: adjustedRight - this.data.weightLeft })
        }
      }
      
      if (startIndex !== this.data.weightStartIndex || endIndex !== this.data.weightEndIndex) {
        this.setData({
          weightStartIndex: startIndex,
          weightEndIndex: endIndex
        })
        this.updateWeightDateLabels()
        // 节流重绘
        if (this._drawTimer) clearTimeout(this._drawTimer)
        this._drawTimer = setTimeout(() => {
          this.drawWeightChart()
        }, 50)
      }
    }).exec()
  },
  
  // 阻止冒泡
  preventBubble() {},

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
