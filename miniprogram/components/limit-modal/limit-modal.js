const app = getApp()

Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '数量限制提示' },
    limitCount: { type: Number, value: 5 }
  },
  data: {
    code: ''
  },
  methods: {
    stopPropagation() {},
    onCancel() { this.triggerEvent('cancel') },
    onUpgrade() { this.triggerEvent('upgrade') },
    onCodeInput(e) { this.setData({ code: e.detail.value }) },
    onRedeem() {
      const code = (this.data.code || '').trim()
      this.triggerEvent('redeem', { code })
    }
  }
})

