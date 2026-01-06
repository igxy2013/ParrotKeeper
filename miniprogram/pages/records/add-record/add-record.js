// pages/records/add-record/add-record.js
const app = getApp()

  Page({
    data: {
    // 记录类型
    recordType: 'feeding',
    navTheme: 'orange', // 导航栏主题色
    themeColorMap: {
      feeding: '#FF9F1C',
      cleaning: '#42A5F5',
      health: '#AB47BC',
      breeding: '#2ECC71'
    },
    
    // 表单数据
    formData: {
      parrot_ids: [], // 改为数组支持多选
      record_date: '',
      record_time: '',
      notes: '',
      photos: [],
      
      // 喂食记录字段
      food_types: [], // 改为数组支持多选
      amount: '',
      food_amounts: {},
      
      // 清洁记录字段
      cleaning_types: [], // 改为数组支持多选
      description: '',
      
      // 健康检查字段
      weight: '',
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
    
    // 预填ID（来自列表页聚合）
    prefillParrotIds: [],
    prefillFeedTypeIds: [],
    prefillCleaningTypeIds: [],
    prefillRecordIds: [],
    
    // 选择器数据
    parrotList: [],
    selectedParrots: [], // 改为数组存储多选的鹦鹉
    selectedParrotNames: '', // 显示选中的鹦鹉名称
    healthStatusText: '健康',
    feedTypeList: [],
    selectedFeedTypes: [], // 改为数组存储多选的食物类型
    selectedFeedTypeNames: '', // 显示选中的食物类型名称
    cleaningTypeList: [], // 清洁类型列表
    selectedCleaningTypes: [], // 改为数组存储多选的清洁类型
    selectedCleaningTypeNames: '', // 显示选中的清洁类型名称
    
    // 弹窗状态
    showParrotModal: false,
      showHealthStatusModal: false,
      // 统一右侧勾选PNG图标路径（占位：待替换为 checkbox-circle-fill）
      checkIconSrc: '/images/remix/checkbox-circle-fill.png',
    showFeedTypeModal: false,
    showCleaningTypeModal: false,
    
    // 通用选择器选项
    parrotOptions: [],
    feedTypeOptions: [],
    cleaningTypeOptions: [],
    healthStatusOptions: [],

    // 表单状态
    canSubmit: false,
    submitting: false,

    // 其他
      today: '',
      recordId: null,
      amountUnit: 'g',

      // 数字键盘状态
      keyboardVisible: false,
      keyboardValue: '',
      keyboardMaxLength: 10,
      keyboardMaxDecimals: 2,
      keyboardTitle: '',
      currentField: '',
      currentExtraData: null
    },
  
  // 将记录类型映射为中文文案
  typeToText: function(type) {
    const map = {
      feeding: '喂食',
      cleaning: '清洁',
      health: '健康',
      breeding: '繁殖'
    }
    return map[type] || ''
  },


  // 阻止弹窗背景滑动穿透
  preventTouchMove: function() {
    return
  },

  // 底部弹窗背景点击关闭
  onOverlayClose: function() {
    this.goBack()
  },

  // 右上角关闭按钮
  onClose: function() {
    this.goBack()
  },

  stopPropagation: function() {},

  touchStart: function(e) {
    try {
      const t = (e && e.touches && e.touches[0]) || {}
      const y = typeof t.clientY === 'number' ? t.clientY : (typeof t.pageY === 'number' ? t.pageY : 0)
      this._startY = y
    } catch (_) { this._startY = 0 }
  },

  touchEnd: function(e) {
    try {
      const t = (e && e.changedTouches && e.changedTouches[0]) || {}
      const y = typeof t.clientY === 'number' ? t.clientY : (typeof t.pageY === 'number' ? t.pageY : 0)
      const startY = typeof this._startY === 'number' ? this._startY : 0
      if (y - startY > 80) this.onOverlayClose()
    } catch (_) {}
  },

  // 顶部返回/关闭：有历史则返回；无历史则根据记录类型重定向到对应列表
  goBack: function() {
    try {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) {
        wx.navigateBack({ delta: 1 })
        return
      }
      const type = this.data && this.data.recordType ? this.data.recordType : 'feeding'
      const map = {
        feeding: '/pages/records/feeding/feeding',
        cleaning: '/pages/records/cleaning/cleaning',
        health: '/pages/records/health/health',
        breeding: '/pages/records/breeding/breeding'
      }
      const url = map[type] || '/pages/records/feeding/feeding'
      if (wx.reLaunch) wx.reLaunch({ url })
      else wx.redirectTo({ url })
    } catch (_) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 更新主题色
  updateTheme: function(type) {
    const themeMap = {
      feeding: 'orange',
      cleaning: 'blue',
      health: 'purple',
      breeding: 'green'
    }
    const colorMap = this.data.themeColorMap

    const navTheme = themeMap[type] || 'blue'
    const navColor = colorMap[type] || '#42A5F5'
    
    this.setData({ navTheme })
    
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: navColor,
      animation: {
        duration: 300,
        timingFunc: 'easeIn'
      }
    })
  },

  getAmountUnit: function(selectedFeedTypes) {
    try {
      if (Array.isArray(selectedFeedTypes) && selectedFeedTypes.length === 1) {
        const f = selectedFeedTypes[0]
        if (f && f.unit) return f.unit
      }
    } catch (_) {}
    return 'g'
  },

  resolveUnitByTypeName: function(type, name) { return 'g' },

  onLoad: async function(options) {
    // 解析列表页传入的预填ID（支持喂食和清洁记录）
    const prefillParrotIds = options.parrot_ids ? decodeURIComponent(String(options.parrot_ids)).split(',').map(x => parseInt(x)).filter(x => !isNaN(x)) : []
    const prefillFeedTypeIds = options.food_type_ids ? decodeURIComponent(String(options.food_type_ids)).split(',').map(x => parseInt(x)).filter(x => !isNaN(x)) : []
    const prefillCleaningTypeIds = options.cleaning_type_ids ? decodeURIComponent(String(options.cleaning_type_ids)).split(',').filter(x => x.trim() !== '') : []
    const prefillRecordIds = options.record_ids ? decodeURIComponent(String(options.record_ids)).split(',').map(x => parseInt(x)).filter(x => !isNaN(x)) : []
    this.setData({ prefillParrotIds, prefillFeedTypeIds, prefillCleaningTypeIds, prefillRecordIds })

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
    
    // 加载食物类型列表
    await this.loadFeedTypeList()
    
    // 初始化清洁类型列表
    this.initCleaningTypeList()

    // 初始化健康状态选项
    this.initHealthStatusOptions()
    
    // 检查是否是编辑模式
    const incomingType = options.type || this.data.recordType
    this.updateTheme(incomingType)
    
    if (options.id) {
      this.setData({
        recordId: parseInt(options.id),
        // 编辑模式也需要根据传入的类型设置记录类型
        recordType: incomingType
      })
      // 设置编辑模式的页面标题（细分到记录类型）
      wx.setNavigationBarTitle({
        title: `编辑${this.typeToText(incomingType)}记录`
      })
      await this.loadRecordData(options.id)
    } else {
      // 添加模式，根据传入类型设置标题
      this.setData({
        recordType: incomingType
      })
      wx.setNavigationBarTitle({
        title: `添加${this.typeToText(incomingType)}记录`
      })
    }
    // 页面初始化后尝试恢复草稿
    this.restoreDraftIfAny()
    if (!this.data.recordId) {
      const ids = Array.isArray(this.data.prefillParrotIds) ? this.data.prefillParrotIds.slice() : []
      if (ids.length) {
        const isBreeding = this.data.recordType === 'breeding'
        const effectiveIds = isBreeding ? ids.slice(0, 2) : ids
        const baseList = Array.isArray(this.data.parrotList) ? this.data.parrotList : []
        const set = new Set(effectiveIds)
        const parrotList = baseList.map(p => ({ ...p, selected: set.has(p.id) }))
        const selectedParrots = parrotList.filter(p => p.selected).map(p => ({ id: p.id, name: p.name }))
        let selectedParrotNames = selectedParrots.map(p => p.name).join('、')
        if (this.data.recordType === 'health' && effectiveIds.length >= 1) {
          const target = baseList.find(p => p.id === effectiveIds[0])
          selectedParrotNames = target ? target.name : ''
        }
        this.setData({
          parrotList,
          selectedParrots,
          selectedParrotNames,
          'formData.parrot_ids': effectiveIds
        })
        if (isBreeding) this.updateBreedingParrotListsBasedOnSelection()
        this.validateForm()
      }
    }
  },

  loadParrotList: async function() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      if (res.success) {
        // 统一解析头像/照片URL，并提供默认头像兜底，保持与“我的鹦鹉”页一致
        const allParrotsRaw = res.data.parrots || []
        const allParrots = allParrotsRaw.map(p => {
          const speciesName = (p.species && p.species.name) ? p.species.name : (p.species_name || '')
          const photoUrl = app.resolveUploadUrl(p.photo_url)
          const avatarUrl = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : app.getDefaultAvatarForParrot({
            gender: p.gender,
            species_name: speciesName,
            name: p.name
          })
          const displayUrl = photoUrl || avatarUrl
          const thumbUrl = app.getThumbnailUrl(displayUrl, 128)
          return { ...p, photo_url: photoUrl, avatar_url: avatarUrl, thumb_url: thumbUrl }
        })
        
        // 过滤雄性鹦鹉（包括性别未知的） - 已移除
        // const maleParrots = ...
        
        // 过滤雌性鹦鹉（包括性别未知的） - 已移除
        // const femaleParrots = ...
        
        // 应用预填鹦鹉ID到选择状态
        const { prefillParrotIds } = this.data
        const selectedParrots = []
        const isBreeding = this.data.recordType === 'breeding'
        const parrotIdsAppliedRaw = prefillParrotIds && prefillParrotIds.length
          ? prefillParrotIds.slice()
          : (Array.isArray(this.data.formData.parrot_ids) ? this.data.formData.parrot_ids.slice() : [])
        const parrotIdsApplied = isBreeding ? parrotIdsAppliedRaw.slice(0, 2) : parrotIdsAppliedRaw
        const parrotListWithSelection = allParrots.map(p => {
          const selected = parrotIdsApplied.includes(p.id)
          if (selected) selectedParrots.push({ id: p.id, name: p.name, gender: p.gender })
          return { ...p, selected }
        })
        const selectedParrotNames = selectedParrots.map(p => p.name).join('、')
        
        this.setData({
          parrotList: parrotListWithSelection,
          selectedParrots,
          selectedParrotNames,
          'formData.parrot_ids': parrotIdsApplied.map(id => String(id))
        })
        // 繁殖记录：自动校验性别并赋值
        if (isBreeding && selectedParrots.length === 2) {
          this.validateBreedingParrots(selectedParrots)
        }
        this.updateParrotOptions()
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载食物类型列表
  loadFeedTypeList: async function() {
    try {
      const res = await app.request({
        url: '/api/records/feed-types',
        method: 'GET'
      })
      if (res.success) {
        // 添加中文类型映射
        const typeMap = {
          'seed': '种子',
          'pellet': '颗粒',
          'fruit': '水果',
          'vegetable': '蔬菜',
          'nut': '坚果',
          'supplement': '保健品',
          'milk_powder': '奶粉'
        }
        
        const feedTypeList = res.data.map(item => {
          // 生成用于展示的名称：苹果→新鲜水果；胡萝卜→新鲜蔬菜
          let displayName = item.name
          if (typeof item.name === 'string') {
            if (item.name.indexOf('苹果') !== -1) {
              displayName = '新鲜水果'
            } else if (item.name.indexOf('胡萝卜') !== -1) {
              displayName = '新鲜蔬菜'
            }
          }
          return {
            ...item,
            typeText: typeMap[item.type] || item.type,
            displayName,
            unit: item.unit || 'g'
          }
        })
        
        // 应用预填食物类型ID到选择状态
        const { prefillFeedTypeIds } = this.data
        const selectedFeedTypes = []
        const feedTypeIdsApplied = prefillFeedTypeIds && prefillFeedTypeIds.length ? prefillFeedTypeIds.slice() : this.data.formData.food_types
        const feedTypeListWithSelection = feedTypeList.map(f => {
          const selected = feedTypeIdsApplied.includes(f.id)
          if (selected) selectedFeedTypes.push({ id: f.id, name: f.displayName, type: f.type, unit: f.unit || 'g' })
          return { ...f, selected }
        })
        const selectedFeedTypeNames = selectedFeedTypes.map(f => f.name).join('、')

        // 同步每种食物的分量映射（新增选项初始化，未选项清理）
        const foodAmounts = { ...(this.data.formData.food_amounts || {}) }
        const appliedSet = new Set(feedTypeIdsApplied.map(id => String(id)))
        selectedFeedTypes.forEach(f => {
          const idStr = String(f.id)
          if (!(idStr in foodAmounts)) foodAmounts[idStr] = ''
        })
        Object.keys(foodAmounts).forEach(idStr => {
          if (!appliedSet.has(idStr)) delete foodAmounts[idStr]
        })
        
        const amountUnit = this.getAmountUnit(selectedFeedTypes)
        this.setData({
          feedTypeList: feedTypeListWithSelection,
          selectedFeedTypes,
          selectedFeedTypeNames,
          'formData.food_types': feedTypeIdsApplied.map(id => String(id)),
          'formData.food_amounts': foodAmounts,
          amountUnit
        })
        this.updateFeedTypeOptions()
      }
    } catch (error) {
      console.error('加载食物类型失败:', error)
    }
  },

  // 初始化清洁类型列表
  initCleaningTypeList: function() {
    const cleaningTypes = [
      { id: 'cage', name: '笼子清洁', selected: false },
      { id: 'toys', name: '玩具清洁', selected: false },
      { id: 'perches', name: '栖木清洁', selected: false },
      { id: 'food_water', name: '食物和水清洁', selected: false },
      { id: 'disinfection', name: '消毒', selected: false },
      { id: 'bath', name: '鹦鹉洗澡', selected: false }
    ]
    this.setData({
      cleaningTypeList: cleaningTypes
    })
    this.updateCleaningTypeOptions()
  },

  // 初始化健康状态选项
  initHealthStatusOptions: function() {
    const options = [
      { value: 'healthy', label: '健康', icon: 'https://img.icons8.com/3d-fluency/96/heart-with-pulse.png' },
      { value: 'sick', label: '生病', icon: 'https://img.icons8.com/3d-fluency/96/face-with-thermometer.png' },
      { value: 'recovering', label: '康复中', icon: 'https://img.icons8.com/3d-fluency/96/stethoscope.png' },
      { value: 'observation', label: '观察中', icon: 'https://img.icons8.com/3d-fluency/96/eye.png' }
    ]
    this.setData({ healthStatusOptions: options })
  },

  // 加载记录数据（编辑模式）
  loadRecordData: async function(recordId) {
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
        
        // 查找食物类型名称 - 后端返回的是嵌套的feed_type对象
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
        
        // 处理繁殖记录的雄性和雌性鹦鹉信息
        let maleParrotId = ''
        let femaleParrotId = ''
        if (record.male_parrot) {
          maleParrotId = record.male_parrot.id
        } else if (record.male_parrot_id) {
          maleParrotId = record.male_parrot_id
        }
        if (record.female_parrot) {
          femaleParrotId = record.female_parrot.id
        } else if (record.female_parrot_id) {
          femaleParrotId = record.female_parrot_id
        }
        
        // 获取健康状态文本
        const healthStatusMap = {
          'healthy': '健康',
          'sick': '生病',
          'recovering': '康复中',
          'observation': '观察中'
        }
        
        // 解析记录时间（兼容 ISO、空格分隔以及仅日期），避免不同端 Date 解析不一致
        // 统一以后端返回的 record_time 为主，若无则回退 record_date
        const rawTime = (record.record_time || record.record_date || '')
        let dateStr = this.data.formData.record_date
        let timeStr = this.data.formData.record_time
        if (rawTime) {
          const s = String(rawTime).trim()
          if (s.includes('T')) {
            // ISO 格式：YYYY-MM-DDTHH:MM:SS(.sss)(Z|+08:00)
            const [d, tRaw] = s.split('T')
            let t = tRaw || ''
            // 去掉时区与毫秒
            t = t.replace('Z', '')
                 .replace(/\+\d{2}:?\d{2}$/,'')
                 .replace(/-\d{2}:?\d{2}$/,'')
            if (t.includes('.')) t = t.split('.')[0]
            dateStr = d
            timeStr = (t || '').slice(0,5) || '00:00'
          } else if (s.includes(' ')) {
            // 空格分隔：YYYY-MM-DD HH:MM:SS
            const parts = s.split(' ')
            dateStr = parts[0]
            timeStr = (parts[1] || '').slice(0,5) || '00:00'
          } else {
            // 仅日期
            dateStr = s
            // 保持原有默认的时间
          }
        }
        // 不再将繁殖记录时间与交配日期绑定，保持独立的记录创建时间
        
        // 根据记录类型设置表单数据
        let formData = {
          parrot_ids: parrotId ? [parseInt(parrotId)] : [],
          record_date: dateStr,
          record_time: timeStr,
          // 确保为字符串，避免 null/非字符串导致绑定异常
          notes: (function(n){
            if (typeof n === 'string') return n
            if (n === null || n === undefined) return ''
            try { return String(n) } catch(_) { return '' }
          })(record.notes),
          photos: (function(p){
            if (Array.isArray(p)) return p;
            if (typeof p === 'string') {
              const s = p.trim();
              if (!s) return [];
              try { return JSON.parse(s); } catch(_) { return []; }
            }
            return [];
          })(record.photos),
          
          // 喂食记录字段（编辑旧数据时按单选回填到多选数组）
          food_types: feedTypeId ? [parseInt(feedTypeId)] : [],
          amount: record.amount ? String(record.amount) : '',
          
          // 健康检查字段
          weight: record.weight ? String(record.weight) : '',
          health_status: record.health_status || 'healthy',
          
          // 清洁记录字段
          cleaning_type: record.cleaning_type || '',
          // 确保为字符串，避免 null/非字符串导致绑定异常
          description: (function(d){
            if (typeof d === 'string') return d
            if (d === null || d === undefined) return ''
            try { return String(d) } catch(_) { return '' }
          })(record.description),
          
          // 繁殖记录字段
          male_parrot_id: maleParrotId ? String(maleParrotId) : '',
          female_parrot_id: femaleParrotId ? String(femaleParrotId) : '',
          mating_date: record.mating_date || '',
          egg_laying_date: record.egg_laying_date || '',
          egg_count: record.egg_count ? String(record.egg_count) : '',
          hatching_date: record.hatching_date || '',
          chick_count: record.chick_count ? String(record.chick_count) : '',
          success_rate: record.success_rate ? String(record.success_rate) : ''
        }
        
        // 如果是繁殖记录，基础信息的鹦鹉选择器预填为雄雌鹦鹉
        if (this.data.recordType === 'breeding') {
          const breedingParrotIds = [maleParrotId, femaleParrotId]
            .map(id => parseInt(id))
            .filter(id => !isNaN(id))
          formData.parrot_ids = breedingParrotIds
        }
        
        // 应用预填多选（若有）覆盖单选回填
        const { prefillParrotIds, prefillFeedTypeIds, prefillCleaningTypeIds } = this.data
        if (this.data.recordType === 'feeding') {
          if (prefillParrotIds && prefillParrotIds.length) {
            formData.parrot_ids = prefillParrotIds.slice()
          }
          if (prefillFeedTypeIds && prefillFeedTypeIds.length) {
            formData.food_types = prefillFeedTypeIds.slice()
          }
        } else if (this.data.recordType === 'cleaning') {
          if (prefillParrotIds && prefillParrotIds.length) {
            formData.parrot_ids = prefillParrotIds.slice()
          }
          if (prefillCleaningTypeIds && prefillCleaningTypeIds.length) {
            formData.cleaning_types = prefillCleaningTypeIds.slice()
          }
        }
        
        // 初始化每种食物的分量映射（编辑模式，用同一amount预填）
        formData.food_amounts = {}
        ;(formData.food_types || []).forEach(id => {
          formData.food_amounts[String(id)] = formData.amount || ''
        })
        
        // 生成选中名称（如果列表中找不到该鹦鹉，使用后端返回的名称兜底）
        let selectedParrots = this.data.parrotList
          .filter(p => formData.parrot_ids.includes(p.id))
          .map(p => ({ id: p.id, name: p.name }))
        let selectedParrotNames = selectedParrots.map(p => p.name).join('、')
        if ((!selectedParrots || selectedParrots.length === 0) && parrotId && selectedParrotName) {
          selectedParrots = [{ id: parseInt(parrotId), name: selectedParrotName }]
          selectedParrotNames = selectedParrotName
        }
        const selectedFeedTypes = this.data.feedTypeList
          .filter(f => formData.food_types.includes(f.id))
          .map(f => ({ id: f.id, name: f.displayName || f.name, type: f.type, unit: this.resolveUnitByTypeName(f.type, f.displayName || f.name) }))
        const selectedFeedTypeNames = selectedFeedTypes.map(f => f.name).join('、')
        
        // 同步列表项的选中状态，确保弹窗内显示勾选
        const parrotListSynced = this.data.parrotList.map(p => ({ ...p, selected: formData.parrot_ids.includes(p.id) }))
        const feedTypeListSynced = this.data.feedTypeList.map(f => ({ ...f, selected: formData.food_types.includes(f.id) }))
        
        // 查找雄性和雌性鹦鹉名称（繁殖记录）
        // 逻辑已移除，由validateBreedingParrots处理

        // 同步雄性和雌性鹦鹉列表的选中状态 - 已移除
        // const maleParrotListSynced = ...
        // const femaleParrotListSynced = ...
        
        // 清洁类型处理（支持多选）
        const cleaningTypeTextMap = {
          cage: '笼子清洁',
          toys: '玩具清洁',
          perches: '栖木清洁',
          food_water: '食物和水清洁',
          disinfection: '消毒',
          water_change: '饮用水更换',
          water_bowl_clean: '水碗清洁',
          bath: '鹦鹉洗澡'
        }
        
        let selectedCleaningTypes = []
        let selectedCleaningTypeNames = ''
        let cleaningTypeListSynced = [...this.data.cleaningTypeList]
        
        // 应用预填清洁类型（若有）
        if (this.data.recordType === 'cleaning' && prefillCleaningTypeIds && prefillCleaningTypeIds.length) {
          selectedCleaningTypes = prefillCleaningTypeIds.slice()
          selectedCleaningTypeNames = prefillCleaningTypeIds
            .map(type => cleaningTypeTextMap[type] || '')
            .filter(name => name)
            .join('、')
          cleaningTypeListSynced = cleaningTypeListSynced.map(item => ({
            ...item,
            selected: prefillCleaningTypeIds.includes(item.id)
          }))
        } else if (record.cleaning_type) {
          // 兼容旧的单选数据
          selectedCleaningTypes = [record.cleaning_type]
          selectedCleaningTypeNames = cleaningTypeTextMap[record.cleaning_type] || ''
          cleaningTypeListSynced = cleaningTypeListSynced.map(item => ({
            ...item,
            selected: item.id === record.cleaning_type
          }))
        } else if (record.cleaning_types && Array.isArray(record.cleaning_types)) {
          // 新的多选数据
          selectedCleaningTypes = record.cleaning_types
          selectedCleaningTypeNames = record.cleaning_types
            .map(type => cleaningTypeTextMap[type] || '')
            .filter(name => name)
            .join('、')
          cleaningTypeListSynced = cleaningTypeListSynced.map(item => ({
            ...item,
            selected: record.cleaning_types.includes(item.id)
          }))
        }
        
        const amountUnit = this.getAmountUnit(selectedFeedTypes)
        // 确保表单中的清洁类型为数组，避免组件接收非数组值导致告警
        formData.cleaning_types = Array.isArray(selectedCleaningTypes) ? selectedCleaningTypes.slice() : []
        this.setData({
          formData,
          selectedParrots,
          selectedParrotNames,
          selectedFeedTypes,
          selectedFeedTypeNames,
          selectedCleaningTypes,
          selectedCleaningTypeNames,
          healthStatusText: healthStatusMap[record.health_status] || '健康',
          parrotList: parrotListSynced,
          feedTypeList: feedTypeListSynced,
          cleaningTypeList: cleaningTypeListSynced,
          amountUnit
        })
        // 编辑模式：根据基础选择限制雄/雌选择器范围 - 已移除
        // this.updateBreedingParrotListsBasedOnSelection()

        this.validateForm()
      }
    } catch (error) {
      console.error('加载记录数据失败:', error)
      app.showError('加载记录数据失败')
    } finally {
      app.hideLoading()
    }
  },

  selectType: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ recordType: type })
    this.updateTheme(type)
    this.validateForm()
  },

  // 触摸开始
  touchStart: function(e) {
    if (e.changedTouches.length === 1) {
      this.touchStartX = e.changedTouches[0].clientX;
      this.touchStartY = e.changedTouches[0].clientY;
    }
  },

  // 触摸结束
  touchEnd: function(e) {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - this.touchStartX;
      const diffY = touchEndY - this.touchStartY;

      // 判断是否是水平滑动（X轴移动距离大于Y轴，且X轴距离大于阈值50）
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // 向右滑动 -> 上一个
          this.switchRecordType('prev');
        } else {
          // 向左滑动 -> 下一个
          this.switchRecordType('next');
        }
      }
    }
  },

  // 切换记录类型
  switchRecordType: function(direction) {
    const types = ['feeding', 'cleaning', 'health', 'breeding'];
    const currentType = this.data.recordType;
    const currentIndex = types.indexOf(currentType);
    let newIndex;

    if (direction === 'next') {
      newIndex = currentIndex + 1;
      // 循环切换
      if (newIndex >= types.length) newIndex = 0;
    } else {
      newIndex = currentIndex - 1;
      // 循环切换
      if (newIndex < 0) newIndex = types.length - 1;
    }

    const newType = types[newIndex];
    this.setData({ recordType: newType });
    this.updateTheme(newType);
    this.validateForm();
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
  },
  
  // 显示/隐藏各类选择弹窗
  showParrotPicker: function() { this.setData({ showParrotModal: true }) },
  hideParrotPicker: function() { this.setData({ showParrotModal: false }) },
  showFeedTypePicker: function() { this.setData({ showFeedTypeModal: true }) },
  hideFeedTypePicker: function() { this.setData({ showFeedTypeModal: false }) },
  showCleaningTypePicker: function() { this.setData({ showCleaningTypeModal: true }) },
  hideCleaningTypePicker: function() { this.setData({ showCleaningTypeModal: false }) },
  showHealthStatusPicker: function() { this.setData({ showHealthStatusModal: true }) },
  hideHealthStatusPicker: function() { this.setData({ showHealthStatusModal: false }) },
  stopPropagation: function() {},
  
  // 选择鹦鹉（多选）
  selectParrot: function(e) {
    const { id, name } = e.currentTarget.dataset
    let { selectedParrots, parrotList, recordType } = this.data
    
    if (recordType === 'health') {
      // 健康记录：单选，直接关闭弹窗
      selectedParrots = [{ id, name }]
      parrotList = parrotList.map(p => ({
        ...p,
        selected: p.id === id
      }))
      const selectedParrotNames = name
      this.setData({
        selectedParrots,
        parrotList,
        selectedParrotNames,
        'formData.parrot_ids': [id],
        showParrotModal: false
      })
    } else {
      // 其他类型：多选逻辑，不自动关闭弹窗
      const index = selectedParrots.findIndex(p => p.id === id)
      if (index >= 0) {
        selectedParrots.splice(index, 1)
      } else {
        // 繁殖记录：最多选择 2 只鹦鹉
        if (this.data.recordType === 'breeding' && selectedParrots.length >= 2) {
          wx.showToast({ title: '最多选择2只鹦鹉', icon: 'none' })
        } else {
          selectedParrots.push({ id, name })
        }
      }
      parrotList = parrotList.map(p => ({
        ...p,
        selected: selectedParrots.some(sp => sp.id === p.id)
      }))
      const selectedParrotNames = selectedParrots.map(p => p.name).join('、')
      this.setData({
        selectedParrots,
        parrotList,
        selectedParrotNames,
        'formData.parrot_ids': selectedParrots.map(p => p.id)
      })
    }
    this.validateForm()
  },

  // 确认鹦鹉选择
  confirmParrotSelection: function() {
    // 关闭弹窗前根据选择更新繁殖记录的雄/雌选择器范围
    this.updateBreedingParrotListsBasedOnSelection()
    this.setData({ showParrotModal: false })
  },


  
  // 选择食物类型（多选）
  selectFeedType: function(e) {
    const { id, name } = e.currentTarget.dataset
    let { selectedFeedTypes, feedTypeList, formData } = this.data
    
    // 切换选中状态，不自动关闭弹窗
    const index = selectedFeedTypes.findIndex(f => f.id === id)
    if (index >= 0) {
      selectedFeedTypes.splice(index, 1)
    } else {
      const found = feedTypeList.find(f => f.id === id)
      const type = found ? found.type : ''
      const unit = found && found.unit ? found.unit : 'g'
      selectedFeedTypes.push({ id, name, type, unit })
    }
    
    // 更新列表选中状态
    feedTypeList = feedTypeList.map(f => ({
      ...f,
      selected: selectedFeedTypes.some(sf => sf.id === f.id)
    }))
    
    const selectedFeedTypeNames = selectedFeedTypes.map(f => f.name).join('、')

    // 同步每种食物的分量映射：新增选项初始化，取消选项清理
    const foodAmounts = { ...(formData.food_amounts || {}) }
    const selectedIdSet = new Set(selectedFeedTypes.map(f => String(f.id)))
    selectedFeedTypes.forEach(f => {
      const idStr = String(f.id)
      if (!(idStr in foodAmounts)) foodAmounts[idStr] = ''
    })
    Object.keys(foodAmounts).forEach(idStr => {
      if (!selectedIdSet.has(idStr)) delete foodAmounts[idStr]
    })
    
    const amountUnit = this.getAmountUnit(selectedFeedTypes)
    this.setData({
      selectedFeedTypes,
      feedTypeList,
      selectedFeedTypeNames,
      'formData.food_types': selectedFeedTypes.map(f => f.id),
      'formData.food_amounts': foodAmounts,
      amountUnit
    })
    this.updateFeedTypeOptions()
    this.validateForm()
  },

  // 确认食物类型选择
  confirmFeedTypeSelection: function() {
    this.setData({
      showFeedTypeModal: false
    })
  },

  // 多食物类型分量输入处理
  onFoodAmountInput: function(e) {
    const idStr = String(e.currentTarget.dataset.id)
    const value = e.detail.value
    const foodAmounts = { ...(this.data.formData.food_amounts || {}) }
    foodAmounts[idStr] = value
    this.setData({ 'formData.food_amounts': foodAmounts })
    this.validateForm()
  },
  
  // 选择清洁类型（多选）
  selectCleaningType: function(e) {
    const type = e.currentTarget.dataset.type
    const cleaningTypeList = this.data.cleaningTypeList
    const selectedCleaningTypes = [...this.data.selectedCleaningTypes]
    
    // 切换选中状态
    const index = cleaningTypeList.findIndex(item => item.id === type)
    if (index !== -1) {
      cleaningTypeList[index].selected = !cleaningTypeList[index].selected
      
      if (cleaningTypeList[index].selected) {
        // 添加到选中列表
        if (!selectedCleaningTypes.includes(type)) {
          selectedCleaningTypes.push(type)
        }
      } else {
        // 从选中列表移除
        const selectedIndex = selectedCleaningTypes.indexOf(type)
        if (selectedIndex !== -1) {
          selectedCleaningTypes.splice(selectedIndex, 1)
        }
      }
    }
    
    // 更新显示的名称
    const selectedNames = cleaningTypeList
      .filter(item => item.selected)
      .map(item => item.name)
      .join('、')
    
    this.setData({
      cleaningTypeList,
      selectedCleaningTypes,
      selectedCleaningTypeNames: selectedNames,
      'formData.cleaning_types': selectedCleaningTypes
    })
    
    this.validateForm()
  },

  // 确认清洁类型选择
  confirmCleaningTypeSelection: function() {
    this.setData({
      showCleaningTypeModal: false
    })
  },
  
  // 使用原生复选框进行清洁类型选择（多选）
  onCleaningTypeChange: function(e) {
    const selectedIds = (e.detail.value || []).map(v => String(v))
    const cleaningTypeList = this.data.cleaningTypeList.map(item => ({
      ...item,
      selected: selectedIds.includes(String(item.id))
    }))
    const selectedNames = cleaningTypeList
      .filter(item => item.selected)
      .map(item => item.name)
      .join('、')
    this.setData({
      cleaningTypeList,
      selectedCleaningTypes: selectedIds,
      selectedCleaningTypeNames: selectedNames,
      'formData.cleaning_types': selectedIds
    })
    this.updateCleaningTypeOptions()
    this.validateForm()
  },

  // 更新通用选择器选项
  updateParrotOptions: function() {
    const opts = (this.data.parrotList || []).map(p => ({
      value: String(p.id),
      label: p.name,
      icon: p.thumb_url || p.photo_url || p.avatar_url || '/images/parrot-avatar-green.svg'
    }))
    this.setData({ parrotOptions: opts })
  },
  updateFeedTypeOptions: function() {
    const defaultIcon = 'https://img.icons8.com/ios-filled/96/FF7A00/restaurant.png'
    const seedIcon = 'https://img.icons8.com/3d-fluency/94/seeds.png'
    const pelletIcon = 'https://img.icons8.com/3d-fluency/94/cookies.png'
    const appleIcon = 'https://img.icons8.com/3d-fluency/94/apple.png'
    const carrotIcon = 'https://img.icons8.com/3d-fluency/94/carrot.png'
    const supplementIcon = 'https://img.icons8.com/3d-fluency/94/doctors-bag.png'
    const milkPowderIcon = 'https://img.icons8.com/3d-fluency/94/yogurt.png'
    const nutIcon = 'https://img.icons8.com/3d-fluency/94/nut.png'
    const opts = (this.data.feedTypeList || []).map(f => {
      const name = String(f.displayName || f.name || '')
      const type = String(f.type || '')
      let icon = defaultIcon
      if (type === 'seed' || name.indexOf('种子') !== -1 || name.indexOf('混合种子') !== -1) {
        icon = seedIcon
      } else if (type === 'pellet' || name.indexOf('颗粒') !== -1) {
        icon = pelletIcon
      } else if (type === 'fruit' || String(f.name || '').indexOf('苹果') !== -1) {
        icon = appleIcon
      } else if (type === 'vegetable' || String(f.name || '').indexOf('胡萝卜') !== -1) {
        icon = carrotIcon
      } else if (type === 'nut' || name.indexOf('坚果') !== -1 || name.indexOf('核桃') !== -1 || name.indexOf('杏仁') !== -1 || name.indexOf('腰果') !== -1 || name.indexOf('花生') !== -1 || name.indexOf('松子') !== -1) {
        icon = nutIcon
      } else if (type === 'supplement' || name.indexOf('保健') !== -1) {
        icon = supplementIcon
      } else if (type === 'milk_powder' || name.indexOf('奶粉') !== -1) {
        icon = milkPowderIcon
      }
      return {
        value: String(f.id),
        label: name,
        icon
      }
    })
    this.setData({ feedTypeOptions: opts })
  },
  updateCleaningTypeOptions: function() {
    const iconMap = {
      'cage': 'https://img.icons8.com/3d-fluency/96/broom.png',
      'toys': 'https://img.icons8.com/3d-fluency/96/soap.png',
      'perches': 'https://img.icons8.com/3d-fluency/94/logs.png',
      'food_water': 'https://img.icons8.com/3d-fluency/96/water.png',
      'disinfection': 'https://img.icons8.com/3d-fluency/96/spray.png',
      'bath': 'https://img.icons8.com/3d-fluency/96/bathtub.png'
    }
    const opts = (this.data.cleaningTypeList || []).map(c => ({
      value: c.id,
      label: c.name,
      icon: iconMap[c.id] || 'https://img.icons8.com/3d-fluency/96/broom.png'
    }))
    this.setData({ cleaningTypeOptions: opts })
  },

  // 新通用选择器事件：鹦鹉
  onParrotSelectorChange: function(e) {
    if (this.data.recordType === 'health') {
      const id = String(e.detail.value || '')
      const parrotList = (this.data.parrotList || []).map(p => ({ ...p, selected: String(p.id) === id }))
      const selectedParrot = parrotList.find(p => p.selected)
      this.setData({
        parrotList,
        selectedParrots: id ? [id] : [],
        selectedParrotNames: selectedParrot ? selectedParrot.name : '',
        'formData.parrot_ids': id ? [id] : [],
        showParrotModal: false
      })
    } else {
      let ids = (e.detail.values || []).map(v => String(v))
      if (this.data.recordType === 'breeding') {
        if (ids.length > 2) {
          wx.showToast({ title: '最多选择2只鹦鹉', icon: 'none' })
          ids = ids.slice(0, 2)
        }
      }
      
      const parrotList = (this.data.parrotList || []).map(p => ({ ...p, selected: ids.includes(String(p.id)) }))
      const selectedParrots = parrotList.filter(p => p.selected).map(p => ({ id: p.id, name: p.name, gender: p.gender }))
      const selectedNames = selectedParrots.map(p => p.name).join('、')
      
      this.setData({
        parrotList,
        selectedParrots,
        selectedParrotNames: selectedNames,
        'formData.parrot_ids': ids
      })
      
      // 繁殖记录：自动校验性别并赋值
      if (this.data.recordType === 'breeding') {
        this.validateBreedingParrots(selectedParrots)
      }
    }
    
    this.updateParrotOptions()
    this.validateForm()
  },

  // 校验繁殖鹦鹉性别
  validateBreedingParrots: function(selectedParrots) {
    if (selectedParrots.length !== 2) {
      this.setData({
        'formData.male_parrot_id': '',
        'formData.female_parrot_id': ''
      })
      return
    }

    const p1 = selectedParrots[0]
    const p2 = selectedParrots[1]
    
    // 获取完整鹦鹉信息以检查性别
    const fullP1 = this.data.parrotList.find(p => String(p.id) === String(p1.id))
    const fullP2 = this.data.parrotList.find(p => String(p.id) === String(p2.id))
    
    if (!fullP1 || !fullP2) return

    const g1 = fullP1.gender
    const g2 = fullP2.gender

    let maleId = ''
    let femaleId = ''
    let errorMsg = ''

    if (g1 === 'male' && g2 === 'female') {
      maleId = String(p1.id)
      femaleId = String(p2.id)
    } else if (g1 === 'female' && g2 === 'male') {
      maleId = String(p2.id)
      femaleId = String(p1.id)
    } else {
      // 性别不匹配或未知
      if (g1 === g2) {
        errorMsg = '繁殖记录需要一雄一雌'
      } else {
         // 处理未知性别的情况，尝试根据已知的性别分配
         if (g1 === 'male') {
             maleId = String(p1.id)
             if (g2 !== 'male') femaleId = String(p2.id) // 假设另一个是雌性
         } else if (g1 === 'female') {
             femaleId = String(p1.id)
             if (g2 !== 'female') maleId = String(p2.id) // 假设另一个是雄性
         } else if (g2 === 'male') {
             maleId = String(p2.id)
             if (g1 !== 'male') femaleId = String(p1.id)
         } else if (g2 === 'female') {
             femaleId = String(p2.id)
             if (g1 !== 'female') maleId = String(p1.id)
         } else {
             // 两个都未知，无法自动判定，或者暂不限制？
             // 用户要求“必须为一雌一雄”，这里严格提示
             errorMsg = '请选择一雄一雌两只鹦鹉'
         }
      }
    }

    if (errorMsg) {
       wx.showToast({ title: errorMsg, icon: 'none' })
       // 清空已选的ID，防止提交错误数据
       this.setData({
        'formData.male_parrot_id': '',
        'formData.female_parrot_id': ''
       })
    } else {
       this.setData({
        'formData.male_parrot_id': maleId,
        'formData.female_parrot_id': femaleId
       })
    }
  },

  updateBreedingParrotListsBasedOnSelection: function() {
    if (this.data.recordType !== 'breeding') return
    const selected = Array.isArray(this.data.selectedParrots) ? this.data.selectedParrots : []
    this.validateBreedingParrots(selected)
    this.validateForm()
  },

  // 新通用选择器事件：食物类型
  onFeedTypesSelectorChange: function(e) {
    const ids = (e.detail.values || []).map(v => String(v))
    let feedTypeList = (this.data.feedTypeList || []).map(f => ({ ...f, selected: ids.includes(String(f.id)) }))
    const selectedFeedTypes = feedTypeList.filter(f => f.selected).map(f => ({ id: f.id, name: f.displayName || f.name, type: f.type, unit: f.unit || 'g' }))
    const selectedFeedTypeNames = selectedFeedTypes.map(f => f.name).join('、')
    const foodAmounts = { ...(this.data.formData.food_amounts || {}) }
    const idSet = new Set(ids)
    selectedFeedTypes.forEach(f => { const k = String(f.id); if (!(k in foodAmounts)) foodAmounts[k] = '' })
    Object.keys(foodAmounts).forEach(k => { if (!idSet.has(k)) delete foodAmounts[k] })
    const amountUnit = this.getAmountUnit(selectedFeedTypes)
    this.setData({
      feedTypeList,
      selectedFeedTypes,
      selectedFeedTypeNames,
      'formData.food_types': selectedFeedTypes.map(f => String(f.id)),
      'formData.food_amounts': foodAmounts,
      amountUnit
    })
    this.updateFeedTypeOptions()
    this.validateForm()
  },

  // 新通用选择器事件：清洁类型
  onCleaningTypeSelectorChange: function(e) {
    const ids = (e.detail.values || []).map(v => String(v))
    const cleaningTypeList = (this.data.cleaningTypeList || []).map(c => ({ ...c, selected: ids.includes(String(c.id)) }))
    const selectedNames = cleaningTypeList.filter(c => c.selected).map(c => c.name).join('、')
    this.setData({
      cleaningTypeList,
      selectedCleaningTypes: ids,
      selectedCleaningTypeNames: selectedNames,
      'formData.cleaning_types': ids
    })
    this.updateCleaningTypeOptions()
    this.validateForm()
  },
  
  // 新通用选择器事件：健康状态
  onHealthStatusSelectorChange: function(e) {
    const status = e.detail.value
    if (!status) return

    const healthStatusMap = {
      'healthy': '健康',
      'sick': '生病',
      'recovering': '康复中',
      'observation': '观察中'
    }
    
    this.setData({
      healthStatusText: healthStatusMap[status] || '健康',
      'formData.health_status': status,
      showHealthStatusModal: false
    })
    this.validateForm()
  },

  // 选择雄性鹦鹉（单选） - 已移除
  // selectMaleParrot: function(e) { ... }

  // 使用原生复选框进行鹦鹉选择（多选）
  onParrotChange: function(e) {
    let selectedIds = (e.detail.value || []).map(v => String(v))
    // 繁殖记录：最多选择 2 只鹦鹉（复选框场景）
    if (this.data.recordType === 'breeding' && selectedIds.length > 2) {
      wx.showToast({ title: '最多选择2只鹦鹉', icon: 'none' })
      selectedIds = selectedIds.slice(0, 2)
    }
    const parrotList = this.data.parrotList.map(item => ({
      ...item,
      selected: selectedIds.includes(String(item.id))
    }))
    
    // 构建选中鹦鹉对象数组
    const selectedParrotsObj = parrotList
      .filter(item => item.selected)
      .map(item => ({ id: item.id, name: item.name, gender: item.gender }))
      
    const selectedNames = selectedParrotsObj
      .map(item => item.name)
      .join('、')
      
    this.setData({
      parrotList,
      selectedParrots: selectedParrotsObj,
      selectedParrotNames: selectedNames,
      'formData.parrot_ids': selectedIds
    })
    
    // 繁殖记录：自动校验性别并赋值
    if (this.data.recordType === 'breeding' && selectedParrotsObj.length === 2) {
      this.validateBreedingParrots(selectedParrotsObj)
    } else if (this.data.recordType === 'breeding') {
       // 如果不是选了2只，清空繁殖相关ID
       this.setData({
         'formData.male_parrot_id': '',
         'formData.female_parrot_id': ''
       })
    }
    
    this.updateParrotOptions()
    this.validateForm()
  },

  // 使用原生单选框进行鹦鹉选择（仅健康检查）
  onParrotRadioChange: function(e) {
    const selectedId = String(e.detail.value || '')
    const parrotList = this.data.parrotList.map(item => ({
      ...item,
      selected: String(item.id) === selectedId
    }))
    const selectedParrot = parrotList.find(item => item.selected)
    this.setData({
      parrotList,
      selectedParrots: selectedId ? [selectedId] : [],
      selectedParrotNames: selectedParrot ? selectedParrot.name : '',
      'formData.parrot_ids': selectedId ? [selectedId] : [],
      showParrotModal: false
    })
    this.updateParrotOptions()
    this.validateForm()
  },
  // 选择雌性鹦鹉（单选） - 已移除
  // selectFemaleParrot: function(e) { ... }
  
  // 显示数字键盘
  showKeyboard: function(e) {
    const { field, title, type, id } = e.currentTarget.dataset
    let value = ''
    
    // 根据字段获取当前值
    if (field === 'food_amounts' && id) {
      value = (this.data.formData.food_amounts && this.data.formData.food_amounts[id]) || ''
    } else {
      value = this.data.formData[field] || ''
    }

    // 设置最大长度和小数位
    let maxLength = 10
    let maxDecimals = 2
    if (type === 'integer') {
      maxDecimals = 0
    }

    this.setData({
      keyboardVisible: true,
      keyboardValue: String(value),
      keyboardTitle: title || '请输入数值',
      currentField: field,
      currentExtraData: id ? { id } : null,
      keyboardMaxLength: maxLength,
      keyboardMaxDecimals: maxDecimals
    })
  },

  // 键盘输入
  onKeyboardInput: function(e) {
    const value = e.detail.value
    const field = this.data.currentField
    const extraData = this.data.currentExtraData
    
    // 更新表单数据
    if (field === 'food_amounts' && extraData && extraData.id) {
       const idStr = String(extraData.id)
       const foodAmounts = { ...(this.data.formData.food_amounts || {}) }
       foodAmounts[idStr] = value
       this.setData({ 
         'formData.food_amounts': foodAmounts,
         keyboardValue: value // 同步更新键盘显示值
       })
    } else {
      this.setData({
        [`formData.${field}`]: value,
        keyboardValue: value // 同步更新键盘显示值
      })
    }
    
    // 触发校验
    this.validateForm()
  },

  // 键盘确认
  onKeyboardConfirm: function() {
    this.setData({
      keyboardVisible: false
    })
    
    const field = this.data.currentField
    
    if (field === 'weight') {
        const val = this.data.formData.weight
        const num = Number(val)
        if (val && (!isFinite(num) || num <= 0 || num >= 1000)) {
            wx.showToast({ title: '体重需在 0–999.99 g', icon: 'none' })
        }
    }
  },

  // 键盘关闭
  onKeyboardClose: function() {
    this.setData({
      keyboardVisible: false
    })
  },

  onKeyboardSave: function() {
    this.setData({ keyboardVisible: false })
    this.submitForm()
  },
  
  // 输入框变更
  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    // 体重输入：限制格式与范围提示
    if (field === 'weight') {
      value = String(value || '').replace(/[^\d.]/g, '')
      const parts = value.split('.')
      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
      if (parts[1] && parts[1].length > 2) value = parts[0] + '.' + parts[1].substring(0, 2)
      const num = Number(value)
      if (value && (!isFinite(num) || num <= 0 || num >= 1000)) {
        wx.showToast({ title: '体重需在 0–999.99 g', icon: 'none' })
      }
    }
    this.setData({ [`formData.${field}`]: value })
    this.validateForm()
  },

  // 日期选择器变更
  onDateChange: function(e) {
    const val = e.detail.value
    this.setData({ 'formData.record_date': val })
    this.validateForm()
  },

  // 时间选择器变更
  onTimeChange: function(e) {
    this.setData({ 'formData.record_time': e.detail.value })
    this.validateForm()
  },

  // 交配日期选择器变更
  onMatingDateChange: function(e) {
    const val = e.detail.value
    this.setData({
      'formData.mating_date': val
    })
    this.validateForm()
  },

  // 产蛋日期选择器变更
  onEggLayingDateChange: function(e) {
    this.setData({
      'formData.egg_laying_date': e.detail.value
    })
    this.validateForm()
  },

  // 孵化日期选择器变更
  onHatchingDateChange: function(e) {
    this.setData({
      'formData.hatching_date': e.detail.value
    })
    this.validateForm()
  },
  
  // 选择照片
  choosePhoto: function() {
    const current = this.data.formData.photos.length
    const remaining = Math.max(0, 3 - current)
    if (remaining === 0) return
    const tier = String(getApp().getEffectiveTier() || '').toLowerCase()
    const isPro = tier === 'pro' || tier === 'team'
    wx.chooseImage({
      count: remaining,
      sizeType: isPro ? ['original', 'compressed'] : ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPhotos = (res.tempFilePaths || [])
        const photos = this.data.formData.photos.concat(newPhotos).slice(0, 3)
        this.setData({ 'formData.photos': photos })
        // 选择图片后立即保存草稿（防止意外退出丢失）
        this.autoSaveDraft()
      }
    })
  },
  // 根据记录类型解析上传分类
  resolveUploadCategory: function(type) {
    switch (type) {
      case 'feeding': return 'records/feeding'
      case 'cleaning': return 'records/cleaning'
      case 'health': return 'records/health'
      case 'breeding': return 'records/breeding'
      default: return 'records/others'
    }
  },
  // 如有必要，上传记录照片并返回完整URL数组
  uploadRecordPhotosIfNeeded: async function(recordType, photos) {
    const category = this.resolveUploadCategory(recordType)
    const resultUrls = []
    for (const p of (photos || [])) {
      const isFull = typeof p === 'string' && (p.startsWith('http') || p.includes('/uploads/'))
      if (isFull) {
        resultUrls.push(p)
        continue
      }
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.baseUrl + '/api/upload/image',
          filePath: p,
          name: 'file',
          formData: { category },
          header: { 'X-OpenID': app.globalData.openid },
          success: resolve,
          fail: reject
        })
      })
      const data = JSON.parse(uploadRes.data)
      if (data && data.success && data.data && data.data.url) {
        const fullUrl = app.globalData.baseUrl + '/uploads/' + data.data.url
        resultUrls.push(fullUrl)
      } else {
        throw new Error((data && data.message) || '图片上传失败')
      }
    }
    return resultUrls
  },
  deletePhoto: function(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.formData.photos.slice()
    photos.splice(index, 1)
    this.setData({ 'formData.photos': photos })
  },
  previewPhoto: function(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.formData.photos
    })
  },
  
  goBack: function() {
    try {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        if (prevPage && typeof prevPage.refreshData === 'function') {
          prevPage.refreshData()
        }
        wx.navigateBack({ delta: 1 })
        return
      }
      const type = this.data && this.data.recordType ? this.data.recordType : 'feeding'
      const map = {
        feeding: '/pages/records/feeding/feeding',
        cleaning: '/pages/records/cleaning/cleaning',
        health: '/pages/records/health/health',
        breeding: '/pages/records/breeding/breeding'
      }
      const url = map[type] || '/pages/records/feeding/feeding'
      if (wx.reLaunch) wx.reLaunch({ url })
      else wx.redirectTo({ url })
    } catch (_) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // ===== 离线草稿：保存 / 恢复 / 清除 =====
  // 根据当前记录类型、团队与用户构造唯一草稿键
  draftStorageKey: function() {
    const teamId = app.globalData.teamId || 'default-team'
    const userId = app.globalData.userInfo ? app.globalData.userInfo.id : 'anon'
    const type = this.data.recordType
    const idPart = this.data.recordId ? `edit-${this.data.recordId}` : 'new'
    return `draft:${teamId}:${userId}:${type}:${idPart}`
  },
  // 自动保存草稿（防抖）
  autoSaveDraft: function() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer)
    this._autoSaveTimer = setTimeout(() => {
      this.saveDraft()
    }, 400)
  },
  // 保存草稿到本地存储
  saveDraft: function() {
    try {
      const key = this.draftStorageKey()
      const payload = {
        recordType: this.data.recordType,
        formData: this.data.formData,
        selectedParrots: this.data.selectedParrots,
        selectedParrotNames: this.data.selectedParrotNames,
        selectedFeedTypes: this.data.selectedFeedTypes,
        selectedFeedTypeNames: this.data.selectedFeedTypeNames,
        selectedCleaningTypes: this.data.selectedCleaningTypes,
        selectedCleaningTypeNames: this.data.selectedCleaningTypeNames,
        selectedMaleParrotName: this.data.selectedMaleParrotName,
        selectedFemaleParrotName: this.data.selectedFemaleParrotName,
        healthStatusText: this.data.healthStatusText,
        today: this.data.today,
        recordId: this.data.recordId
      }
      wx.setStorageSync(key, payload)
    } catch (e) {
      // 忽略存储异常
    }
  },
  // 页面初始化时尝试恢复草稿
  restoreDraftIfAny: function() {
    try {
      const key = this.draftStorageKey()
      const cached = wx.getStorageSync(key)
      if (cached && cached.formData) {
        const sameRecord = (!this.data.recordId && !cached.recordId) || (this.data.recordId && cached.recordId === this.data.recordId)
        if (sameRecord) {
          const existingFD = this.data.formData || {}
          const mergedFD = { ...existingFD, ...cached.formData }
          if (!this.data.recordId) {
            mergedFD.record_date = this.data.today || existingFD.record_date || ''
            const d = new Date()
            const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
            mergedFD.record_time = hm
          } else {
            if (!mergedFD.record_date) mergedFD.record_date = this.data.today || existingFD.record_date || ''
            if (!mergedFD.record_time) {
              const d = new Date()
              const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
              mergedFD.record_time = existingFD.record_time || hm
            }
          }
          this.setData({
            recordType: cached.recordType || this.data.recordType,
            formData: mergedFD,
            selectedParrots: cached.selectedParrots || [],
            selectedParrotNames: cached.selectedParrotNames || '',
            selectedFeedTypes: cached.selectedFeedTypes || [],
            selectedFeedTypeNames: cached.selectedFeedTypeNames || '',
            selectedCleaningTypes: cached.selectedCleaningTypes || [],
            selectedCleaningTypeNames: cached.selectedCleaningTypeNames || '',
            selectedMaleParrotName: cached.selectedMaleParrotName || '',
            selectedFemaleParrotName: cached.selectedFemaleParrotName || '',
            healthStatusText: cached.healthStatusText || this.data.healthStatusText
          })
          this.validateForm()
        }
      }
    } catch (e) {
      // 忽略读取异常
    }
  },
  // 提交成功或用户主动返回时清理草稿
  clearDraft: function() {
    try {
      const key = this.draftStorageKey()
      wx.removeStorageSync(key)
    } catch (e) { /* noop */ }
  },
  
  // 校验表单是否可提交
  validateForm: function() {
    const { recordType, formData } = this.data
    let ok = true
    if (!formData.record_date || !formData.record_time) ok = false
    switch (recordType) {
      case 'feeding': {
        const hasParrots = formData.parrot_ids && formData.parrot_ids.length > 0
        const ids = formData.food_types || []
        if (!hasParrots || ids.length === 0) { ok = false; break }
        if (ids.length <= 1) {
          ok = ok && !!String(formData.amount || '').trim()
        } else {
          // 多食物类型：逐项必须填写分量
          const map = formData.food_amounts || {}
          const allFilled = ids.map(id => String(id)).every(id => !!String(map[id] || '').trim())
          ok = ok && allFilled
        }
        break
      }
      case 'cleaning':
        ok = ok && formData.parrot_ids && formData.parrot_ids.length > 0 && formData.cleaning_types && formData.cleaning_types.length > 0
        break
      case 'health':
        ok = ok && formData.parrot_ids && formData.parrot_ids.length > 0
        // 体重范围校验（如填写）
        if (ok) {
          const s = String(formData.weight || '').trim()
          if (s) {
            const n = Number(s)
            if (!isFinite(n) || n <= 0 || n >= 1000) {
              ok = false
            }
          }
        }
        break
      case 'breeding':
        ok = ok && !!formData.male_parrot_id && !!formData.female_parrot_id && !!formData.mating_date
        break
      default:
        ok = false
    }
    // 确保ok是布尔值，避免undefined
    ok = Boolean(ok)
    this.setData({ canSubmit: ok })
    // 每次校验后自动保存当前草稿
    this.autoSaveDraft()
  },
  
  // 提交表单
  submitForm: async function() {
    if (!this.data.canSubmit || this.data.submitting) return
    this.setData({ submitting: true })
    // 无网络：按类型构造离线队列项（含本地照片），网络恢复后自动上传并提交
    if (!app.globalData.networkConnected) {
      try {
        const { recordType, formData, recordId, prefillRecordIds } = this.data
        const timeStr = `${formData.record_date} ${formData.record_time}:00`
        const localPhotos = (formData.photos || []).slice(0, 3)
        const baseCommon = { notes: formData.notes }
        const enqueue = (item) => app.enqueueFormRecord(item)
        if (recordType === 'feeding') {
          if (recordId) {
            const multiFood = (formData.food_types || []).length > 1 || Object.keys(formData.food_amounts || {}).length > 1
            const hasBatchIds = Array.isArray(prefillRecordIds) && prefillRecordIds.length > 1
            if (hasBatchIds && !multiFood) {
              for (const id of prefillRecordIds) {
                enqueue({
                  url: `/api/records/${id}`,
                  method: 'PUT',
                  data: { ...baseCommon, type: 'feeding', feeding_time: timeStr, parrot_ids: formData.parrot_ids, feed_type_id: formData.food_types[0] || '', amount: formData.amount },
                  localPhotos,
                  category: 'records/feeding'
                })
              }
            } else if (multiFood) {
              enqueue({
                url: '/api/records/feeding/upsert-by-time',
                method: 'PUT',
                data: { ...baseCommon, feeding_time: timeStr, parrot_ids: formData.parrot_ids, food_types: formData.food_types, food_amounts: formData.food_amounts, amount: (formData.food_types || []).length <= 1 ? formData.amount : undefined },
                localPhotos,
                category: 'records/feeding'
              })
            } else {
              enqueue({
                url: `/api/records/${recordId}`,
                method: 'PUT',
                data: { ...baseCommon, type: 'feeding', feeding_time: timeStr, parrot_ids: formData.parrot_ids, feed_type_id: formData.food_types[0] || '', amount: formData.amount },
                localPhotos,
                category: 'records/feeding'
              })
            }
          } else {
            enqueue({
              url: '/api/records',
              method: 'POST',
              data: { ...baseCommon, type: 'feeding', feeding_time: timeStr, parrot_ids: formData.parrot_ids, food_types: formData.food_types, food_amounts: formData.food_amounts, amount: (formData.food_types || []).length <= 1 ? formData.amount : undefined },
              localPhotos,
              category: 'records/feeding'
            })
          }
        } else if (recordType === 'cleaning') {
          if (recordId) {
            const hasBatchIds = Array.isArray(prefillRecordIds) && prefillRecordIds.length > 1
            const effectiveCleaningTypes = (Array.isArray(formData.cleaning_types) && formData.cleaning_types.length > 0)
              ? formData.cleaning_types
              : (this.data.prefillCleaningTypeIds || [])
            if (hasBatchIds) {
              enqueue({
                url: '/api/records/cleaning/batch-update',
                method: 'PUT',
                data: { ...baseCommon, record_ids: prefillRecordIds, record_time: timeStr, parrot_ids: formData.parrot_ids, cleaning_types: effectiveCleaningTypes, description: formData.description },
                localPhotos,
                category: 'records/cleaning'
              })
            } else {
              enqueue({
                url: `/api/records/${recordId}`,
                method: 'PUT',
                data: { ...baseCommon, type: 'cleaning', cleaning_time: timeStr, parrot_ids: formData.parrot_ids, cleaning_types: effectiveCleaningTypes, description: formData.description },
                localPhotos,
                category: 'records/cleaning'
              })
            }
          } else {
            enqueue({
              url: '/api/records',
              method: 'POST',
              data: { ...baseCommon, type: 'cleaning', cleaning_time: timeStr, parrot_ids: formData.parrot_ids, cleaning_types: formData.cleaning_types || [], description: formData.description },
              localPhotos,
              category: 'records/cleaning'
            })
          }
        } else if (recordType === 'health') {
          const isEdit = !!recordId
          const url = isEdit ? `/api/records/${recordId}` : '/api/records'
          const method = isEdit ? 'PUT' : 'POST'
          const toNumberOrNull = (v) => { const s = String(v || '').trim(); if (!s) return null; const n = Number(s); return isNaN(n) ? null : n }
          const commonHealth = { ...baseCommon, type: 'health', weight: toNumberOrNull(formData.weight), health_status: formData.health_status }
          const dataPayload = isEdit ? { ...commonHealth, record_date: timeStr } : { ...commonHealth, record_date: timeStr, parrot_ids: (formData.parrot_ids || []).map(id => Number(id)) }
          enqueue({ url, method, data: dataPayload, localPhotos, category: 'records/health' })
        } else if (recordType === 'breeding') {
          const isEdit = !!recordId
          const url = isEdit ? `/api/records/${recordId}` : '/api/records'
          const method = isEdit ? 'PUT' : 'POST'
          const dataPayload = { ...baseCommon, type: 'breeding', record_time: timeStr, male_parrot_id: formData.male_parrot_id, female_parrot_id: formData.female_parrot_id, mating_date: formData.mating_date, egg_laying_date: formData.egg_laying_date, egg_count: formData.egg_count, hatching_date: formData.hatching_date, chick_count: formData.chick_count, success_rate: formData.success_rate }
          enqueue({ url, method, data: dataPayload, localPhotos, category: 'records/breeding' })
        }
        app.showSuccess('已离线保存，将自动提交')
        this.clearDraft()
        this.setData({ submitting: false })
        this.goBack()
      } catch (e) {
        app.showError('缓存失败，请稍后重试')
        this.setData({ submitting: false })
      }
      return
    }
    
    try {
      const { recordType, formData, recordId, prefillRecordIds } = this.data
      const timeStr = `${formData.record_date} ${formData.record_time}:00`
      // 先上传照片并获取完整URL
      let uploadedPhotoUrls = []
      if (formData.photos && formData.photos.length > 0) {
        app.showLoading('上传照片...')
        try {
          uploadedPhotoUrls = await this.uploadRecordPhotosIfNeeded(recordType, formData.photos)
        } catch (e) {
          console.error('记录照片上传失败:', e)
          app.showError(e.message || '记录照片上传失败')
          this.setData({ submitting: false })
          app.hideLoading()
          return
        }
        app.hideLoading()
      }
      const baseCommon = {
        notes: formData.notes,
        photos: uploadedPhotoUrls
      }
      
      // 喂食记录：新增按食物类型拆分提交；编辑支持批量更新
      if (recordType === 'feeding') {
        if (recordId) {
          const multiFood = (formData.food_types || []).length > 1 || Object.keys(formData.food_amounts || {}).length > 1
          const hasBatchIds = Array.isArray(prefillRecordIds) && prefillRecordIds.length > 1
          
          if (hasBatchIds && !multiFood) {
            // 聚合编辑：对同一时间、同一食物类型的多只鹦鹉记录批量更新
            const payload = {
              ...baseCommon,
              type: 'feeding',
              feeding_time: timeStr,
              parrot_ids: formData.parrot_ids,
              feed_type_id: formData.food_types[0] || '',
              amount: formData.amount
            }
            for (const id of prefillRecordIds) {
              const res = await app.request({ url: `/api/records/${id}`, method: 'PUT', data: payload })
              if (!res.success) throw new Error(res.message || `保存失败：${id}`)
            }
          } else if (multiFood) {
            // 多食物类型或多分量：使用按时间批量更新（重建对应记录集）
            const url = '/api/records/feeding/upsert-by-time'
            const method = 'PUT'
            const payload = {
              ...baseCommon,
              feeding_time: timeStr,
              parrot_ids: formData.parrot_ids,
              food_types: formData.food_types,
              food_amounts: formData.food_amounts,
              amount: (formData.food_types || []).length <= 1 ? formData.amount : undefined
            }
            const res = await app.request({ url, method, data: payload })
            if (!res.success) throw new Error(res.message || '保存失败')
          } else {
            // 单条更新保持原有接口
            const url = `/api/records/${recordId}`
            const method = 'PUT'
            const payload = {
              ...baseCommon,
              type: 'feeding',
              feeding_time: timeStr,
              parrot_ids: formData.parrot_ids,
              feed_type_id: formData.food_types[0] || '',
              amount: formData.amount
            }
            const res = await app.request({ url, method, data: payload })
            if (!res.success) throw new Error(res.message || '保存失败')
          }
        } else {
          // 新增：批量提交多食物类型+多分量
          const url = '/api/records'
          const method = 'POST'
          const payload = {
            ...baseCommon,
            type: 'feeding',
            feeding_time: timeStr,
            parrot_ids: formData.parrot_ids,
            food_types: formData.food_types,
            food_amounts: formData.food_amounts,
            amount: (formData.food_types || []).length <= 1 ? formData.amount : undefined
          }
          const res = await app.request({ url, method, data: payload })
          if (!res.success) throw new Error(res.message || '保存失败')
        }
      } else if (recordType === 'cleaning') {
        if (recordId) {
          // 编辑模式：检查是否有多个记录ID需要处理
          const hasBatchIds = Array.isArray(prefillRecordIds) && prefillRecordIds.length > 1
          // 为清洁类型计算有效值：若用户未更改，则沿用预填类型
          const effectiveCleaningTypes = (Array.isArray(formData.cleaning_types) && formData.cleaning_types.length > 0)
            ? formData.cleaning_types
            : (this.data.prefillCleaningTypeIds || [])
          
          if (hasBatchIds) {
            // 聚合编辑：需要处理多个记录ID的情况
            // 使用批量更新接口，删除旧记录并创建新记录
            const url = '/api/records/cleaning/batch-update'
            const method = 'PUT'
            const payload = {
              ...baseCommon,
              record_ids: prefillRecordIds, // 传递所有相关记录ID
              record_time: timeStr,
              parrot_ids: formData.parrot_ids,
              cleaning_types: effectiveCleaningTypes,
              description: formData.description
            }
            const res = await app.request({ url, method, data: payload })
            if (!res.success) throw new Error(res.message || '保存失败')
          } else {
            // 单条记录编辑
            const url = `/api/records/${recordId}`
            const method = 'PUT'
            const payload = {
              ...baseCommon,
              type: 'cleaning',
              cleaning_time: timeStr,
              parrot_ids: formData.parrot_ids,
              cleaning_types: effectiveCleaningTypes,
              description: formData.description
            }
            const res = await app.request({ url, method, data: payload })
            if (!res.success) throw new Error(res.message || '保存失败')
          }
        } else {
          // 新增模式
          const url = '/api/records'
          const method = 'POST'
          const payload = {
            ...baseCommon,
            type: 'cleaning',
            cleaning_time: timeStr,
            parrot_ids: formData.parrot_ids,
            cleaning_types: formData.cleaning_types || [],
            description: formData.description
          }
          const res = await app.request({ url, method, data: payload })
          if (!res.success) throw new Error(res.message || '保存失败')
        }
      } else if (recordType === 'health') {
        const isEdit = !!recordId
        const url = isEdit ? `/api/records/${recordId}` : '/api/records'
        const method = isEdit ? 'PUT' : 'POST'
        // 体重前置校验，避免后端报错
        const sWeight = String(formData.weight || '').trim()
        if (sWeight) {
          const n = Number(sWeight)
          if (!isFinite(n) || n <= 0 || n >= 1000) {
            app.showError('体重需在 0–999.99 g 范围内')
            this.setData({ submitting: false })
            return
          }
        }
        // 将空字符串转换为 null，并解析为数字
        const toNumberOrNull = (v) => {
          const s = String(v || '').trim()
          if (!s) return null
          const n = Number(s)
          return isNaN(n) ? null : n
        }
        const commonHealth = {
          ...baseCommon,
          type: 'health',
          weight: toNumberOrNull(formData.weight),
          health_status: formData.health_status
        }
        // 后端 health 新增接口期望 parrot_ids 列表，record_date 为 YYYY-MM-DD
        // 编辑接口期望 record_date 为 YYYY-MM-DD HH:MM:SS，不支持修改鹦鹉
        const payload = isEdit
          ? { ...commonHealth, record_date: timeStr }
          : { ...commonHealth, record_date: timeStr, parrot_ids: (formData.parrot_ids || []).map(id => Number(id)) }
        const res = await app.request({ url, method, data: payload })
        if (!res.success) throw new Error(res.message || '保存失败')
      } else if (recordType === 'breeding') {
        const isEdit = !!recordId
        const url = isEdit ? `/api/records/${recordId}` : '/api/records'
        const method = isEdit ? 'PUT' : 'POST'
        const payload = {
          ...baseCommon,
          type: 'breeding',
          // 将记录时间传递给后端，用于设置/更新 created_at
          record_time: timeStr,
          male_parrot_id: formData.male_parrot_id,
          female_parrot_id: formData.female_parrot_id,
          mating_date: formData.mating_date,
          egg_laying_date: formData.egg_laying_date,
          egg_count: formData.egg_count,
          hatching_date: formData.hatching_date,
          chick_count: formData.chick_count,
          success_rate: formData.success_rate
        }
        const res = await app.request({ url, method, data: payload })
        if (!res.success) throw new Error(res.message || '保存失败')
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      // 成功后清除草稿
      this.clearDraft()
      
      // 添加通知
      const notificationManager = app.globalData.notificationManager;
      if (notificationManager && !recordId) { // 只在新增记录时添加通知
        const parrotNames = this.data.parrotList
          .filter(p => formData.parrot_ids.includes(p.id))
          .map(p => p.name)
          .join('、');
        
        if (recordType === 'feeding') {
          notificationManager.addFeedingNotification(parrotNames, timeStr);
        } else if (recordType === 'health') {
          notificationManager.addHealthNotification(parrotNames, timeStr);
        } else if (recordType === 'cleaning') {
          notificationManager.addCleaningNotification(parrotNames, timeStr);
        } else if (recordType === 'breeding') {
          const maleParrotName = this.data.maleParrotList.find(p => p.id === formData.male_parrot_id)?.name || '';
          const femaleParrotName = this.data.femaleParrotList.find(p => p.id === formData.female_parrot_id)?.name || '';
          const breedingParrotNames = [maleParrotName, femaleParrotName].filter(name => name).join(' × ');
          notificationManager.addBreedingNotification(breedingParrotNames, timeStr);
        }
      }
      
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage && typeof prevPage.refreshData === 'function') {
        prevPage.refreshData()
      }
      const cameFromParrots = !!(prevPage && (prevPage.route === 'pages/parrots/parrots'))
      if (cameFromParrots) {
        const type = this.data.recordType
        const map = {
          feeding: '/pages/records/feeding/feeding',
          cleaning: '/pages/records/cleaning/cleaning',
          health: '/pages/records/health/health',
          breeding: '/pages/records/breeding/breeding'
        }
        const url = map[type] || '/pages/records/feeding/feeding'
        wx.redirectTo({ url })
      } else {
        setTimeout(() => { wx.navigateBack({ delta: 1 }) }, 300)
      }
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
  
  })
