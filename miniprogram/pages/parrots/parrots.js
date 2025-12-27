// pages/parrots/parrots.js
const app = getApp()
const CACHE_TTL_MS = 60 * 1000

Page({
  data: {
    parrots: [],
    displayParrots: [],
    speciesList: [],
    speciesPickerRange: ['全部品种'],
    loading: false,
    searchKeyword: '',
    selectedSpeciesId: '',
    selectedSpeciesName: '全部品种',
    selectedStatus: '',
    selectedStatusText: '',
    statusPickerRange: ['全部状态', '健康', '生病', '康复中', '观察中'],
    sortBy: 'created_at',
    sortOrder: 'desc',
    sortText: '最新添加',
    sortPickerRange: ['名称 A-Z', '名称 Z-A', '年龄从小到大', '年龄从大到小', '最新添加'],
    isLogin: false, // 添加登录状态
    userMode: null, // 当前用户模式
    lastUserMode: null, // 记录上次的用户模式，用于检测模式变化
    hasOperationPermission: false, // 是否有操作权限
    
    // 性别统计
    maleCount: 0,
    femaleCount: 0,
    totalParrots: 0,
    lastParrotsLoadedAt: 0,
    lastOverviewLoadedAt: 0,
    activeGenderFilter: '',
    viewMode: 'card',
    
    // 筛选和排序相关
    showSpeciesModal: false,
    showStatusModal: false,
    showSortModal: false,
    
    // 分页相关
    page: 1,
    hasMore: true,
    menuRightPadding: 0,

    // 弹窗组件状态
    showParrotModal: false,
    parrotFormMode: 'add',
    parrotFormTitle: '',
    currentParrotForm: null,
    parrotTypes: [],

    // 动态 PNG 图标（失败自动回退为 SVG）
    iconPaths: {
      headerAddEmerald: '/images/remix/add-circle-fill.png',
      searchGray: '/images/remix/ri-search-line-gray.png',
      arrowDownGray: '/images/remix/ri-arrow-down-s-fill-gray.png',
      arrowDown: '/images/remix/arrow-down-s-line.png',
      statusRestaurantOrange: '/images/remix/ri-restaurant-fill-orange.png',
      arrowRightGray: '/images/remix/ri-arrow-right-s-fill-gray.png',
      arrowRight: '/images/remix/arrow-right-s-line.png',
      addParrotEmerald: '/images/remix/add-circle-fill.png',
      claimByCodeKey: '/images/remix/key-2-line.png',
      viewGrid: '/images/remix/layout-grid-fill.svg',
      viewList: '/images/remix/list-check.svg',
      genderMale: '/images/remix/men-line.png',
      genderFemale: '/images/remix/women-line.png',
      genderUnknown: '/images/remix/question-mark.png'
    },
    isSortMode: false,
    draggingParrotId: null,
    dragTargetIndex: -1,
    dragRects: [],
    dragGhost: null,

    // 通过过户码添加弹窗
    showClaimByCodeModal: false,
    claimCode: '',
    claimingByCode: false
  },

  onLoad() {
    // 检查登录状态
    const isLogin = app.checkLoginStatus()
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ 
      isLogin,
      hasOperationPermission
    })
    
    // 无论是否登录都加载品种列表（游客模式）
    this.loadSpeciesList()
    
    if (isLogin) {
      this.loadOverviewParrotsTotal(true)
      this.loadParrots()
    } else {
      // 游客模式：显示示例数据或空状态
      this.setData({
        parrots: [],
        loading: false
      })
    }
    this.computeMenuRightPadding()
  },

  onShow() {
    console.log('鹦鹉页面 onShow 被调用');
    
    // 检查登录状态
    const loginStatus = app.checkLoginStatus();
    const hasOperationPermission = app.hasOperationPermission();
    console.log('登录状态检查结果:', loginStatus);
    console.log('操作权限检查结果:', hasOperationPermission);
    console.log('全局数据:', app.globalData);
    
    this.setData({ 
      isLogin: loginStatus,
      hasOperationPermission: hasOperationPermission
    })
    
    if (loginStatus) {
      console.log('用户已登录，开始加载鹦鹉数据');
      const storedMode = wx.getStorageSync('userMode') || ''
      const currentMode = app.globalData.userMode || storedMode || 'personal'
      this.setData({ userMode: currentMode })

      const now = Date.now()
      const canUseListCache = Array.isArray(this.data.parrots) && this.data.parrots.length > 0 && (now - (this.data.lastParrotsLoadedAt || 0) < CACHE_TTL_MS)

      if (!canUseListCache) {
        this.loadOverviewParrotsTotal(true)
      } else {
        this.loadOverviewParrotsTotal(false)
      }

      // 检查用户模式是否发生变化
      if (this.data.lastUserMode && this.data.lastUserMode !== currentMode) {
        console.log('检测到用户模式变化:', this.data.lastUserMode, '->', currentMode);
        const viewMode = currentMode === 'team' ? 'list' : 'card';
        this.setData({ lastUserMode: currentMode, viewMode });
        this.refreshData();
        return;
      }
      
      // 首次加载设置默认视图模式
      if (!this.data.lastUserMode) {
        const viewMode = currentMode === 'team' ? 'list' : 'card';
        this.setData({ viewMode });
      }

      this.setData({ lastUserMode: currentMode });
      
      // 检查是否需要刷新数据（模式切换后）
      if (app.globalData.needRefresh) {
        console.log('检测到needRefresh标志，刷新数据');
        app.globalData.needRefresh = false; // 重置标志
        this.refreshData(); // 完全刷新数据
      } else {
        if (!canUseListCache) {
          this.refreshData()
        }
      }
    } else {
      console.log('游客模式，显示空状态');
      // 游客模式：清空数据显示空状态
      this.setData({
        parrots: [],
        userMode: null,
        loading: false
      })
    }
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onPageScroll(e) {
    this._lastScrollTop = e && typeof e.scrollTop === 'number' ? e.scrollTop : 0
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreParrots()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true
    })
    
    try {
      this.loadOverviewParrotsTotal(true)
      await this.loadParrots(true)
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  async loadOverviewParrotsTotal(force = false) {
    if (!this.data.isLogin) return
    if (!force) {
      const now = Date.now()
      if (this.data.totalParrots > 0 && now - (this.data.lastOverviewLoadedAt || 0) < CACHE_TTL_MS) return
    }
    try {
      const res = await app.request({
        url: '/api/statistics/overview',
        method: 'GET'
      })
      if (res && res.success) {
        const total = (res.data && res.data.total_parrots) ? Number(res.data.total_parrots) : 0
        this.setData({ totalParrots: Number.isFinite(total) ? total : 0, lastOverviewLoadedAt: Date.now() })
      }
    } catch (e) {
    }
  },

  // 打开通过过户码添加弹窗
  openClaimByCodeModal() {
    if (!this.data.isLogin) {
      app.showError('请先登录')
      return
    }
    this.setData({
      showClaimByCodeModal: true,
      claimCode: '',
      claimingByCode: false
    })
  },

  // 关闭弹窗
  closeClaimByCodeModal() {
    if (this.data.claimingByCode) return
    this.setData({
      showClaimByCodeModal: false,
      claimCode: ''
    })
  },

  // 输入过户码
  onInputClaimCode(e) {
    this.setData({ claimCode: e.detail.value })
  },

  // 提交认领
  async submitClaimByCode() {
    if (!this.data.isLogin) {
      app.showError('请先登录')
      return
    }
    const code = (this.data.claimCode || '').trim()
    if (!code) {
      app.showError('请输入过户码')
      return
    }
    try {
      this.setData({ claimingByCode: true })
      const res = await app.request({
        url: '/api/parrots/transfer/claim',
        method: 'POST',
        data: { code }
      })
      if (res && res.success) {
        wx.showToast({ title: '认领成功', icon: 'success' })
        this.setData({ showClaimByCodeModal: false, claimCode: '' })
        // 完全刷新列表
        await this.refreshData()
      } else {
        app.showError(res && res.message ? res.message : '认领失败')
      }
    } catch (err) {
      app.showError('认领失败，请稍后重试')
    } finally {
      this.setData({ claimingByCode: false })
    }
  },

  // 加载鹦鹉品种列表
  async loadSpeciesList() {
    try {
      this.setData({
        speciesList: [],
        speciesPickerRange: ['全部品种']
      })
    } catch (error) {}
  },

  // 格式化品种名称，移除“鹦鹉”后缀
  formatSpeciesName(name) {
    if (!name) return '未知品种';
    const shortName = name.replace(/鹦鹉$/, '');
    return shortName || name; // 防止替换后为空字符串
  },

  // 加载鹦鹉列表
  async loadParrots(refresh = false) {
    console.log('开始加载鹦鹉列表, refresh:', refresh);
    console.log('当前用户模式:', app.globalData.userMode);

    const preserveScrollTop = refresh ? null : (this._lastScrollTop || 0)
    
    if (this.data.loading) {
      console.log('正在加载中，跳过本次请求');
      return;
    }
    
    this.setData({ loading: true })
    
    try {
      const params = {
        page: refresh ? 1 : this.data.page,
        limit: 10,
        search: this.data.searchKeyword,
        species_id: this.data.selectedSpeciesId,
        health_status: this.data.selectedStatus,
        sort_by: this.data.sortBy,
        sort_order: this.data.sortOrder
      }
      
      console.log('请求参数:', params);
      console.log('全局数据 openid:', app.globalData.openid);
      
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: params
      })
      
      console.log('API响应:', res);
      
      if (res.success) {
        const parrots = res.data.parrots || []
        const totalParrots = (this.data.totalParrots || res.data.total || 0)
        console.log('获取到的鹦鹉数据:', parrots);
        console.log('数据数量:', parrots.length);
        
        const newParrots = parrots.map(p => {
          const speciesName = p.species && p.species.name ? p.species.name : (p.species_name || '')
          const photoUrl = app.resolveUploadUrl(p.photo_url)
          const avatarUrl = p.avatar_url ? app.resolveUploadUrl(p.avatar_url) : app.getDefaultAvatarForParrot({
            gender: p.gender,
            species_name: speciesName,
            name: p.name
          })
          const photoThumb = photoUrl ? app.getThumbnailUrl(photoUrl, 160) : ''
          const avatarThumb = avatarUrl ? app.getThumbnailUrl(avatarUrl, 128) : ''
          // 预计算体重展示，避免 WXML 表达式出现 undefinedg
          let weightDisplay = ''
          try {
            const w = p.weight
            if (w !== null && w !== undefined && w !== '') {
              const num = typeof w === 'number' ? w : parseFloat(String(w))
              if (!isNaN(num) && isFinite(num)) {
                const rounded = Math.round(num * 10) / 10
                weightDisplay = `${rounded}g`
              }
            }
          } catch (e) {
            weightDisplay = ''
          }
          const ageDisplay = this.computeAgeDisplay(p.birth_date)
          return {
            ...p,
            weight: p.weight ? parseFloat(p.weight) : null,
            weight_display: weightDisplay,
            age_display: ageDisplay,
            acquisition_date_formatted: app.formatDate(p.acquisition_date),
            photo_url: photoUrl,
            avatar_url: avatarUrl,
            photo_thumb: photoThumb,
            avatar_thumb: avatarThumb,
            species_name_short: this.formatSpeciesName(speciesName)
          }
        })
        
        console.log('处理后的鹦鹉数据:', newParrots);
        
        let updatedParrots = refresh ? newParrots : [...this.data.parrots, ...newParrots]
        try {
          const or = await app.request({ url: '/api/settings/parrot-order', method: 'GET' })
          let orderIds = []
          if (or && or.success && Array.isArray(or.data && or.data.order)) {
            orderIds = or.data.order
          } else {
            const cached = wx.getStorageSync('parrotOrder')
            if (Array.isArray(cached)) orderIds = cached
          }
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            const map = {}
            updatedParrots.forEach(p => { map[p.id] = p })
            const ordered = []
            orderIds.forEach(id => { if (map[id]) ordered.push(map[id]) })
            updatedParrots.forEach(p => { if (!orderIds.includes(p.id)) ordered.push(p) })
            updatedParrots = ordered
          }
        } catch (_) {}
        
        // 计算性别统计
        const maleCount = updatedParrots.filter(parrot => parrot.gender === 'male').length;
        const femaleCount = updatedParrots.filter(parrot => parrot.gender === 'female').length;
        
        this.setData({
          parrots: updatedParrots,
          page: refresh ? 2 : this.data.page + 1,
          hasMore: newParrots.length === 10,
          maleCount,
          femaleCount,
          totalParrots,
          lastParrotsLoadedAt: Date.now()
        }, () => {
          if (!refresh && preserveScrollTop !== null) {
            wx.pageScrollTo({ scrollTop: preserveScrollTop, duration: 0 })
          }
        })

      this.applyGenderFilter()

        // 根据当前用户的鹦鹉列表生成品种筛选项（仅显示用户所养品种）
        this.updateSpeciesOptionsFromParrots(updatedParrots)

        // 异步填充每只鹦鹉的“最近喂食时间”文本
        this.updateLastFeedForParrots(updatedParrots)
        
        console.log('设置数据完成，当前parrots数量:', this.data.parrots.length);
      } else {
        console.log('API返回失败:', res);
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error)
      app.showError('加载失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 仅用当前用户的鹦鹉列表生成品种筛选项
  updateSpeciesOptionsFromParrots(list) {
    try {
      const arr = Array.isArray(list) ? list : []
      const mapById = {}
      const fallbackNames = new Set()
      arr.forEach(p => {
        const s = p.species || {}
        const id = s.id
        const name = s.name || p.species_name || ''
        if (id != null && id !== '') {
          if (!mapById[id]) mapById[id] = { id, name }
        } else if (name) {
          fallbackNames.add(name)
        }
      })
      let speciesList = Object.values(mapById)
      if (speciesList.length === 0 && fallbackNames.size > 0) {
        speciesList = Array.from(fallbackNames).map(n => ({ id: '', name: n }))
      }
      const names = ['全部品种', ...speciesList.map(s => s.name)]
      this.setData({ speciesList, speciesPickerRange: names })
    } catch (_) {}
  },

  // 加载更多鹦鹉
  loadMoreParrots() {
    this.loadParrots()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 执行搜索
  onSearch() {
    this.refreshData()
  },

  onOverviewFilterTap(e) {
    const filter = e.currentTarget.dataset.filter || ''
    this.setData({ activeGenderFilter: filter })
    this.applyGenderFilter()
  },

  applyGenderFilter() {
    const list = Array.isArray(this.data.parrots) ? this.data.parrots : []
    let display = list
    if (this.data.activeGenderFilter === 'male') {
      display = list.filter(p => p.gender === 'male')
    } else if (this.data.activeGenderFilter === 'female') {
      display = list.filter(p => p.gender === 'female')
    }
    this.setData({ displayParrots: display })
  },

  // 显示品种筛选
  showSpeciesFilter() {
    this.setData({ showSpeciesModal: true })
  },

  // 隐藏品种筛选
  hideSpeciesFilter() {
    this.setData({ showSpeciesModal: false })
  },

  // 选择品种
  selectSpecies(e) {
    const { id, name } = e.currentTarget.dataset
    const isAll = !id
    this.setData({
      selectedSpeciesId: isAll ? '' : (id || ''),
      selectedSpeciesName: isAll ? '全部品种' : (name || ''),
      showSpeciesModal: false
    })
    this.refreshData()
  },

  // 原生品种选择器变更
  onSpeciesPickerChange(e) {
    const idx = Number(e.detail.value)
    if (idx == null) return
    if (Number.isNaN(idx)) return
    if (idx === 0) {
      this.setData({ selectedSpeciesId: '', selectedSpeciesName: '全部品种' })
    } else {
      const realIdx = idx - 1
      const item = (this.data.speciesList || [])[realIdx]
      if (item) {
        this.setData({ selectedSpeciesId: item.id || '', selectedSpeciesName: item.name || '' })
      }
    }
    this.refreshData()
  },

  // 显示状态筛选
  showStatusFilter() {
    this.setData({ showStatusModal: true })
  },

  // 隐藏状态筛选
  hideStatusFilter() {
    this.setData({ showStatusModal: false })
  },

  // 选择状态
  selectStatus(e) {
    const status = e.currentTarget.dataset.status || ''
    const statusMap = {
      '': '全部状态',
      'healthy': '健康',
      'sick': '生病',
      'recovering': '康复中',
      'observation': '观察中'
    }
    
    this.setData({
      selectedStatus: status,
      selectedStatusText: statusMap[status],
      showStatusModal: false
    })
    this.refreshData()
  },

  // 原生状态选择器变更
  onStatusPickerChange(e) {
    const idx = e.detail.value
    if (idx == null) return
    const values = ['', 'healthy', 'sick', 'recovering', 'observation']
    const texts = ['全部状态', '健康', '生病', '康复中', '观察中']
    const val = values[idx] || ''
    const txt = texts[idx] || '全部状态'
    this.setData({ selectedStatus: val, selectedStatusText: txt })
    this.refreshData()
  },

  // 显示排序筛选
  showSortFilter() {
    this.setData({ showSortModal: true })
  },

  // 隐藏排序筛选
  hideSortFilter() {
    this.setData({ showSortModal: false })
  },

  // 选择排序
  selectSort(e) {
    const { by, order } = e.currentTarget.dataset
    const sortLabelMap = {
      'name_asc': '名称 A-Z',
      'name_desc': '名称 Z-A',
      'birth_date_desc': '年龄从小到大',
      'birth_date_asc': '年龄从大到小',
      'created_at_desc': '最新添加'
    }
    const key = `${by}_${order}`
    
    this.setData({
      sortBy: by,
      sortOrder: order,
      sortText: sortLabelMap[key],
      showSortModal: false
    })
    this.refreshData()
  },

  // 原生排序选择器变更
  onSortPickerChange(e) {
    const idx = e.detail.value
    if (idx == null) return
    const opts = [
      { by: 'name', order: 'asc', text: '名称 A-Z' },
      { by: 'name', order: 'desc', text: '名称 Z-A' },
      { by: 'birth_date', order: 'desc', text: '年龄从小到大' },
      { by: 'birth_date', order: 'asc', text: '年龄从大到小' },
      { by: 'created_at', order: 'desc', text: '最新添加' }
    ]
    const sel = opts[idx] || opts[4]
    this.setData({ sortBy: sel.by, sortOrder: sel.order, sortText: sel.text })
    this.refreshData()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭模态框
  },

  // 查看鹦鹉详情
  viewParrotDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/parrots/detail/detail?id=${id}`
    })
  },

  // 添加鹦鹉
  addParrot() {
    // 使用复用组件打开添加弹窗
    const emptyForm = {
      id: '', name: '', type: '', weight: '', gender: '', gender_display: '', color: '', birth_date: '', notes: '', parrot_number: '', ring_number: '', acquisition_date: '', photo_url: ''
    }
    this.setData({
      showParrotModal: true,
      parrotFormMode: 'add',
      parrotFormTitle: '添加新鹦鹉',
      currentParrotForm: emptyForm
    })
    this.loadSpeciesListForModal()
  },

  // 列表图标加载失败时回退为 SVG
  onListIconError(e) {
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
  },

  // 编辑鹦鹉（如在列表页需要）
  editParrot(e) {
    if (e && e.stopPropagation) { e.stopPropagation() }
    const id = e.currentTarget.dataset.id
    const parrot = (this.data.parrots || []).find(p => p.id === id)
    if (!parrot) return
    const form = {
      id: parrot.id,
      name: parrot.name || '',
      type: parrot.species_name || '',
      weight: parrot.weight || '',
      gender: parrot.gender || '',
      gender_display: parrot.gender === 'male' ? '雄性' : (parrot.gender === 'female' ? '雌性' : ''),
      color: parrot.color || '',
      birth_place_province: parrot.birth_place_province || '',
      birth_place_city: parrot.birth_place_city || '',
      birth_place_county: parrot.birth_place_county || '',
      birth_place_text: parrot.birth_place || '',
      birth_date: parrot.birth_date || '',
      notes: parrot.notes || '',
      parrot_number: parrot.parrot_number || '',
      ring_number: parrot.ring_number || '',
      acquisition_date: parrot.acquisition_date || '',
      photo_url: parrot.photo_url || parrot.avatar_url || '',
      plumage_split_ids: Array.isArray(parrot.plumage_split_ids) ? parrot.plumage_split_ids : []
    }
    this.setData({
      showParrotModal: true,
      parrotFormMode: 'edit',
      parrotFormTitle: '编辑鹦鹉',
      currentParrotForm: form
    })
    this.loadSpeciesListForModal()
  },

  // 处理图片加载错误
  handleImageError(e) {
    const id = e.currentTarget.dataset.id;
    const parrots = this.data.parrots.map(parrot => {
      if (parrot.id === id) {
        const speciesName = (parrot.species && parrot.species.name) ? parrot.species.name : (parrot.species_name || '')
        const fallbackAvatar = app.getDefaultAvatarForParrot({
          gender: parrot.gender,
          species_name: speciesName,
          name: parrot.name
        })
        return { ...parrot, photo_url: '', avatar_url: fallbackAvatar };
      }
      return parrot;
    });
    this.setData({ parrots });
    this.applyGenderFilter()
  },


  // 计算最近喂食的相对时间文本
  computeLastFeedingText(lastTime) {
    if (!lastTime) return '暂无喂食记录'
    const now = new Date()
    const diffHours = Math.floor((now - lastTime) / (1000 * 60 * 60))
    if (diffHours < 1) {
      return '刚刚喂食'
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}天前`
    }
  },

  // 为列表中的每只鹦鹉异步获取并填充最近喂食时间
  async updateLastFeedForParrots(parrotList) {
    const list = Array.isArray(parrotList) ? parrotList : []
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      try {
        const res = await getApp().request({
          url: `/api/parrots/${p.id}/records`,
          method: 'GET',
          data: { limit: 5 }
        })
        let records = []
        if (res && res.success && res.data) {
          if (Array.isArray(res.data.records)) {
            records = res.data.records
          } else if (Array.isArray(res.data)) {
            records = res.data
          }
        }
        const feedingRecords = records.filter(function(r){ return r && (r.type === 'feeding') })
        var times = feedingRecords.map(function(r){
          const raw = (r.data && r.data.feeding_time) || r.time || r.created_at || ''
          return app.parseIOSDate ? app.parseIOSDate(raw) || null : (function(){
            return (function(ts){ return (ts ? (new Date(ts)) : null) }) (raw)
          })()
        }).filter(function(d){ return !!d })
        // 取最近一次
        times.sort(function(a, b){ return b.getTime() - a.getTime() })
        const last = times.length > 0 ? times[0] : null
        const text = this.computeLastFeedingText(last)
        const idx = (this.data.parrots || []).findIndex(function(item){ return item.id === p.id })
        const dIdx = (this.data.displayParrots || []).findIndex(function(item){ return item.id === p.id })
        const setter = {}
        if (idx >= 0) {
          setter[`parrots[${idx}].last_feed`] = text
        }
        if (dIdx >= 0) {
          setter[`displayParrots[${dIdx}].last_feed`] = text
        }
        if (Object.keys(setter).length > 0) {
          this.setData(setter)
        }
      } catch (e) {
        // 请求失败则保持原样或标记暂无
        const idx = (this.data.parrots || []).findIndex(function(item){ return item.id === p.id })
        const dIdx = (this.data.displayParrots || []).findIndex(function(item){ return item.id === p.id })
        const setter = {}
        if (idx >= 0 && !this.data.parrots[idx].last_feed) {
          setter[`parrots[${idx}].last_feed`] = '暂无喂食记录'
        }
        if (dIdx >= 0 && !(this.data.displayParrots[dIdx] || {}).last_feed) {
          setter[`displayParrots[${dIdx}].last_feed`] = '暂无喂食记录'
        }
        if (Object.keys(setter).length > 0) {
          this.setData(setter)
        }
      }
    }
  },

  computeAgeDisplay(birthDate) {
    try {
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
    } catch (_) {
      return ''
    }
  },

  toggleSortMode() {
    this.setData({ isSortMode: !this.data.isSortMode })
    if (this.data.isSortMode) {
      this.computeParrotRects()
    } else {
      this.setData({ draggingParrotId: null, dragTargetIndex: -1, dragRects: [], dragGhost: null })
    }
  },

  onParrotLongPress(e) {
    const idx = e.currentTarget.dataset.index
    const vis = Array.isArray(this.data.displayParrots) ? this.data.displayParrots : []
    const item = vis[idx]
    if (!item) return
    const id = item.id
    wx.showActionSheet({
      itemList: ['置顶', '上移', '下移'],
      success: async (res) => {
        const tapIndex = res.tapIndex
        const visibleIds = vis.map(p => p.id)
        const fromIndex = visibleIds.indexOf(id)
        let newVisibleIds = visibleIds.slice()
        if (tapIndex === 0) {
          newVisibleIds = visibleIds.filter(v => v !== id)
          newVisibleIds.unshift(id)
        } else if (tapIndex === 1) {
          if (fromIndex > 0) {
            const t = newVisibleIds[fromIndex - 1]
            newVisibleIds[fromIndex - 1] = id
            newVisibleIds[fromIndex] = t
          }
        } else if (tapIndex === 2) {
          if (fromIndex >= 0 && fromIndex < newVisibleIds.length - 1) {
            const t = newVisibleIds[fromIndex + 1]
            newVisibleIds[fromIndex + 1] = id
            newVisibleIds[fromIndex] = t
          }
        }
        const allIds = (this.data.parrots || []).map(p => p.id)
        const hiddenIds = allIds.filter(pid => !newVisibleIds.includes(pid))
        const newOrderIds = [...newVisibleIds, ...hiddenIds]
        const map = {}
        ;(this.data.parrots || []).forEach(p => { map[p.id] = p })
        const newParrots = []
        newOrderIds.forEach(pid => { if (map[pid]) newParrots.push(map[pid]) })
        this.setData({ parrots: newParrots })
        this.applyGenderFilter()
        try {
          await this.saveParrotOrder(newOrderIds)
          wx.vibrateShort && wx.vibrateShort()
          wx.showToast({ title: '已保存', icon: 'success', duration: 800 })
        } catch (_) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  computeParrotRects(cb) {
    try {
      const q = wx.createSelectorQuery().in(this)
      q.selectAll('.parrot-card').boundingClientRect(rects => {
        if (Array.isArray(rects)) {
          this.setData({ dragRects: rects })
          if (typeof cb === 'function') cb(rects)
        }
      }).exec()
    } catch (e) {}
  },

  onParrotDragStart(e) {
    if (!this.data.isSortMode) return
    const idx = e.currentTarget.dataset.index
    const item = (this.data.displayParrots || [])[idx]
    if (!item) return
    const touch = (e.touches && e.touches[0]) || {}
    this.setData({ draggingParrotId: item.id })
    this.computeParrotRects((rects) => {
      if (idx >= 0 && rects[idx]) {
        const r = rects[idx]
        const dx = (touch.clientX || 0) - r.left
        const dy = (touch.clientY || 0) - r.top
        this.setData({ dragGhost: { id: item.id, x: r.left, y: r.top, w: r.width, h: r.height, dx, dy } })
      }
    })
  },

  onParrotDragMove(e) {
    if (!this.data.isSortMode || !this.data.draggingParrotId) return
    const touches = e.touches || []
    if (!touches.length) return
    const y = touches[0].clientY
    const x = touches[0].clientX
    const rects = this.data.dragRects || []
    if (!rects.length) return
    let nearestIdx = 0
    let nearestDist = Infinity
    rects.forEach((r, i) => {
      const cy = r.top + r.height / 2
      const d = Math.abs(y - cy)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    })
    this.setData({ dragTargetIndex: nearestIdx })
    const g = this.data.dragGhost
    if (g) {
      const nx = x - (g.dx || 0)
      const ny = y - (g.dy || 0)
      this.setData({ dragGhost: { ...g, x: nx, y: ny } })
    }
  },

  async onParrotDragEnd() {
    if (!this.data.isSortMode || !this.data.draggingParrotId) return
    const id = this.data.draggingParrotId
    const vis = (this.data.displayParrots || []).map(p => p.id)
    const fromIdx = vis.indexOf(id)
    const toIdx = this.data.dragTargetIndex
    this.setData({ draggingParrotId: null, dragTargetIndex: -1, dragRects: [], dragGhost: null })
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    const newVisibleIds = vis.filter(v => v !== id)
    newVisibleIds.splice(toIdx, 0, id)
    const allIds = (this.data.parrots || []).map(p => p.id)
    const hiddenIds = allIds.filter(pid => !newVisibleIds.includes(pid))
    const newOrderIds = [...newVisibleIds, ...hiddenIds]
    const map = {}
    ;(this.data.parrots || []).forEach(p => { map[p.id] = p })
    const newParrots = []
    newOrderIds.forEach(pid => { if (map[pid]) newParrots.push(map[pid]) })
    this.setData({ parrots: newParrots })
    this.applyGenderFilter()
    try {
      await this.saveParrotOrder(newOrderIds)
      wx.vibrateShort && wx.vibrateShort()
      wx.showToast({ title: '已保存', icon: 'success', duration: 800 })
    } catch (_) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async saveParrotOrder(orderIds) {
    try {
      if (!Array.isArray(orderIds)) return
      wx.setStorageSync('parrotOrder', orderIds)
    } catch (_) {}
    try {
      const res = await app.request({ url: '/api/settings/parrot-order', method: 'PUT', data: { order: orderIds } })
      return res
    } catch (e) {
      return null
    }
  },

  // 加载当前团队信息
  loadUserMode() {
    const storedMode = wx.getStorageSync('userMode') || ''
    const userMode = app.globalData.userMode || storedMode || 'personal'
    this.setData({
      userMode
    })
  },

  onViewModeTap(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.viewMode) return
    this.setData({ viewMode: mode })
  },

  // 切换模式
  switchMode() {
    const currentMode = this.data.userMode;
    const newMode = currentMode === 'personal' ? 'team' : 'personal';
    
    wx.showModal({
      title: '切换模式',
      content: `确定要切换到${newMode === 'personal' ? '个人' : '团队'}模式吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.confirmModeSwitch(newMode);
        }
      }
    });
  },

  // 确认模式切换
  confirmModeSwitch(newMode) {
    const that = this;
    
    // 显示加载提示
    wx.showLoading({
      title: '切换中...',
      mask: true
    });
    
    // 调用后端API更新用户模式
    wx.request({
      url: `${app.globalData.baseUrl}/api/auth/profile`,
      method: 'PUT',
      header: {
        'X-OpenID': app.globalData.openid,
        'Content-Type': 'application/json'
      },
      data: {
        user_mode: newMode
      },
      success: function(res) {
        wx.hideLoading();
        
        if (res.data.success) {
          // 后端更新成功，更新前端状态
          app.globalData.userMode = newMode;
          wx.setStorageSync('userMode', newMode);
          
          // 更新页面数据
          that.setData({
            userMode: newMode
          });
          
          // 显示切换成功提示
          wx.showToast({
            title: `已切换到${newMode === 'personal' ? '个人' : '团队'}模式`,
            icon: 'success'
          });
          
          // 刷新数据
          that.refreshData();
          
          console.log('模式切换成功:', newMode);
        } else {
          wx.showToast({
            title: res.data.message || '切换失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        wx.hideLoading();
        console.error('切换模式失败:', error);
        wx.showToast({
          title: '网络错误，切换失败',
          icon: 'none'
        });
      }
    });
  },
  computeMenuRightPadding() {
    const device = wx.getDeviceInfo ? wx.getDeviceInfo() : {}
    const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
    if (device.platform === 'ios') {
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      if (menuButtonInfo && menuButtonInfo.right && typeof win.windowWidth === 'number') {
        const rightPadding = win.windowWidth - menuButtonInfo.right + 10
        this.setData({ menuRightPadding: rightPadding })
      }
    }
  },

  // 添加鹦鹉弹窗相关方法
  // 加载鹦鹉品种列表（用于将选择的中文品种映射到后端 species_id）
  async loadSpeciesListForModal() {
    try {
      const res = await app.request({ url: '/api/parrots/species', method: 'GET' })
      if (res.success) {
        const species = res.data || []
        const names = species.map(s => s.name)
        this.setData({ parrotTypes: names })
      }
    } catch (e) {
      // 静默失败，不影响弹窗使用
    }
  },
  // 组件事件：取消
  onParrotModalCancel() {
    this.setData({ showParrotModal: false, currentParrotForm: null })
  },

  // 组件事件：提交（添加或编辑）
  async onParrotModalSubmit(e) {
    if (!this.data.isLogin) { app.showError('请先登录后使用此功能'); return }
    const { id, data, mode } = e.detail
    try {
      let res
      if (mode === 'claim') {
        const code = data && data.code
        if (!code || String(code).length !== 8) {
          app.showError('请输入 8 位过户码')
          return
        }
        res = await app.request({ url: '/api/parrots/transfer/claim', method: 'POST', data: { code } })
        if (res.success) {
          app.showSuccess('认领成功')
        }
      } else {
        res = await app.request({ url: mode === 'edit' ? `/api/parrots/${id}` : '/api/parrots', method: mode === 'edit' ? 'PUT' : 'POST', data })
        if (res.success) {
          app.showSuccess(mode === 'edit' ? '编辑成功' : '添加成功')
        }
      }

      if (res && res.success) {
        this.setData({ showParrotModal: false, currentParrotForm: null })
        this.loadParrots(true)
      } else if (res) {
        const msg = res.message || (mode === 'edit' ? '编辑失败' : (mode === 'claim' ? '认领失败' : '添加失败'))
        app.showError(msg)
      }
    } catch (error) {
      app.showError('网络错误，请稍后重试')
    }
  }
})
