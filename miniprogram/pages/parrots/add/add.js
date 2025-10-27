// pages/parrots/add/add.js
Page({
  data: {
    name: '',
    species: ''
  },
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },
  onSpeciesInput(e) {
    this.setData({ species: e.detail.value })
  },
  goBack() {
    wx.navigateBack({ delta: 1 })
  },
  saveParrot() {
    // 仅占位，后续可接入真实保存逻辑
    wx.showToast({ title: '已保存（示例）', icon: 'success' })
    this.goBack()
  }
})

