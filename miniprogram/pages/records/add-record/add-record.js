// pages/records/add-record/add-record.js
const app = getApp()

  Page({
    data: {
    // 记录类型
    recordType: 'feeding',
    
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
    maleParrotList: [],
    femaleParrotList: [],
    selectedParrots: [], // 改为数组存储多选的鹦鹉
    selectedParrotNames: '', // 显示选中的鹦鹉名称
    selectedMaleParrotName: '',
    selectedFemaleParrotName: '',
    healthStatusText: '健康',
    feedTypeList: [],
    selectedFeedTypes: [], // 改为数组存储多选的食物类型
    selectedFeedTypeNames: '', // 显示选中的食物类型名称
    cleaningTypeList: [], // 清洁类型列表
    selectedCleaningTypes: [], // 改为数组存储多选的清洁类型
    selectedCleaningTypeNames: '', // 显示选中的清洁类型名称
    
    // 弹窗状态
    showParrotModal: false,
    showMaleParrotModal: false,
    showFemaleParrotModal: false,
      showHealthStatusModal: false,
      // 统一右侧勾选PNG图标路径（占位：待替换为 checkbox-circle-fill）
      checkIconSrc: '/images/remix/checkbox-circle-fill.png',
    showFeedTypeModal: false,
    showCleaningTypeModal: false,
    
    // 表单状态
    canSubmit: false,
    submitting: false,
    
    // 其他
      today: '',
      recordId: null // 编辑模式下的记录ID
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
    
    // 检查是否是编辑模式
    const incomingType = options.type || this.data.recordType
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
          return { ...p, photo_url: photoUrl, avatar_url: avatarUrl }
        })
        
        // 过滤雄性鹦鹉（包括性别未知的）
        const maleParrots = allParrots.filter(parrot => 
          parrot.gender === 'male' || parrot.gender === 'unknown' || !parrot.gender
        )
        
        // 过滤雌性鹦鹉（包括性别未知的）
        const femaleParrots = allParrots.filter(parrot => 
          parrot.gender === 'female' || parrot.gender === 'unknown' || !parrot.gender
        )
        
        // 应用预填鹦鹉ID到选择状态
        const { prefillParrotIds } = this.data
        const selectedParrots = []
        const parrotIdsApplied = prefillParrotIds && prefillParrotIds.length ? prefillParrotIds.slice() : this.data.formData.parrot_ids
        const parrotListWithSelection = allParrots.map(p => {
          const selected = parrotIdsApplied.includes(p.id)
          if (selected) selectedParrots.push({ id: p.id, name: p.name })
          return { ...p, selected }
        })
        const selectedParrotNames = selectedParrots.map(p => p.name).join('、')
        
        this.setData({
          parrotList: parrotListWithSelection,
          maleParrotList: maleParrots,
          femaleParrotList: femaleParrots,
          selectedParrots,
          selectedParrotNames,
          'formData.parrot_ids': parrotIdsApplied
        })
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
            displayName
          }
        })
        
        // 应用预填食物类型ID到选择状态
        const { prefillFeedTypeIds } = this.data
        const selectedFeedTypes = []
        const feedTypeIdsApplied = prefillFeedTypeIds && prefillFeedTypeIds.length ? prefillFeedTypeIds.slice() : this.data.formData.food_types
        const feedTypeListWithSelection = feedTypeList.map(f => {
          const selected = feedTypeIdsApplied.includes(f.id)
          if (selected) selectedFeedTypes.push({ id: f.id, name: f.displayName })
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
        
        this.setData({
          feedTypeList: feedTypeListWithSelection,
          selectedFeedTypes,
          selectedFeedTypeNames,
          'formData.food_types': feedTypeIdsApplied,
          'formData.food_amounts': foodAmounts
        })
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
      { id: 'disinfection', name: '消毒', selected: false }
    ]
    this.setData({
      cleaningTypeList: cleaningTypes
    })
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
        
        // 解析记录时间
        const recordTime = new Date(record.record_time)
        const dateStr = recordTime.getFullYear() + '-' + 
                       String(recordTime.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(recordTime.getDate()).padStart(2, '0')
        const timeStr = String(recordTime.getHours()).padStart(2, '0') + ':' + 
                       String(recordTime.getMinutes()).padStart(2, '0')
        
        // 根据记录类型设置表单数据
        let formData = {
          parrot_ids: parrotId ? [parseInt(parrotId)] : [],
          record_date: dateStr,
          record_time: timeStr,
          notes: record.notes || '',
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
          description: record.description || '',
          
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
        
        // 生成选中名称
        const selectedParrots = this.data.parrotList.filter(p => formData.parrot_ids.includes(p.id)).map(p => ({ id: p.id, name: p.name }))
        const selectedParrotNames = selectedParrots.map(p => p.name).join('、')
        const selectedFeedTypes = this.data.feedTypeList.filter(f => formData.food_types.includes(f.id)).map(f => ({ id: f.id, name: f.displayName || f.name }))
        const selectedFeedTypeNames = selectedFeedTypes.map(f => f.name).join('、')
        
        // 同步列表项的选中状态，确保弹窗内显示勾选
        const parrotListSynced = this.data.parrotList.map(p => ({ ...p, selected: formData.parrot_ids.includes(p.id) }))
        const feedTypeListSynced = this.data.feedTypeList.map(f => ({ ...f, selected: formData.food_types.includes(f.id) }))
        
        // 查找雄性和雌性鹦鹉名称（繁殖记录）
        let selectedMaleParrotName = ''
        let selectedFemaleParrotName = ''
        if (record.male_parrot) {
          selectedMaleParrotName = record.male_parrot.name
        } else if (maleParrotId) {
          const maleParrot = this.data.maleParrotList.find(p => p.id === parseInt(maleParrotId))
          if (maleParrot) selectedMaleParrotName = maleParrot.name
        }
        if (record.female_parrot) {
          selectedFemaleParrotName = record.female_parrot.name
        } else if (femaleParrotId) {
          const femaleParrot = this.data.femaleParrotList.find(p => p.id === parseInt(femaleParrotId))
          if (femaleParrot) selectedFemaleParrotName = femaleParrot.name
        }
        
        // 同步雄性和雌性鹦鹉列表的选中状态
        const maleParrotListSynced = this.data.maleParrotList.map(p => ({
          ...p,
          selected: p.id === parseInt(maleParrotId)
        }))
        const femaleParrotListSynced = this.data.femaleParrotList.map(p => ({
          ...p,
          selected: p.id === parseInt(femaleParrotId)
        }))
        
        // 清洁类型处理（支持多选）
        const cleaningTypeTextMap = {
          cage: '笼子清洁',
          toys: '玩具清洁',
          perches: '栖木清洁',
          food_water: '食物和水清洁',
          disinfection: '消毒',
          water_change: '饮用水更换',
          water_bowl_clean: '水碗清洁'
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
        
        this.setData({
          formData,
          selectedParrots,
          selectedParrotNames,
          selectedFeedTypes,
          selectedFeedTypeNames,
          selectedCleaningTypes,
          selectedCleaningTypeNames,
          selectedMaleParrotName,
          selectedFemaleParrotName,
          healthStatusText: healthStatusMap[record.health_status] || '健康',
          parrotList: parrotListSynced,
          feedTypeList: feedTypeListSynced,
          cleaningTypeList: cleaningTypeListSynced,
          maleParrotList: maleParrotListSynced,
          femaleParrotList: femaleParrotListSynced
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

  selectType: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ recordType: type })
    this.validateForm()
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
  showMaleParrotPicker: function() { this.setData({ showMaleParrotModal: true }) },
  hideMaleParrotPicker: function() { this.setData({ showMaleParrotModal: false }) },
  showFemaleParrotPicker: function() { this.setData({ showFemaleParrotModal: true }) },
  hideFemaleParrotPicker: function() { this.setData({ showFemaleParrotModal: false }) },
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
        selectedParrots.push({ id, name })
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
    this.setData({
      showParrotModal: false
    })
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
      selectedFeedTypes.push({ id, name })
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
    
    this.setData({
      selectedFeedTypes,
      feedTypeList,
      selectedFeedTypeNames,
      'formData.food_types': selectedFeedTypes.map(f => f.id),
      'formData.food_amounts': foodAmounts
    })
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
    this.validateForm()
  },
  
  // 选择健康状态（单选）
  selectHealthStatus: function(e) {
    const status = e.currentTarget.dataset.status
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
  
  // 使用原生单选框进行健康状态选择（单选）
  onHealthStatusChange: function(e) {
    const status = e.detail.value || 'healthy'
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
  
  // 选择雄性鹦鹉（单选）
  selectMaleParrot: function(e) {
    const { id } = e.currentTarget.dataset
    const parrot = this.data.maleParrotList.find(p => p.id === id)
    this.setData({
      selectedMaleParrotName: parrot ? parrot.name : '',
      'formData.male_parrot_id': id,
      showMaleParrotModal: false
    })
    this.hideMaleParrotPicker()
    this.validateForm()
  },

  // 使用原生复选框进行鹦鹉选择（多选）
  onParrotChange: function(e) {
    const selectedIds = (e.detail.value || []).map(v => String(v))
    const parrotList = this.data.parrotList.map(item => ({
      ...item,
      selected: selectedIds.includes(String(item.id))
    }))
    const selectedNames = parrotList
      .filter(item => item.selected)
      .map(item => item.name)
      .join('、')
    this.setData({
      parrotList,
      selectedParrots: selectedIds,
      selectedParrotNames: selectedNames,
      'formData.parrot_ids': selectedIds
    })
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
    this.validateForm()
  },
  // 选择雌性鹦鹉（单选）
  selectFemaleParrot: function(e) {
    const { id } = e.currentTarget.dataset
    const parrot = this.data.femaleParrotList.find(p => p.id === id)
    this.setData({
      selectedFemaleParrotName: parrot ? parrot.name : '',
      'formData.female_parrot_id': id,
      showFemaleParrotModal: false
    })
    this.hideFemaleParrotPicker()
    this.validateForm()
  },
  
  // 输入框变更
  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.${field}`]: value
    })
    this.validateForm()
  },

  // 日期选择器变更
  onDateChange: function(e) {
    this.setData({
      'formData.record_date': e.detail.value
    })
    this.validateForm()
  },

  // 时间选择器变更
  onTimeChange: function(e) {
    this.setData({
      'formData.record_time': e.detail.value
    })
    this.validateForm()
  },

  // 交配日期选择器变更
  onMatingDateChange: function(e) {
    this.setData({
      'formData.mating_date': e.detail.value
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
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPhotos = (res.tempFilePaths || [])
        const photos = this.data.formData.photos.concat(newPhotos).slice(0, 3)
        this.setData({ 'formData.photos': photos })
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
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && typeof prevPage.refreshData === 'function') {
      prevPage.refreshData()
    }
    wx.navigateBack({ delta: 1 })
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
  },
  
  // 提交表单
  submitForm: async function() {
    if (!this.data.canSubmit || this.data.submitting) return
    this.setData({ submitting: true })
    
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
              cleaning_types: formData.cleaning_types || [],
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
              cleaning_types: formData.cleaning_types || [],
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
        // 将空字符串转换为 null，并解析为数字
        const toNumberOrNull = (v) => {
          const s = String(v || '').trim()
          if (!s) return null
          const n = Number(s)
          return isNaN(n) ? null : n
        }
        const payload = {
          ...baseCommon,
          type: 'health',
          record_date: timeStr,
          parrot_id: (formData.parrot_ids && formData.parrot_ids[0]) || '',
          weight: toNumberOrNull(formData.weight),
          health_status: formData.health_status
        }
        const res = await app.request({ url, method, data: payload })
        if (!res.success) throw new Error(res.message || '保存失败')
      } else if (recordType === 'breeding') {
        const isEdit = !!recordId
        const url = isEdit ? `/api/records/${recordId}` : '/api/records'
        const method = isEdit ? 'PUT' : 'POST'
        const payload = {
          ...baseCommon,
          type: 'breeding',
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
      setTimeout(() => { wx.navigateBack({ delta: 1 }) }, 300)
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
  
  })
