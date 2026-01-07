const app = getApp()

Page({
  data: {
    activeTab: 'expense',
    categories: [],
    showModal: false,
    newCategoryName: '',
    // 类别图标映射
    incomeCategoryIcons: {
      'breeding_sale': '/images/remix/ri-shopping-bag-fill-blue.png',
      'bird_sale': '/images/parrot-avatar-yellow.svg',
      'service': '/images/remix/service-line.png',
      'competition': '/images/remix/trophy-line-orange.png',
      'other': '/images/remix/ri-information-fill-green.png'
    },
    expenseCategoryIcons: {
      'food': '/images/remix/ri-restaurant-fill-orange.png',
      'medical': '/images/remix/ri-nurse-line-purple.png',
      'toys': '/images/remix/ri-heart-fill-red.png',
      'cage': '/images/remix/ri-home-5-fill-green.png',
      'baby_bird': '/images/parrot-avatar-yellow.svg',
      'breeding_bird': '/images/parrot-avatar-green.svg',
      'other': '/images/remix/ri-information-fill-amber.png'
    }
  },

  onLoad() {
    this.checkAccessAndInit()
  },

  async checkAccessAndInit(){
    try{
      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      if (mode === 'team'){
        try { if (app && typeof app.ensureEffectivePermissions === 'function') await app.ensureEffectivePermissions() } catch(_){}
        const mp = (app && app.globalData && app.globalData.effectivePermissions) || wx.getStorageSync('effectivePermissions') || null
        const canManage = !!(mp && (mp['finance.category.manage'] || mp['all']))
        const isAdmin = !!(app && typeof app.isTeamAdmin === 'function' && app.isTeamAdmin())
        if (!canManage && !isAdmin){ wx.showToast({ title: '无权限管理收支类别', icon: 'none' }); this.setData({ categories: [] }); return }
      }
    }catch(_){}
    this.fetchCategories()
  },

  switchTab(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ activeTab: type })
    this.fetchCategories()
  },

  fetchCategories() {
    app.request({
      url: '/api/categories/transactions',
      method: 'GET',
      data: { type: this.data.activeTab }
    }).then((res) => {
      if (res && res.success) {
        const list = (res.data || []).map(item => {
          const originalName = item.name // 保存原始名称（英文）
          if (!item.is_custom) {
            item.name = this.translateSystemCategory(item.name)
            // 使用原始名称（英文）获取图标
            const iconMap = this.data.activeTab === 'expense' 
              ? this.data.expenseCategoryIcons 
              : this.data.incomeCategoryIcons
            item.icon = iconMap[originalName] || '/images/remix/ri-information-fill-amber.png'
          } else {
            // 自定义类别使用默认图标
            item.icon = '/images/remix/ri-information-fill-amber.png'
          }
          return item
        })
        this.setData({ categories: list })
      }
    })
  },

  translateSystemCategory(name) {
    const map = {
      'food': '餐饮', 'medical': '医疗', 'toys': '玩具', 'cage': '笼舍', 
      'baby_bird': '雏鸟', 'breeding_bird': '种鸟', 'other': '其他',
      'breeding_sale': '繁殖出售', 'bird_sale': '鸟类出售', 'service': '服务', 
      'competition': '比赛', 'supplies': '用品'
    }
    return map[name] || name
  },

  showAddModal() {
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team'){
      const mp = (app && app.globalData && app.globalData.effectivePermissions) || wx.getStorageSync('effectivePermissions') || null
      const isAdmin = !!(app && typeof app.isTeamAdmin === 'function' && app.isTeamAdmin())
      if (!(mp && (mp['finance.category.manage'] || mp['all'])) && !isAdmin){ wx.showToast({ title: '无权限管理收支类别', icon: 'none' }); return }
    }
    this.setData({ showModal: true, newCategoryName: '' })
  },

  hideAddModal() {
    this.setData({ showModal: false })
  },

  stopPropagation() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  onInputName(e) {
    this.setData({ newCategoryName: e.detail.value })
  },

  addCategory() {
    if (!this.data.newCategoryName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team'){
      const mp = (app && app.globalData && app.globalData.effectivePermissions) || wx.getStorageSync('effectivePermissions') || null
      const isAdmin = !!(app && typeof app.isTeamAdmin === 'function' && app.isTeamAdmin())
      if (!(mp && (mp['finance.category.manage'] || mp['all'])) && !isAdmin){ wx.showToast({ title: '无权限管理收支类别', icon: 'none' }); return }
    }
    
    app.request({
      url: '/api/categories/transactions',
      method: 'POST',
      data: {
        name: this.data.newCategoryName,
        type: this.data.activeTab
      }
    }).then((res) => {
      if (res && res.success) {
        this.hideAddModal()
        this.fetchCategories()
        wx.showToast({ title: '添加成功' })
      } else {
        wx.showToast({ title: (res && res.message) || '添加失败', icon: 'none' })
      }
    })
  },

  deleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
    if (mode === 'team'){
      const mp = (app && app.globalData && app.globalData.effectivePermissions) || wx.getStorageSync('effectivePermissions') || null
      const isAdmin = !!(app && typeof app.isTeamAdmin === 'function' && app.isTeamAdmin())
      if (!(mp && (mp['finance.category.manage'] || mp['all'])) && !isAdmin){ wx.showToast({ title: '无权限管理收支类别', icon: 'none' }); return }
    }
    wx.showModal({
      title: '提示',
      content: '确定要删除该类别吗？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/api/categories/transactions/${id}`,
            method: 'DELETE'
          }).then((res) => {
            if (res && res.success) {
              this.fetchCategories()
              wx.showToast({ title: '删除成功' })
            } else {
              wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' })
            }
          })
        }
      }
    })
  }
})
