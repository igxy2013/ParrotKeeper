const app = getApp();
const { parseServerTime } = require('../../../utils/time')

Page({
  data: {
    loading: true,
    error: '',
    recordType: '',
    recordTypeLabel: '',
    recordId: '',
    recordIds: [],
    record: {},
    displayTime: '',
    parrotName: '',
    isAggregate: false,
    aggregateCount: 0,
    aggregateRecords: [],
    hasOperationPermission: false,
  },

  onLoad(options) {
    const recordType = options.type || '';
    const recordId = options.id || '';
    const recordIds = (options.record_ids ? (options.record_ids.split(',').filter(Boolean)) : []);
    const isAggregate = recordIds.length > 1;

    this.setData({
      recordType,
      recordId,
      recordIds,
      isAggregate,
      aggregateCount: isAggregate ? recordIds.length : (recordIds.length || (recordId ? 1 : 0)),
      recordTypeLabel: this.getTypeLabel(recordType)
    });

    try {
      const hop = app.hasOperationPermission && app.hasOperationPermission();
      this.setData({ hasOperationPermission: !!hop });
    } catch (_) {}

    if (isAggregate) {
      // 聚合详情：加载所有记录用于完整展示
      this.fetchAggregateRecords(recordType, recordIds);
    } else if (recordId || recordIds.length === 1) {
      // 单条详情：优先使用显式 id，否则用唯一的 record_ids
      const idToFetch = recordId || recordIds[0];
      this.fetchSingleRecord(recordType, idToFetch);
    } else {
      this.setData({ loading: false, error: '缺少记录标识' });
    }
  },

  getTypeLabel(type) {
    switch (type) {
      case 'feeding': return '喂食';
      case 'cleaning': return '清洁';
      case 'health': return '健康';
      case 'breeding': return '繁殖';
      default: return '记录';
    }
  },

  fetchSingleRecord(type, id) {
    this.setData({ loading: true, error: '' });
    app.request({
      url: `/records/${type}/${id}`,
      method: 'GET'
    }).then(res => {
      if (!res.success) {
        throw new Error(res.message || '获取记录失败');
      }
      const record = res.data || {};
      // 通用字段整理
      const displayTime = this.resolveDisplayTime(type, record);
      const recorderName = this.resolveRecorderName(record);
      const parrotName = (record.parrot_name || (record.parrot && record.parrot.name) || '');
      // 备注与描述统一为字符串
      record.notes = (record.notes == null ? '' : String(record.notes));
      record.description = (record.description == null ? '' : String(record.description));
      // 照片字段兼容处理：优先使用后端提供的 photos；否则尝试从 image_urls 解析
      record.photos = this.normalizePhotos(record);

      // 清洁类型与健康状态中文映射
      try {
        if (type === 'cleaning') {
          const cleaningTypeMap = {
            cage: '笼子清洁',
            toys: '玩具清洁',
            perches: '栖木清洁',
            food_water: '食物和水清洁',
            disinfection: '消毒',
            water_change: '饮用水更换',
            water_bowl_clean: '水碗清洁',
            bath: '鹦鹉洗澡'
          };
          const raw = record.cleaning_type || record.cleaning_type_name || '';
          if (!record.cleaning_type_text) {
            record.cleaning_type_text = cleaningTypeMap[raw] || record.cleaning_type_name || raw;
          }
        } else if (type === 'health') {
          const healthStatusMap = {
            healthy: '健康',
            sick: '生病',
            recovering: '康复中',
            observation: '观察中'
          };
          const raw = record.health_status || '';
          if (!record.health_status_text) {
            record.health_status_text = healthStatusMap[raw] || raw;
          }
        }
      } catch (e) {
        // 映射失败时忽略，保持原值
      }

      this.setData({
        record,
        displayTime,
        parrotName,
        recorderName,
        loading: false
      });
    }).catch(err => {
      this.setData({ loading: false, error: err.message || String(err) });
    });
  },

  normalizePhotos(record) {
    try {
      if (Array.isArray(record.photos)) {
        return record.photos.filter(u => typeof u === 'string' && u);
      }
      const iu = record.image_urls;
      if (!iu) return [];
      if (Array.isArray(iu)) {
        return iu.filter(u => typeof u === 'string' && u);
      }
      if (typeof iu === 'string') {
        // 兼容可能的逗号分隔或 JSON 字符串
        const s = iu.trim();
        if (!s) return [];
        // 优先尝试 JSON 解析
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) ? arr.filter(u => typeof u === 'string' && u) : [];
        } catch (e) {
          // 回退：逗号分隔
          return s.split(',').map(x => x.trim()).filter(Boolean);
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  previewPhoto(e) {
    const current = e.currentTarget.dataset.url;
    const urls = (this.data.record && Array.isArray(this.data.record.photos)) ? this.data.record.photos : [current];
    if (!current) return;
    wx.previewImage({
      current,
      urls
    });
  },

  editRecord() {
    try {
      if (!this.data.hasOperationPermission) {
        app.showError('您没有操作权限');
        return;
      }
      const type = this.data.recordType;
      const id = this.data.recordId;
      if (!type || !id || this.data.isAggregate) return;
      const url = `/pages/records/add-record/add-record?mode=edit&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
      wx.navigateTo({ url });
    } catch (_) {}
  },

  async deleteRecord() {
    try {
      if (!this.data.hasOperationPermission) {
        app.showError('您没有操作权限');
        return;
      }
      const type = this.data.recordType;
      const id = this.data.recordId;
      if (!type || !id || this.data.isAggregate) return;

      const confirmRes = await new Promise((resolve) => {
        wx.showModal({
          title: '确认删除',
          content: '确定要删除该记录吗？删除后无法恢复。',
          confirmText: '删除',
          confirmColor: '#ef4444',
          success: resolve,
          fail: () => resolve({ confirm: false })
        });
      });
      if (!confirmRes.confirm) return;

      wx.showLoading({ title: '删除中...' });
      const res = await app.request({ url: `/api/records/${type}/${id}`, method: 'DELETE' });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({ delta: 1 });
        }, 300);
      } else {
        wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  async fetchAggregateRecords(type, ids) {
    try {
      this.setData({ loading: true, error: '' })
      const requests = ids.map(id => app.request({ url: `/api/records/${type}/${id}`, method: 'GET' }))
      const results = await Promise.all(requests)
      const okItems = results
        .filter(r => r && r.success && r.data)
        .map(r => r.data)

      // 构建展示用列表项（按类型生成字段）
      const listItems = okItems.map(item => {
        const parrotName = (item.parrot && item.parrot.name) || item.parrot_name || ''
        const base = {
          id: item.id,
          parrotName,
          displayTime: this.resolveDisplayTime(type, item),
          recorderName: this.resolveRecorderName(item)
        }
        if (type === 'feeding') {
          const feedTypeName = item.feed_type_name || (item.feed_type && item.feed_type.name) || ''
          const amount = (item.amount !== undefined && item.amount !== null) ? item.amount : ''
          return { ...base, feedTypeName, amount }
        } else if (type === 'cleaning') {
          const cleaningTypeText = item.cleaning_type_text || item.cleaning_type_name || item.cleaning_type || ''
          const description = item.description || ''
          return { ...base, cleaningTypeText, description }
        } else if (type === 'health') {
          const healthStatusText = item.health_status_text || item.health_status || ''
          const weight = (item.weight !== undefined && item.weight !== null) ? item.weight : ''
          return { ...base, healthStatusText, weight }
        } else if (type === 'breeding') {
          return base
        }
        return base
      })

      // 头部信息：统一显示第一个记录的时间与记录人；鹦鹉名聚合显示
      const headerRecord = okItems[0] || {}
      const headerTime = this.resolveDisplayTime(type, headerRecord)
      const headerRecorder = this.resolveRecorderName(headerRecord)
      const uniqueParrots = Array.from(new Set(listItems.map(x => x.parrotName).filter(Boolean)))

      this.setData({
        aggregateRecords: listItems,
        displayTime: headerTime,
        recorderName: headerRecorder,
        parrotName: uniqueParrots.join('、'),
        loading: false
      })
    } catch (e) {
      console.error('加载聚合记录失败:', e)
      this.setData({ loading: false, error: '聚合记录加载失败' })
    }
  },

  resolveDisplayTime(type, record) {
    

    const formatLocal = (dt) => (dt ? app.formatDateTime(dt, 'YYYY-MM-DD HH:mm:ss') : '')

    // 按类型选择主时间字段，避免使用 created_at 导致时区偏差
    if (type === 'health') {
      // 健康记录：优先 record_date + record_time，其次 record_time
      const recordDate = (record.record_date || '').trim()
      const recordTime = (record.record_time || '').trim()
      if (recordDate || recordTime) {
        let merged = ''
        if (recordDate && recordTime) {
          let rt = recordTime
          if (rt.length === 5) rt = `${rt}:00`
          if (rt.length > 8) rt = rt.substring(0, 8)
          merged = `${recordDate}T${rt}`
        } else {
          const s = recordDate || recordTime
          merged = s.includes(' ') ? s.replace(' ', 'T') : s
        }
        const dMerged = parseServerTime(merged)
        if (dMerged) return formatLocal(dMerged)
      }
      const dHealth = parseServerTime(record.record_time || '')
      if (dHealth) return formatLocal(dHealth)
    } else if (type === 'cleaning') {
      // 清洁记录：优先 cleaning_time
      const dCleaning = parseServerTime(record.cleaning_time || '')
      if (dCleaning) return formatLocal(dCleaning)
    } else if (type === 'feeding') {
      // 喂食记录：优先 feeding_time
      const dFeeding = parseServerTime(record.feeding_time || '')
      if (dFeeding) return formatLocal(dFeeding)
    } else if (type === 'breeding') {
      // 繁殖记录：优先专属字段，再回退 created_at
      const specific = record.mating_date || record.egg_laying_date || record.hatching_date || ''
      const dSpec = parseServerTime(specific)
      if (dSpec) return formatLocal(dSpec)
    }

    // 通用回退：updated_at -> created_at -> record_time
    const updated = record.updated_at || ''
    const dUpdated = parseServerTime(updated)
    if (dUpdated) return formatLocal(dUpdated)
    const created = record.created_at || ''
    const dCreated = parseServerTime(created)
    if (dCreated) return formatLocal(dCreated)
    const dPrimary = parseServerTime(record.record_time || '')
    if (dPrimary) return formatLocal(dPrimary)
    // 最后回退：原始字符串规范化为人类可读
    const s = String(updated || created || '').trim()
    if (!s) return ''
    if (s.includes('T')) {
      const x = s.replace('T', ' ').replace('Z', '').replace(/([\+\-]\d{2}:?\d{2})$/, '')
      return x.includes('.') ? x.split('.')[0].substring(0, 19) : x.substring(0, 19)
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`
    if (s.includes(' ')) {
      const parts = s.split(' ')
      let t0 = (parts[1] || '00:00:00')
      if (t0.length === 5) t0 = `${t0}:00`
      return `${parts[0]} ${t0.substring(0, 8)}`
    }
    return s
  },

  resolveRecorderName(record) {
    // 优先显示昵称，其次用户名
    const nick = record.created_by_nickname || (record.created_by && record.created_by.nickname) || ''
    if (nick) return nick
    const uname = record.created_by_username || (record.created_by && record.created_by.username) || ''
    return uname
  }
});
