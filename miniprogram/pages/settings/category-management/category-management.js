const app = getApp()

Page({
  data: {
    activeTab: 'expense',
    categories: [],
    showModal: false,
    newCategoryName: ''
  },

  onLoad() {
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
          if (!item.is_custom) {
            item.name = this.translateSystemCategory(item.name)
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
    this.setData({ showModal: true, newCategoryName: '' })
  },

  hideAddModal() {
    this.setData({ showModal: false })
  },

  onInputName(e) {
    this.setData({ newCategoryName: e.detail.value })
  },

  addCategory() {
    if (!this.data.newCategoryName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
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
