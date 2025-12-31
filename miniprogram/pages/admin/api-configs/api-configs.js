// pages/admin/api-configs/api-configs.js
const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: true,
    configs: {},
    removeBgList: [],
    aliyunList: [],
    showAddModal: false,
    currentGroup: 'remove',
    addForm: { tag: '', api_key: '', api_url: '', base_url: '', model: '' },
    editingIndex: null,
    modelOptions: ['qwen3-coder-plus', 'qwen-flash', 'deepseek-v3.2', 'qwen3-omni-flash-2025-12-01'],
  },

  onShow() { this.initAccessAndLoad() },

  initAccessAndLoad() {
    const isSuperAdmin = app.isSuperAdmin()
    this.setData({ isSuperAdmin })
    if (!isSuperAdmin) return
    this.loadConfigs()
  },

  async loadConfigs() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/admin/api-configs', method: 'GET' })
      if (res && res.success) {
        const configs = (res.data && res.data.configs) || {}
        const lists = (res.data && res.data.lists) || {}
        const removeBgList = Array.isArray(lists.remove_bg_list) ? lists.remove_bg_list.map(it => ({ tag: it.tag || '', api_key: it.api_key || '', api_key_masked: it.api_key_masked || '', api_url: it.api_url || '', remaining_quota: (typeof it.remaining_quota === 'number' ? it.remaining_quota : 50), is_top: it.is_top || false })) : []
        const aliyunList = Array.isArray(lists.aliyun_list) ? lists.aliyun_list.map(it => ({ tag: it.tag || '', api_key: it.api_key || '', api_key_masked: it.api_key_masked || '', base_url: it.base_url || '', model: it.model || '', is_top: it.is_top || false })) : []
        
        // Sort lists to ensure top items are first
        removeBgList.sort((a, b) => (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0))
        aliyunList.sort((a, b) => (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0))
        
        this.setData({ configs, removeBgList, aliyunList })
      } else {
        wx.showToast({ title: (res && res.message) || '获取配置失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  openAddModal(e) {
    const group = e.currentTarget.dataset.group || 'remove'
    const defaults = group === 'remove'
      ? { tag: '', api_key: '', api_url: 'https://api.remove.bg/v1.0/removebg', base_url: '', model: '' }
      : { tag: '', api_key: '', api_url: '', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '' }
    this.setData({ currentGroup: group, addForm: defaults, showAddModal: true, editingIndex: null })
  },

  closeAddModal() { this.setData({ showAddModal: false, editingIndex: null }) },

  onAddInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const form = Object.assign({}, this.data.addForm)
    form[field] = value
    this.setData({ addForm: form })
  },

  onModelChange(e) {
    const index = e.detail.value
    const value = this.data.modelOptions[index]
    const form = Object.assign({}, this.data.addForm)
    form.model = value
    this.setData({ addForm: form })
  },

  async submitAdd() {
    const group = this.data.currentGroup
    const f = this.data.addForm || {}
    const editingIndex = this.data.editingIndex
    if (group === 'remove') {
      if (!(f.api_key || '').trim() || !(f.api_url || '').trim()) {
        wx.showToast({ title: '请填写API Key与URL', icon: 'none' })
        return
      }
      const list = (this.data.removeBgList || []).slice()
      const item = { tag: (f.tag || '').trim(), api_key: (f.api_key || '').trim(), api_url: (f.api_url || '').trim() }
      if (editingIndex !== null && editingIndex !== undefined && list[editingIndex]) { list[editingIndex] = item } else { list.push(item) }
      await this.saveLists(list, this.data.aliyunList)
    } else {
      if (!(f.api_key || '').trim() || (!((f.base_url || '').trim()) && !((f.model || '').trim()))) {
        wx.showToast({ title: '请填写API Key与Base URL或Model', icon: 'none' })
        return
      }
      const list = (this.data.aliyunList || []).slice()
      const item = { tag: (f.tag || '').trim(), api_key: (f.api_key || '').trim(), base_url: (f.base_url || '').trim(), model: (f.model || '').trim() }
      if (editingIndex !== null && editingIndex !== undefined && list[editingIndex]) { list[editingIndex] = item } else { list.push(item) }
      await this.saveLists(this.data.removeBgList, list)
    }
    this.setData({ showAddModal: false, editingIndex: null })
    this.loadConfigs()
  },

  async deleteItem(e) {
    const group = e.currentTarget.dataset.group
    const index = e.currentTarget.dataset.index
    if (index === undefined) return
    if (group === 'remove') {
      const list = (this.data.removeBgList || []).slice()
      list.splice(index, 1)
      await this.saveLists(list, this.data.aliyunList)
    } else if (group === 'aliyun') {
      const list = (this.data.aliyunList || []).slice()
      list.splice(index, 1)
      await this.saveLists(this.data.removeBgList, list)
    }
    this.loadConfigs()
  },

  openEditModal(e) {
    const group = e.currentTarget.dataset.group || 'remove'
    const index = e.currentTarget.dataset.index
    if (index === undefined) return
    if (group === 'remove') {
      const item = (this.data.removeBgList || [])[index]
      if (!item) return
      const form = { tag: item.tag || '', api_key: item.api_key || '', api_url: item.api_url || '', base_url: '', model: '' }
      this.setData({ currentGroup: group, addForm: form, showAddModal: true, editingIndex: index })
    } else {
      const item = (this.data.aliyunList || [])[index]
      if (!item) return
      const form = { tag: item.tag || '', api_key: item.api_key || '', api_url: '', base_url: item.base_url || '', model: item.model || '' }
      this.setData({ currentGroup: group, addForm: form, showAddModal: true, editingIndex: index })
    }
  },

  async toggleTop(e) {
    const group = e.currentTarget.dataset.group
    const index = e.currentTarget.dataset.index
    if (index === undefined) return
    
    let removeList = (this.data.removeBgList || []).slice()
    let aliyunList = (this.data.aliyunList || []).slice()
    
    if (group === 'remove') {
      const item = removeList[index]
      item.is_top = !item.is_top
      if (item.is_top) {
        removeList.forEach((it, idx) => {
          if (idx !== index) it.is_top = false
        })
      }
      removeList.sort((a, b) => (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0))
    } else if (group === 'aliyun') {
      const item = aliyunList[index]
      item.is_top = !item.is_top
      if (item.is_top) {
        aliyunList.forEach((it, idx) => {
          if (idx !== index) it.is_top = false
        })
      }
      aliyunList.sort((a, b) => (b.is_top ? 1 : 0) - (a.is_top ? 1 : 0))
    }
    
    // Immediate UI update
    this.setData({
      removeBgList: removeList,
      aliyunList: aliyunList
    })
    
    await this.saveLists(removeList, aliyunList)
    this.loadConfigs()
  },

  async saveLists(removeList, aliyunList) {
    const payload = {
      remove_bg_list: (removeList || []).map(it => ({ tag: it.tag || '', api_key: it.api_key || '', api_url: it.api_url || '', is_top: it.is_top || false })),
      aliyun_list: (aliyunList || []).map(it => ({ tag: it.tag || '', api_key: it.api_key || '', base_url: it.base_url || '', model: it.model || '', is_top: it.is_top || false }))
    }
    try {
      const res = await app.request({ url: '/api/admin/api-configs', method: 'PUT', data: payload })
      if (res && res.success) {
        wx.showToast({ title: '操作成功', icon: 'none' })
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
      }
    } catch (_) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  async saveConfigs() {
    await this.saveLists(this.data.removeBgList, this.data.aliyunList)
    this.loadConfigs()
  }
  ,
  stopPropagation() {}
})
