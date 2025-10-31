Component({
  options: {
    multipleSlots: true, // 允许使用具名插槽，如 slot="actions"
    styleIsolation: 'apply-shared' // 使页面样式能作用到组件与插槽内容
  },
  properties: {
    title: { type: String, value: '鹦鹉管家' },
    subtitle: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    theme: { type: String, value: '' }, // 主题：''(默认绿色)、'orange'、'blue'、'purple'、'pink'
    // 是否由页面自定义返回逻辑；为 true 时仅派发 back 事件，不做默认导航
    customBack: { type: Boolean, value: false }
  },
  data: {
    statusBarPadding: 20,
    menuRightPadding: 0,
    themeClass: ''
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
        let themeClass = ''
        switch (this.properties.theme) {
          case 'orange':
            themeClass = 'ah-theme-orange'; break;
          case 'blue':
            themeClass = 'ah-theme-blue'; break;
          case 'purple':
            themeClass = 'ah-theme-purple'; break;
          case 'pink':
            themeClass = 'ah-theme-pink'; break;
          default:
            themeClass = '';
        }
        this.setData({ statusBarPadding: padding, menuRightPadding, themeClass })
      } catch (e) {
        let themeClass = ''
        switch (this.properties.theme) {
          case 'orange':
            themeClass = 'ah-theme-orange'; break;
          case 'blue':
            themeClass = 'ah-theme-blue'; break;
          case 'purple':
            themeClass = 'ah-theme-purple'; break;
          case 'pink':
            themeClass = 'ah-theme-pink'; break;
          default:
            themeClass = '';
        }
        this.setData({ statusBarPadding: 20, menuRightPadding: 0, themeClass })
      }
    }
  },
  methods: {
    onBack() {
      if (this.properties.customBack) {
        this.triggerEvent('back')
      } else {
        wx.navigateBack({ delta: 1 })
      }
    }
  }
})
