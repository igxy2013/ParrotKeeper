Component({
  properties: {
    visible: { type: Boolean, value: false },
    notifications: { type: Array, value: [] }
  },
  data: {
    isOpen: false,
    closing: false
  },
  observers: {
    visible(v) {
      if (v) {
        // 打开：立刻显示并重置关闭状态
        this.setData({ isOpen: true, closing: false })
        if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null }
      } else {
        // 关闭：先播放关闭动画，再隐藏
        if (this.data.isOpen) {
          this.setData({ closing: true })
          if (this._closeTimer) { clearTimeout(this._closeTimer) }
          this._closeTimer = setTimeout(() => {
            this.setData({ isOpen: false, closing: false })
            this._closeTimer = null
          }, 220)
        }
      }
    }
  },
  lifetimes: {
    detached() {
      if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null }
    }
  },
  methods: {
    close() { this.triggerEvent('close') },
    markAllRead() { this.triggerEvent('markAllRead') },
    clearAll() { this.triggerEvent('clearAll') },
    onItemTap(e) {
      const id = e.currentTarget.dataset.id
      this.triggerEvent('itemTap', { id })
    },
    noop() {},
    onOverlayTap() { this.triggerEvent('close') }
  }
})
