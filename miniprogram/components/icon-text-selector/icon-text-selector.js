// components/icon-text-selector/icon-text-selector.js
Component({
  properties: {
    // 选项列表，格式：[{ label: '餐饮', value: 'food', icon: '/path/to/icon' }]
    options: {
      type: Array,
      value: []
    },
    // 当前选中的值
    selected: {
      type: String,
      value: null
    }
  },

  methods: {
    onSelect(e) {
      const { value } = e.currentTarget.dataset;
      this.triggerEvent('change', { value });
    }
  }
})
