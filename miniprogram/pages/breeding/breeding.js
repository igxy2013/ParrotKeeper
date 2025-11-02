// pages/breeding/breeding.js
const app = getApp()

Page({
  data: {
    isLogin: false,
    loading: false,
    
    // 统计数据
    stats: {
      totalPairs: 0,
      successfulHatching: 0
    },
    
    // 筛选状态
    statusOptions: ['全部', '配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成'],
    selectedStatus: '全部',
    
    // 繁殖记录数据
    breedingRecords: [],
    filteredRecords: [],
    
    // 鹦鹉选项
    parrotOptions: [],
    
    // 繁殖状态选项
    breedingStatusOptions: ['配对中', '筑巢中', '产蛋中', '孵化中', '育雏中', '已完成']
  },

  onLoad(options) {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLogin) {
      this.loadParrotOptions()
      this.loadBreedingRecords()
    }
  },

  onPullDownRefresh() {
    if (this.data.isLogin) {
      this.loadBreedingRecords()
    }
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    // 可以在这里实现分页加载
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = app.globalData.isLogin
    const hasOperationPermission = app.hasOperationPermission()
    this.setData({ isLogin, hasOperationPermission })
    
    if (!isLogin) {
      this.setData({
        breedingRecords: [],
        filteredRecords: [],
        stats: {
          totalPairs: 0,
          successfulHatching: 0
        }
      })
    }
  },

  // 加载鹦鹉选项
  async loadParrotOptions() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { limit: 100 }
      })
      if (res && res.success) {
        const parrots = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.parrots))
            ? res.data.parrots
            : (res.data && Array.isArray(res.data.items))
              ? res.data.items
              : []
        this.setData({ parrotOptions: parrots })
      }
    } catch (err) {
      console.error('加载鹦鹉列表失败:', err)
      app.showError('加载鹦鹉列表失败')
    }
  },

  // 加载繁殖记录
  async loadBreedingRecords() {
    this.setData({ loading: true })
    try {
      const res = await app.request({
        url: '/api/records/breeding',
        method: 'GET'
      })
      if (res && res.success) {
        const items = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.items))
            ? res.data.items
            : []
        const records = this.processBreedingRecords(items)
        this.setData({
          breedingRecords: records,
          loading: false
        })
        this.filterRecords()
        this.updateStats()
      } else {
        app.showError((res && res.message) || '加载繁殖记录失败')
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载繁殖记录失败:', err)
      app.showError('网络错误，请稍后重试')
      this.setData({ loading: false })
    }
  },

  // 处理繁殖记录数据
  processBreedingRecords(records) {
    return records.map(record => {
      // 构建鹦鹉配对名称
      const maleParrotName = record.male_parrot ? record.male_parrot.name : '未知'
      const femaleParrotName = record.female_parrot ? record.female_parrot.name : '未知'
      const parrotPair = `${maleParrotName} × ${femaleParrotName}`
      
      // 计算孵化率
      let hatchingRate = '-'
      if (record.egg_count > 0) {
        hatchingRate = `${record.chick_count || 0}/${record.egg_count}`
      }
      
      // 根据日期和数据推断状态
      let status = '配对中'
      let statusClass = 'status-pairing'
      
      if (record.hatching_date && record.chick_count > 0) {
        status = '育雏中'
        statusClass = 'status-brooding'
      } else if (record.hatching_date) {
        status = '孵化中'
        statusClass = 'status-hatching'
      } else if (record.egg_laying_date && record.egg_count > 0) {
        status = '产蛋中'
        statusClass = 'status-laying'
      } else if (record.mating_date) {
        status = '筑巢中'
        statusClass = 'status-nesting'
      }
      
      return {
        id: record.id,
        parrotPair,
        maleParrot: maleParrotName,
        femaleParrot: femaleParrotName,
        nestingDate: record.mating_date || '',
        layingDate: record.egg_laying_date || '',
        hatchingDate: record.hatching_date || '',
        eggCount: record.egg_count || 0,
        hatchedCount: record.chick_count || 0,
        hatchingRate,
        status,
        statusClass,
        notes: record.notes || '',
        createdAt: this.formatDate(record.created_at),
        rawData: record
      }
    })
  },

  // 更新统计数据
  updateStats() {
    const records = this.data.breedingRecords
    const totalPairs = records.length
    const successfulHatching = records.filter(record => record.hatchedCount > 0).length
    
    this.setData({
      stats: {
        totalPairs,
        successfulHatching
      }
    })
  },

  // 筛选记录
  filterRecords() {
    const { breedingRecords, selectedStatus } = this.data
    let filteredRecords = breedingRecords
    
    if (selectedStatus !== '全部') {
      filteredRecords = breedingRecords.filter(record => record.status === selectedStatus)
    }
    
    this.setData({ filteredRecords })
  },

  // 选择状态筛选
  selectStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ selectedStatus: status })
    this.filterRecords()
  },

  // 显示添加表单
  showAddForm() {
    if (!this.data.isLogin) {
      app.showError('请先登录后使用此功能')
      return
    }
    
    // 导航到添加繁殖记录页面
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=breeding'
    })
  },

  // 查看记录详情（跳转统一详情页）
  viewRecordDetail(e) {
    const ds = e.currentTarget?.dataset || {}
    const id = ds.id || (ds.record && ds.record.id) || ''
    const ids = ds.ids || ''
    const derivedId = id || (ids ? String(ids).split(',').filter(Boolean)[0] : '')
    const query = ['type=breeding']
    if (derivedId) query.push(`id=${derivedId}`)
    if (ids) query.push(`record_ids=${ids}`)
    wx.navigateTo({ url: `/pages/records/detail/detail?${query.join('&')}` })
  },

  // 编辑记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const url = `/pages/records/add-record/add-record?mode=edit&type=breeding&id=${encodeURIComponent(id)}`;
    wx.navigateTo({ url });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条繁殖记录吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id);
        }
      }
    });
  },

  // 执行删除操作
  async performDelete(id) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const res = await app.request({
        url: `/api/records/breeding/${id}`,
        method: 'DELETE'
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadBreedingRecords();
      } else {
        wx.showToast({
          title: res.message || '删除失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
