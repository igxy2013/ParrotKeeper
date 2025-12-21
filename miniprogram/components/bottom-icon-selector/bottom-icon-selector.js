Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '请选择' },
    options: { type: Array, value: [] },
    multiple: { type: Boolean, value: false },
    selected: { type: String, value: '' },
    selectedValues: { type: Array, value: [] },
    columns: { type: Number, value: 5 },
    confirmButton: { type: Boolean, value: true },
    confirmText: { type: String, value: '确定' },
    cancelText: { type: String, value: '关闭' }
  },

  methods: {
    onOverlayTap() {
      this.triggerEvent('close')
    },
    stopPropagation() {},
    onSelect(e) {
      const { value } = e.currentTarget.dataset
      const { multiple, selected } = this.data
      if (multiple) {
        let list = this.data.selectedValues
        if (!Array.isArray(list)) list = []
        list = list.slice()
        
        const valueStr = String(value)
        const i = list.findIndex(item => String(item) === valueStr)
        
        if (i >= 0) list.splice(i, 1)
        else list.push(valueStr)
        
        this.setData({ selectedValues: list })
        this.triggerEvent('change', { values: list })
      } else {
        // Toggle selection: if clicking the already selected item, deselect it
        const newValue = selected === value ? '' : value
        this.setData({ selected: newValue })
        this.triggerEvent('change', { value: newValue })
      }
    },
    onConfirm() {
      const { multiple, selectedValues, selected } = this.data
      if (multiple) this.triggerEvent('confirm', { values: selectedValues })
      else this.triggerEvent('confirm', { value: selected })
      this.triggerEvent('close')
    },
    onClose() {
      this.triggerEvent('close')
    }
  }
})
