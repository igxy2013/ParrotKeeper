// pages/parrots/parrots.js
const app = getApp()

Page({
  data: {
    parrots: [],
    speciesList: [],
    loading: false,
    searchKeyword: '',
    selectedSpeciesId: '',
    selectedSpeciesName: '',
    selectedStatus: '',
    selectedStatusText: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    sortText: '最新添加',
    isLogin: false, // 添加登录状态
    userMode: null, // 当前用户模式
    lastUserMode: null, // 记录上次的用户模式，用于检测模式变化
    hasOperationPermission: false, // 是否有操作权限
    
    // 性别统计
    maleCount: 0,
    femaleCount: 0,
    
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
      statusRestaurantOrange: '/images/remix/ri-restaurant-fill-orange.png',
      arrowRightGray: '/images/remix/ri-arrow-right-s-fill-gray.png',
      addParrotEmerald: '/images/remix/add-circle-fill.png'
    }
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
      // 加载当前用户模式
      this.loadUserMode();
      
      // 检查用户模式是否发生变化
      const currentMode = app.globalData.userMode || 'personal';
      if (this.data.lastUserMode && this.data.lastUserMode !== currentMode) {
        console.log('检测到用户模式变化:', this.data.lastUserMode, '->', currentMode);
        this.setData({ lastUserMode: currentMode });
        this.refreshData();
        return;
      }
      this.setData({ lastUserMode: currentMode });
      
      // 检查是否需要刷新数据（模式切换后）
      if (app.globalData.needRefresh) {
        console.log('检测到needRefresh标志，刷新数据');
        app.globalData.needRefresh = false; // 重置标志
        this.refreshData(); // 完全刷新数据
      } else {
        // 从其他页面返回时刷新数据
        this.refreshData() // 改为使用refreshData确保完全刷新
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
      await this.loadParrots(true)
    } finally {
      wx.stopPullDownRefresh()
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
    }
  },

  // 加载鹦鹉列表
  async loadParrots(refresh = false) {
    console.log('开始加载鹦鹉列表, refresh:', refresh);
    console.log('当前用户模式:', app.globalData.userMode);
    
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
        console.log('获取到的鹦鹉数据:', parrots);
        console.log('数据数量:', parrots.length);
        
        const newParrots = parrots.map(p => ({
          ...p,
          weight: p.weight ? parseFloat(p.weight) : null,
          acquisition_date_formatted: app.formatDate(p.acquisition_date),
          // 统一规范化图片URL，避免相对路径导致无法展示
          photo_url: app.resolveUploadUrl(p.photo_url),
          avatar_url: app.resolveUploadUrl(p.avatar_url)
        }))
        
        console.log('处理后的鹦鹉数据:', newParrots);
        
        const updatedParrots = refresh ? newParrots : [...this.data.parrots, ...newParrots];
        
        // 计算性别统计
        const maleCount = updatedParrots.filter(parrot => parrot.gender === 'male').length;
        const femaleCount = updatedParrots.filter(parrot => parrot.gender === 'female').length;
        
        this.setData({
          parrots: updatedParrots,
          page: refresh ? 2 : this.data.page + 1,
          hasMore: newParrots.length === 10,
          maleCount,
          femaleCount
        })
        
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
    this.setData({
      selectedSpeciesId: id || '',
      selectedSpeciesName: name || '',
      showSpeciesModal: false
    })
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
      birth_date: parrot.birth_date || '',
      notes: parrot.notes || '',
      parrot_number: parrot.parrot_number || '',
      ring_number: parrot.ring_number || '',
      acquisition_date: parrot.acquisition_date || '',
      photo_url: parrot.photo_url || parrot.avatar_url || ''
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
        return { ...parrot, photo_url: '/images/default-parrot.png' };
      }
      return parrot;
    });
    this.setData({ parrots });
  },

  // 加载当前团队信息
  loadUserMode() {
    // 从全局数据获取用户模式
    const userMode = app.globalData.userMode || 'personal';
    this.setData({
      userMode: userMode
    });
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
    const systemInfo = wx.getSystemInfoSync()
    if (systemInfo.platform === 'ios') {
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
      if (menuButtonInfo && menuButtonInfo.right) {
        const rightPadding = systemInfo.windowWidth - menuButtonInfo.right + 10
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
      const res = await app.request({ url: mode === 'edit' ? `/api/parrots/${id}` : '/api/parrots', method: mode === 'edit' ? 'PUT' : 'POST', data })
      if (res.success) {
        app.showSuccess(mode === 'edit' ? '编辑成功' : '添加成功')
        this.setData({ showParrotModal: false, currentParrotForm: null })
        this.loadParrots(true)
      } else {
        app.showError(res.message || (mode === 'edit' ? '编辑失败' : '添加失败'))
      }
    } catch (error) {
      app.showError('网络错误，请稍后重试')
    }
  }
})
