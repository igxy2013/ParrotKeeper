Component({
  options: {
    multipleSlots: true, // 允许使用具名插槽，如 slot="actions"
    styleIsolation: 'apply-shared' // 使页面样式能作用到组件与插槽内容
  },
  properties: {
    title: { type: String, value: '鹦鹉管家' },
    subtitle: { type: String, value: '' },
    showBack: { type: Boolean, value: false }
  },
  data: {
    statusBarPadding: 20,
    menuRightPadding: 0
  },
  lifetimes: {
    attached() {
      try {
        const win = wx.getWindowInfo ? wx.getWindowInfo() : {}
        const padding = (win && typeof win.statusBarHeight === 'number') ? win.statusBarHeight : 20
        let menuRightPadding = 0
        try {
          const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
          if (rect && win && typeof win.windowWidth === 'number') {
            const rightGap = win.windowWidth - rect.right
            menuRightPadding = rightGap + rect.width + 8 // 额外留一点间距
          }
        } catch (e) { /* 胶囊获取失败则不留白 */ }
        this.setData({ statusBarPadding: padding, menuRightPadding })
      } catch (e) {
        this.setData({ statusBarPadding: 20, menuRightPadding: 0 })
      }
    }
  },
  methods: {
    onBack() { wx.navigateBack({ delta: 1 }) }
  }
})
