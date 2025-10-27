Component({
  properties: {
    visible: { type: Boolean, value: false },
    notifications: { type: Array, value: [] }
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
