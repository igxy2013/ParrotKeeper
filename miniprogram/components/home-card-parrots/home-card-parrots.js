Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    count: { type: Number, value: 0 }
  },
  methods: {
    onTap() { this.triggerEvent('tap') }
  }
})
