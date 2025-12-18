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
    selectedSplitsDisplay: []
  },

  observers: {
    'colorIndex, splitIds, splits, colors': function(cIdx, sIds, splits, colors) {
      this.updateDisplay();
      
      // Sync props to temp state for editing
      // We do this when the modal opens, but also init here
      this.setData({
        tempColorIndex: cIdx
      });
      
      // Update splits checked state for internal rendering
      if (splits && splits.length) {
        const updatedSplits = splits.map(s => ({
          ...s,
          checked: sIds.includes(s.id)
        }));
        // Note: we can't directly update 'splits' prop effectively if it's an object reference loop, 
        // but here we are creating a new array.
        // However, modifying the property 'splits' itself might be an anti-pattern if we want to keep it pure.
        // Let's rely on the parent to pass clean data, OR we use a local data copy.
        // For simple interaction, I will toggle the local 'checked' state in 'tempSplits' in data.
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
        splits: tempSplits // Update the view with checked status
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
      const { splits } = this.data;
      const newSplits = splits.map(s => {
        if (s.id == id) {
          return { ...s, checked: !s.checked };
        }
        return s;
      });
      this.setData({ splits: newSplits });
    },

    confirmSelection() {
      const { tempColorIndex, splits } = this.data;
      const selectedSplitIds = splits.filter(s => s.checked).map(s => s.id);
      
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
