// pages/records/feeding/feeding.js
const app = getApp()

Page({
  data: {
    // 鹦鹉列表
    parrots: [],
    // 喂食记录
    feedingRecords: [],
    // 筛选后的记录
    filteredRecords: [],
    // 当前选择的鹦鹉
    selectedParrot: '全部',
    // 筛选标签
    filterTags: ['全部', '今天', '昨天', '本周', '本月'],
    activeFilter: '全部',
    // 今日统计
    todayStats: {
      totalCount: 0,
      parrotCount: 0,
      totalAmount: 0
    },
    // 添加记录模态框
    showAddModal: false,
    // 新记录数据
    newRecord: {
      parrotIds: [],
      foodTypes: [],
      amount: '',
      foodAmounts: {},
      date: '',
      time: '',
      notes: '',
      photos: []
    },
    // 选择器状态
    showParrotPicker: false,
    showFoodTypePicker: false,
    // 选择器数据
    selectedParrotNames: '',
    selectedFoodTypeNames: '',
    selectedFoodTypes: [],
    // 食物类型列表
    foodTypeList: []
  },

  onLoad() {
    this.loadParrots();
    this.loadFoodTypes();
    this.loadFeedingRecords();
  },

  onShow() {
    this.loadFeedingRecords();
  },

  onPullDownRefresh() {
    this.loadFeedingRecords().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载鹦鹉列表
  async loadParrots() {
    try {
      const res = await app.request({
        url: '/api/parrots',
        method: 'GET'
      });
      
      if (res.success) {
        const parrots = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.parrots))
            ? res.data.parrots
            : (res.data && Array.isArray(res.data.items))
              ? res.data.items
              : [];
        this.setData({ parrots });
      }
    } catch (error) {
      console.error('加载鹦鹉列表失败:', error);
    }
  },

  // 加载食物类型列表
  async loadFoodTypes() {
    try {
      const res = await app.request({
        url: '/api/records/feed-types',
        method: 'GET'
      });
      
      if (res.success) {
        this.setData({
          foodTypeList: res.data
        });
      }
    } catch (error) {
      console.error('加载食物类型失败:', error);
    }
  },

  // 加载喂食记录
  async loadFeedingRecords() {
    try {
      const res = await app.request({
        url: '/api/records/feeding',
        method: 'GET'
      });
      
      if (res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res && res.data && Array.isArray(res.data.records))
            ? res.data.records
            : [];
        this.setData({
          feedingRecords: list
        });
        this.filterRecords();
        // 使用后端按“今日”筛选的数据来统计，避免前端日期解析差异导致统计为0
        await this.calculateTodayStatsFromAPI();
      }
    } catch (error) {
      console.error('加载喂食记录失败:', error);
    }
  },

  // 筛选记录
  filterRecords() {
    const all = Array.isArray(this.data.feedingRecords) ? this.data.feedingRecords : [];
    let filtered = all;
    const now = new Date();
    
    // 根据时间筛选
    if (this.data.activeFilter !== '全部') {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.feeding_time);
        
        switch (this.data.activeFilter) {
          case '今天':
            return this.isSameDay(recordDate, now);
          case '昨天':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return this.isSameDay(recordDate, yesterday);
          case '本周':
            return this.isSameWeek(recordDate, now);
          case '本月':
            return this.isSameMonth(recordDate, now);
          default:
            return true;
        }
      });
    }
    
    // 根据鹦鹉筛选
    if (this.data.selectedParrot !== '全部') {
      filtered = filtered.filter(record => 
        record.parrot_name === this.data.selectedParrot
      );
    }
    
    this.setData({
      filteredRecords: filtered
    });
  },

  // 计算今日统计（基于后端过滤，避免前端时间解析差异）
  async calculateTodayStatsFromAPI() {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const res = await app.request({
        url: '/api/records/feeding',
        method: 'GET',
        data: {
          start_date: todayStr,
          end_date: todayStr,
          page: 1,
          per_page: 100
        }
      });

      if (res && res.success) {
        const items = Array.isArray(res.data)
          ? res.data
          : (res.data && Array.isArray(res.data.items))
            ? res.data.items
            : [];

        const parrotSet = new Set();
        let totalAmount = 0;

        items.forEach(record => {
          const pid = record.parrot_id || (record.parrot && record.parrot.id);
          if (pid) parrotSet.add(pid);
          const amt = record.amount;
          totalAmount += typeof amt === 'number' ? amt : parseFloat(amt || 0);
        });

        this.setData({
          todayStats: {
            totalCount: items.length,
            parrotCount: parrotSet.size,
            totalAmount: Number(totalAmount.toFixed(1))
          }
        });
      }
    } catch (err) {
      console.error('计算今日喂食统计失败:', err);
      // 回退到前端计算，尽力而为
      this.calculateTodayStatsFallback();
    }
  },

  // 前端回退计算（若后端请求异常，仅用于兜底）
  calculateTodayStatsFallback() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const all = Array.isArray(this.data.feedingRecords) ? this.data.feedingRecords : [];
    const todayRecords = all.filter(record => {
      const ts = record.feeding_time || record.record_time || record.time || '';
      const match = typeof ts === 'string' ? ts.match(/^(\d{4}-\d{2}-\d{2})/) : null;
      const datePart = match && match[1] ? match[1] : '';
      return datePart === todayStr;
    });

    const parrotSet = new Set();
    let totalAmount = 0;

    todayRecords.forEach(record => {
      const pid = record.parrot_id || (record.parrot && record.parrot.id);
      if (pid) parrotSet.add(pid);
      const amt = record.amount;
      totalAmount += typeof amt === 'number' ? amt : parseFloat(amt || 0);
    });

    this.setData({
      todayStats: {
        totalCount: todayRecords.length,
        parrotCount: parrotSet.size,
        totalAmount: Number(totalAmount.toFixed(1))
      }
    });
  },

  // 日期比较辅助函数
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },

  isSameWeek(date1, date2) {
    const startOfWeek = new Date(date2);
    startOfWeek.setDate(date2.getDate() - date2.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return date1 >= startOfWeek && date1 <= endOfWeek;
  },

  isSameMonth(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  },

  // 筛选标签点击
  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter
    });
    this.filterRecords();
  },

  // 选择鹦鹉筛选
  selectParrot(e) {
    const parrot = e.currentTarget.dataset.parrot;
    this.setData({
      selectedParrot: parrot
    });
    this.filterRecords();
  },

  // 返回按钮
  handleBack() {
    wx.navigateBack();
  },

  // 显示添加表单
  showAddForm() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    
    this.setData({
      showAddModal: true,
      'newRecord.date': date,
      'newRecord.time': time,
      'newRecord.parrotIds': [],
      'newRecord.foodTypes': [],
      'newRecord.amount': '',
      'newRecord.foodAmounts': {},
      'newRecord.notes': '',
      'newRecord.photos': [],
      selectedParrotNames: '',
      selectedFoodTypeNames: '',
      selectedFoodTypes: []
    });
  },

  // 隐藏添加表单
  hideAddForm() {
    this.setData({
      showAddModal: false
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 显示鹦鹉选择器
  showParrotPicker() {
    this.setData({
      showParrotPicker: true
    });
  },

  // 隐藏鹦鹉选择器
  hideParrotPicker() {
    this.setData({
      showParrotPicker: false
    });
  },

  // 切换鹦鹉选择
  toggleParrot(e) {
    const parrotId = e.currentTarget.dataset.id || e.currentTarget.dataset.parrotId;
    const parrotIds = [...this.data.newRecord.parrotIds];
    const index = parrotIds.indexOf(parrotId);
    
    if (index > -1) {
      parrotIds.splice(index, 1);
    } else {
      parrotIds.push(parrotId);
    }
    
    this.setData({
      'newRecord.parrotIds': parrotIds
    });
  },

  // 确认鹦鹉选择
  confirmParrotSelection() {
    const selectedParrots = this.data.parrots.filter(parrot => 
      this.data.newRecord.parrotIds.includes(parrot.id)
    );
    const names = selectedParrots.map(parrot => parrot.name).join(', ');
    
    this.setData({
      selectedParrotNames: names,
      showParrotPicker: false
    });
  },

  // 显示食物类型选择器
  showFoodTypePicker() {
    this.setData({
      showFoodTypePicker: true
    });
  },

  // 隐藏食物类型选择器
  hideFoodTypePicker() {
    this.setData({
      showFoodTypePicker: false
    });
  },

  // 切换食物类型选择
  toggleFoodType(e) {
    const foodTypeId = e.currentTarget.dataset.id || e.currentTarget.dataset.foodId;
    const foodTypes = [...this.data.newRecord.foodTypes];
    const index = foodTypes.indexOf(foodTypeId);
    
    if (index > -1) {
      foodTypes.splice(index, 1);
    } else {
      foodTypes.push(foodTypeId);
    }
    
    this.setData({
      'newRecord.foodTypes': foodTypes
    });
  },

  // 确认食物类型选择
  confirmFoodTypeSelection() {
    const selectedFoodTypes = this.data.foodTypeList.filter(foodType => 
      this.data.newRecord.foodTypes.includes(foodType.id)
    );
    const names = selectedFoodTypes.map(foodType => foodType.name).join(', ');
    
    this.setData({
      selectedFoodTypeNames: names,
      selectedFoodTypes: selectedFoodTypes,
      showFoodTypePicker: false
    });
  },

  // 输入总量
  onAmountInput(e) {
    this.setData({
      'newRecord.amount': e.detail.value
    });
  },

  // 输入各食物类型的量
  onFoodAmountInput(e) {
    const foodTypeId = e.currentTarget.dataset.id || e.currentTarget.dataset.foodId;
    const amount = e.detail.value;
    
    this.setData({
      [`newRecord.foodAmounts.${foodTypeId}`]: amount
    });
  },

  // 日期改变
  onDateChange(e) {
    this.setData({
      'newRecord.date': e.detail.value
    });
  },

  // 时间改变
  onTimeChange(e) {
    this.setData({
      'newRecord.time': e.detail.value
    });
  },

  // 备注输入
  onNotesInput(e) {
    this.setData({
      'newRecord.notes': e.detail.value
    });
  },

  // 选择照片
  choosePhoto() {
    wx.chooseImage({
      count: 9 - this.data.newRecord.photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const photos = [...this.data.newRecord.photos, ...res.tempFilePaths];
        this.setData({
          'newRecord.photos': photos
        });
      }
    });
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.newRecord.photos];
    photos.splice(index, 1);
    
    this.setData({
      'newRecord.photos': photos
    });
  },

  // 保存记录
  async saveRecord() {
    const { newRecord } = this.data;
    
    // 验证必填字段
    if (newRecord.parrotIds.length === 0) {
      wx.showToast({
        title: '请选择鹦鹉',
        icon: 'none'
      });
      return;
    }
    
    if (newRecord.foodTypes.length === 0) {
      wx.showToast({
        title: '请选择食物类型',
        icon: 'none'
      });
      return;
    }
    
    if (!newRecord.date || !newRecord.time) {
      wx.showToast({
        title: '请选择日期和时间',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '保存中...'
      });

      // 上传照片
      let photoUrls = [];
      if (newRecord.photos.length > 0) {
        for (let photo of newRecord.photos) {
          const uploadRes = await app.uploadFile({
            url: '/api/upload',
            filePath: photo,
            name: 'file'
          });
          
          if (uploadRes.success) {
            photoUrls.push(uploadRes.data.url);
          }
        }
      }

      // 构建请求数据
      const feedingTime = `${newRecord.date} ${newRecord.time}:00`;
      
      // 为每个鹦鹉创建记录
      for (let parrotId of newRecord.parrotIds) {
        for (let foodTypeId of newRecord.foodTypes) {
          const amount = newRecord.foodAmounts[foodTypeId] || newRecord.amount || '0';
          
          const recordData = {
            parrot_id: parrotId,
            food_type_id: foodTypeId,
            amount: parseFloat(amount),
            feeding_time: feedingTime,
            notes: newRecord.notes,
            photos: photoUrls
          };

          await app.request({
            url: '/api/records/feeding',
            method: 'POST',
            data: recordData
          });
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      this.hideAddForm();
      this.loadFeedingRecords();
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存记录失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 格式化日期
  formatDate(dateTime) {
    const date = new Date(dateTime);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 格式化时间
  formatTime(dateTime) {
    const date = new Date(dateTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
