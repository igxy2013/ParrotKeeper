Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated'
  },
  
  properties: {
    label: {
      type: String,
      value: '鸟'
    },
    gender: {
      type: String,
      value: 'male' // 'male' or 'female'
    },
    compact: {
      type: Boolean,
      value: false
    },
    colors: {
      type: Array,
      value: []
    },
    splits: {
      type: Array,
      value: [] // Array of {id, name}
    },
    colorIndex: {
      type: Number,
      value: 0
    },
    splitIds: {
      type: Array,
      value: []
    }
  },

  data: {
    visible: false,
    tempColorIndex: 0,
    selectedSplitsDisplay: [],
    localSplits: []
  },

  observers: {
    'colorIndex, splitIds, splits, colors': function(cIdx, sIds, splits, colors) {
      this.updateDisplay();
      
      if (!this.data.visible) {
        this.setData({
          tempColorIndex: cIdx
        });
      }
      
      // Update splits checked state for internal rendering
      if (splits && splits.length) {
        const updatedSplits = splits.map(s => ({
          ...s,
          checked: sIds.includes(s.id)
        }));
        this.setData({
          localSplits: updatedSplits
        });
      }
    }
  },

  methods: {
    updateDisplay() {
      const { splitIds, splits } = this.data;
      if (!splits || !splitIds) return;
      
      const display = splitIds.map(id => {
        const found = splits.find(s => s.id == id);
        return found ? found.name : '';
      }).filter(Boolean);
      
      this.setData({
        selectedSplitsDisplay: display
      });
    },

    openSelector() {
      // Init temp state from props
      const { colorIndex, splitIds, splits } = this.data;
      
      const tempSplits = splits.map(s => ({
        ...s,
        checked: splitIds.includes(s.id)
      }));

      this.setData({
        visible: true,
        tempColorIndex: colorIndex,
        localSplits: tempSplits
      });
    },

    closeSelector() {
      this.setData({ visible: false });
    },

    selectColor(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({ tempColorIndex: index });
    },

    toggleSplit(e) {
      const id = e.currentTarget.dataset.id;
      const { localSplits } = this.data;
      const newSplits = localSplits.map(s => {
        if (s.id == id) {
          return { ...s, checked: !s.checked };
        }
        return s;
      });
      this.setData({ localSplits: newSplits });
    },

    confirmSelection() {
      const { tempColorIndex, localSplits } = this.data;
      const selectedSplitIds = (localSplits || []).filter(s => s.checked).map(s => s.id);
      
      this.triggerEvent('change', {
        colorIndex: tempColorIndex,
        splitIds: selectedSplitIds
      });
      
      this.closeSelector();
    },

    preventTouchMove() {
      // Block background scrolling
      return;
    }
  }
})
