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
    }
  },

  onLoad() {
    this.loadParrots();
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
        const items = Array.isArray(res.data)
          ? res.data
          : (res && res.data && Array.isArray(res.data.items))
            ? res.data.items
            : (res && res.data && Array.isArray(res.data.records))
              ? res.data.records
              : [];

        const normalized = this.mapFeedingRecordsForUI(items);
        const aggregated = this.aggregateRecordsForUI(normalized);
        this.setData({
          feedingRecords: aggregated
        });
        this.filterRecords();
        // 使用后端按“今日”筛选的数据来统计，避免前端日期解析差异导致统计为0
        await this.calculateTodayStatsFromAPI();
      }
    } catch (error) {
      console.error('加载喂食记录失败:', error);
    }
  },

  // 规范化记录用于UI展示
  mapFeedingRecordsForUI(list) {
    return (Array.isArray(list) ? list : []).map(rec => {
      const formatted_date = this.formatDate(rec.feeding_time);
      const formatted_time = this.formatTime(rec.feeding_time);
      let food_types = [];
      if (rec.feed_type) {
        const name = rec.feed_type.name || rec.feed_type_name || '食物';
        food_types = [{ id: rec.feed_type.id, name, amount: rec.amount }];
      } else if (rec.feed_type_name) {
        food_types = [{ id: rec.feed_type_id, name: rec.feed_type_name, amount: rec.amount }];
      }
      return {
        ...rec,
        formatted_date,
        formatted_time,
        food_types
      };
    });
  },

  // 按事件维度聚合（与首页统计口径一致：按 feeding_time|amount|notes 分组）
  aggregateRecordsForUI(records) {
    const groups = {};
    (records || []).forEach(r => {
      const timeStr = r.feeding_time || r.record_time || r.time || '';
      const notesStr = r.notes || '';
      const amt = r.amount;
      const amtStr = typeof amt === 'number' ? String(amt) : (amt ? String(amt) : '');
      const key = `${timeStr}|${amtStr}|${notesStr}`;

      if (!groups[key]) {
        groups[key] = {
          key,
          feeding_time: r.feeding_time,
          formatted_date: r.formatted_date,
          formatted_time: r.formatted_time,
          notes: r.notes,
          parrot_ids: [],
          parrot_names: [],
          parrot_count: 0,
          parrot_avatar: null,
          parrot_avatar_map: {},
          // 聚合涉及的原始记录ID
          record_ids: [],
          // 聚合食物类型（按 id 汇总 amount）
          food_types_map: {},
          food_types: []
        };
      }

      const g = groups[key];
      // 收集原始记录ID
      if (r.id && !g.record_ids.includes(r.id)) {
        g.record_ids.push(r.id);
      }
      const pid = r.parrot_id || (r.parrot && r.parrot.id);
      const pname = r.parrot_name || (r.parrot && r.parrot.name);
      const pavatar = r.parrot && (r.parrot.photo_url || r.parrot.avatar_url);
      if (pid && !g.parrot_ids.includes(pid)) g.parrot_ids.push(pid);
      if (pname && !g.parrot_names.includes(pname)) g.parrot_names.push(pname);
      
      // 保存第一个鹦鹉的头像作为组头像
      if (!g.parrot_avatar && pavatar) {
        g.parrot_avatar = pavatar;
      }
      if (pid && pavatar && !g.parrot_avatar_map[pid]) {
        g.parrot_avatar_map[pid] = pavatar;
      }

      // 聚合食物类型
      if (Array.isArray(r.food_types) && r.food_types.length > 0) {
        // 保留事件级别的分量（不按鹦鹉数量累加），展示用户输入的单次数值
        r.food_types.forEach(ft => {
          const id = ft.id || r.feed_type_id;
          const name = ft.name || r.feed_type_name || '食物';
          const amount = typeof ft.amount === 'number' ? ft.amount : parseFloat(ft.amount || 0);
          const keyId = id || name;
          if (!g.food_types_map[keyId]) {
            g.food_types_map[keyId] = { id: id, name: name, amount: (amount || 0) };
          }
          // 若后续记录量不同，仍以首个记录为准，避免倍增显示
        });
      } else {
        // 无食物类型时，聚合到一个总量项，展示单次输入的数值，不累加
        const keyId = r.feed_type_id || 'none';
        const name = r.feed_type_name || '总用量';
        const amount = typeof r.amount === 'number' ? r.amount : parseFloat(r.amount || 0);
        if (!g.food_types_map[keyId]) {
          g.food_types_map[keyId] = { id: r.feed_type_id, name, amount: (amount || 0) };
        }
      }
    });

    // 输出聚合结果
    const result = Object.values(groups).map(g => {
      const allParrots = Array.isArray(this.data && this.data.parrots) ? this.data.parrots : [];
      const names = g.parrot_names;
      let display = '';
      if (names.length <= 2) {
        display = names.join('、') || '鹦鹉组';
      } else {
        display = `${names.slice(0,2).join('、')} 等${names.length}只`;
      }
      // 生成头像数组（按 parrot_ids 顺序），优先使用记录内头像，其次从全量鹦鹉列表补齐
      // 改为对象数组以提供唯一 wx:key，避免重复警告
      const parrot_avatars = (g.parrot_ids || []).map((pid, idx) => {
        const fromGroup = g.parrot_avatar_map && g.parrot_avatar_map[pid];
        const url = fromGroup ? fromGroup : (function(){
          const p = allParrots.find(x => x.id === pid);
          return p ? (p.photo_url || p.avatar_url) : null;
        })();
        return url ? { idx, url } : null;
      }).filter(Boolean);

      const firstAvatar = parrot_avatars.length ? parrot_avatars[0] : g.parrot_avatar;
      return {
        // 用 key 作为渲染唯一键，单条操作使用首个原始记录ID
        key: g.key,
        id: (g.record_ids && g.record_ids.length ? g.record_ids[0] : g.key),
        feeding_time: g.feeding_time,
        formatted_date: g.formatted_date,
        formatted_time: g.formatted_time,
        notes: g.notes,
        parrot_avatars: parrot_avatars,
        record_ids: g.record_ids || [],
        parrot_ids: g.parrot_ids,
        parrot_names: g.parrot_names,
        parrot_names_display: display,
        parrot_count: g.parrot_ids.length,
        parrot_avatar: firstAvatar,
        food_types: Object.values(g.food_types_map).map(it => ({
          id: it.id,
          name: it.name,
          amount: Number((it.amount || 0).toFixed(1))
        })),
        // 供编辑页预填使用的食物类型ID集合
        feed_type_ids: Object.values(g.food_types_map)
          .map(it => it.id)
          .filter(id => id !== undefined && id !== null)
      };
    });

    // 按时间倒序（使用 iOS 安全解析）
    result.sort((a, b) => {
      const ta = (this.parseIOSDate(a.feeding_time) || new Date(0)).getTime();
      const tb = (this.parseIOSDate(b.feeding_time) || new Date(0)).getTime();
      return tb - ta;
    });
    return result;
  },

  // 筛选记录
  filterRecords() {
    const all = Array.isArray(this.data.feedingRecords) ? this.data.feedingRecords : [];
    let filtered = all;
    const now = new Date();
    
    // 根据时间筛选
    if (this.data.activeFilter !== '全部') {
      filtered = filtered.filter(record => {
        const recordDate = this.parseIOSDate(record.feeding_time) || new Date(0);
        
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
      filtered = filtered.filter(record => {
        const names = Array.isArray(record.parrot_names) ? record.parrot_names : [];
        return names.includes(this.data.selectedParrot);
      });
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
        const eventKeySet = new Set();

        items.forEach(record => {
          const pid = record.parrot_id || (record.parrot && record.parrot.id);
          if (pid) parrotSet.add(pid);
          const amt = record.amount;
          totalAmount += typeof amt === 'number' ? amt : parseFloat(amt || 0);
          const timeStr = record.feeding_time || record.record_time || record.time || '';
          const notesStr = record.notes || '';
          const amtStr = typeof amt === 'number' ? String(amt) : (amt ? String(amt) : '');
          const key = `${timeStr}|${amtStr}|${notesStr}`;
          eventKeySet.add(key);
        });

        this.setData({
          todayStats: {
            // 与首页统计口径一致：按 (feeding_time, amount, notes) 分组计数
            totalCount: eventKeySet.size,
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
    // 导航到添加喂食记录页面
    wx.navigateTo({
      url: '/pages/records/add-record/add-record?type=feeding'
    });
  },

  // 格式化日期
  formatDate(dateTime) {
    const date = this.parseIOSDate(dateTime) || new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 格式化时间
  formatTime(dateTime) {
    const date = this.parseIOSDate(dateTime) || new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // iOS 安全日期解析（支持常见字符串格式与时间戳）
  parseIOSDate(dateTime) {
    try {
      if (!dateTime) return null;
      if (dateTime instanceof Date) return dateTime;
      if (typeof dateTime === 'number') return new Date(dateTime);
      if (typeof dateTime === 'string') {
        const s = dateTime.trim();
        // 1) yyyy-MM-dd HH:mm[:ss]
        let m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (m) {
          return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
        }
        // 2) yyyy/MM/dd[ HH:mm[:ss]]
        m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
        if (m) {
          return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
        }
        // 3) ISO 或含时区，替换空格为 T 后尝试
        const iso = s.includes(' ') ? s.replace(' ', 'T') : s;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }
    } catch (e) {
      // 忽略错误并返回 null
    }
    return null;
  },

  // 编辑记录
  editRecord(e) {
    const { id, recordIds, parrotIds, feedTypeIds } = e.currentTarget.dataset;
    const parts = [
      `mode=edit`,
      `type=feeding`,
      `id=${encodeURIComponent(id)}`
    ];
    if (Array.isArray(recordIds) && recordIds.length > 1) {
      parts.push(`record_ids=${encodeURIComponent(recordIds.join(','))}`);
    }
    if (Array.isArray(parrotIds) && parrotIds.length) {
      parts.push(`parrot_ids=${encodeURIComponent(parrotIds.join(','))}`);
    }
    if (Array.isArray(feedTypeIds) && feedTypeIds.length) {
      parts.push(`food_type_ids=${encodeURIComponent(feedTypeIds.join(','))}`);
    }
    const url = `/pages/records/add-record/add-record?${parts.join('&')}`;
    wx.navigateTo({ url });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条喂食记录吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id);
        }
      }
    });
  },

  // 执行删除操作
  async performDelete(id) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const res = await app.request({
        url: `/api/records/feeding/${id}`,
        method: 'DELETE'
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadFeedingRecords();
      } else {
        wx.showToast({
          title: res.message || '删除失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  }
});
