const app = getApp()

Page({
  data: {
    feedTypes: [],
    showModal: false,
    isEditing: false,
    editingId: null,
    newFeed: {
      name: '',
      brand: '',
      type: '',
      unit: 'g'
    },
    typeOptions: [
      { value: 'seed', label: '种子' },
      { value: 'pellet', label: '颗粒' },
      { value: 'fruit', label: '水果' },
      { value: 'vegetable', label: '蔬菜' },
      { value: 'supplement', label: '保健品' },
      { value: 'milk_powder', label: '奶粉' }
    ],
    selectedTypeLabel: '',
    unitIsGram: true,
    unitSelected: 'g'
  },

  onLoad() {
    this.fetchFeedTypes()
  },

  fetchFeedTypes() {
    app.request({
      url: '/api/categories/feed-types',
      method: 'GET'
    }).then((res) => {
      if (res && res.success) {
        const list = (res.data || []).map(item => {
          // 转换类型为中文
          if (item.type) {
            const typeOption = this.data.typeOptions.find(opt => opt.value === item.type)
            if (typeOption) {
              item.typeLabel = typeOption.label
            } else {
              item.typeLabel = item.type
            }
          }
          return item
        })
        this.setData({ feedTypes: list })
      }
    })
  },

  showAddModal() {
    this.setData({
      showModal: true,
      isEditing: false,
      editingId: null,
      newFeed: { name: '', brand: '', type: '', unit: 'g' },
      selectedTypeLabel: '',
      unitIsGram: true,
      unitSelected: 'g'
    })
  },

  hideAddModal() {
    this.setData({ showModal: false })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`newFeed.${field}`]: value
    })
  },

  onUnitSwitchChange(e) {
    const checked = !!(e && e.detail && e.detail.value)
    this.setData({
      unitIsGram: checked,
      'newFeed.unit': checked ? 'g' : 'ml'
    })
  },

  setUnit(e) {
    const val = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.unit) || 'g'
    this.setData({ unitSelected: val, 'newFeed.unit': val, unitIsGram: val === 'g' })
  },

  saveFeedType() {
    const { name, brand, type } = this.data.newFeed
    if (!name.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    const payload = {
      name,
      brand,
      type,
      unit: this.data.newFeed.unit || (this.data.unitIsGram ? 'g' : 'ml')
    }
    if (this.data.isEditing && this.data.editingId) {
      app.request({
        url: `/api/categories/feed-types/${this.data.editingId}`,
        method: 'PUT',
        data: payload
      }).then((res) => {
        if (res && res.success) {
          this.hideAddModal()
          this.fetchFeedTypes()
          wx.showToast({ title: '更新成功' })
        } else {
          wx.showToast({ title: (res && res.message) || '更新失败', icon: 'none' })
        }
      })
    } else {
      app.request({
        url: '/api/categories/feed-types',
        method: 'POST',
        data: payload
      }).then((res) => {
        if (res && res.success) {
          this.hideAddModal()
          this.fetchFeedTypes()
          wx.showToast({ title: '添加成功' })
        } else {
          wx.showToast({ title: (res && res.message) || '添加失败', icon: 'none' })
        }
      })
    }
  },

  showEditModal(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.feedTypes || []).find(ft => String(ft.id) === String(id))
    if (!item) return
    const unit = item.unit === 'ml' ? 'ml' : 'g'
    const typeOpt = (this.data.typeOptions || []).find(o => o.value === (item.type || ''))
    this.setData({
      showModal: true,
      isEditing: true,
      editingId: id,
      newFeed: {
        name: item.name || '',
        brand: item.brand || '',
        type: item.type || '',
        unit
      },
      selectedTypeLabel: (typeOpt && typeOpt.label) || '',
      unitIsGram: unit === 'g',
      unitSelected: unit
    })
  },

  onTypeChange(e) {
    const idx = Number((e && e.detail && e.detail.value) || 0)
    const opts = this.data.typeOptions || []
    const opt = opts[idx]
    if (!opt) return
    const shouldMl = opt.value === 'milk_powder' || opt.value === 'supplement'
    const nextUnit = shouldMl ? 'ml' : (this.data.newFeed.unit || 'g')
    this.setData({
      'newFeed.type': opt.value,
      selectedTypeLabel: opt.label,
      'newFeed.unit': nextUnit,
      unitSelected: nextUnit,
      unitIsGram: nextUnit === 'g'
    })
  },

  deleteFeedType(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定要删除该食物类型吗？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/api/categories/feed-types/${id}`,
            method: 'DELETE'
          }).then((res) => {
            if (res && res.success) {
              this.fetchFeedTypes()
              wx.showToast({ title: '删除成功' })
            } else {
              wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' })
            }
          })
        }
      }
    })
  }
  ,
  // 阻止弹窗内容点击冒泡
  stopPropagation() {
    return
  }
})
