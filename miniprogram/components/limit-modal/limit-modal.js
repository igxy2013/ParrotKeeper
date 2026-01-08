const app = getApp()

Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '数量限制提示' },
    limitCount: { type: Number, value: 5 },
    mode: { type: String, value: 'limit' },
    message: { type: String, value: '' },
    cancelText: { type: String, value: '我知道了' },
    confirmText: { type: String, value: '' },
    showUpgrade: { type: Boolean, value: true },
    showRedeem: { type: Boolean, value: true }
  },
  data: {
    code: ''
  },
  methods: {
    stopPropagation() {},
    onCancel() { this.triggerEvent('cancel') },
    onConfirm() { this.triggerEvent('confirm') },
    onUpgrade() { this.triggerEvent('upgrade') },
    onCodeInput(e) { this.setData({ code: e.detail.value }) },
    onRedeem() {
      const code = (this.data.code || '').trim()
      this.triggerEvent('redeem', { code })
    }
  }
})

