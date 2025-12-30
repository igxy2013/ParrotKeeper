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
    ,
    useHostPopup: {
      type: Boolean,
      value: false
    }
  },

  data: {
    visible: false,
    tempColorIndex: 0,
    selectedSplitsDisplay: [],
    localSplits: [],
    searchKeyword: '',
    renderColors: []
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

      // Update render color list
      this.setRenderColors(colors);
    }
  },

  methods: {
    setRenderColors(colors) {
      const kw = String(this.data.searchKeyword || '').trim().toLowerCase();
      const src = Array.isArray(colors) ? colors : (this.data.colors || []);
      const list = (src || []).map((name, index) => {
        const raw = String(name || '')
        const disp = (raw === '黄边桃' || raw.includes('蓝腰黄桃')) ? '黄边桃(蓝腰黄桃)' : raw
        return { name: disp, index }
      });
      const filtered = kw
        ? list.filter(it => String(it.name || '').toLowerCase().includes(kw))
        : list;
      this.setData({ renderColors: filtered });
    },

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
      const { colorIndex, splitIds, splits, colors, useHostPopup } = this.data;
      const tempSplits = (splits || []).map(s => ({
        ...s,
        checked: (splitIds || []).includes(s.id)
      }));

      if (useHostPopup) {
        this.triggerEvent('open', {
          colorIndex,
          colors,
          splits: tempSplits,
          splitIds
        });
        return;
      }

      this.setData({
        visible: true,
        tempColorIndex: colorIndex,
        localSplits: tempSplits
      });
      
      this.setRenderColors(colors);
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
    },

    onSearchInput(e) {
      const kw = String((e && e.detail && e.detail.value) || '').trim();
      this.setData({ searchKeyword: kw });
      this.setRenderColors();
    },

    clearSearch() {
      this.setData({ searchKeyword: '' });
      this.setRenderColors();
    }
  }
})
