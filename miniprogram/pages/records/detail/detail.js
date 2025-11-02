const app = getApp();

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
  },

  onLoad(options) {
    const recordType = options.type || '';
    const recordId = options.id || '';
    const recordIds = (options.record_ids ? (options.record_ids.split(',').filter(Boolean)) : []);
    const isAggregate = !recordId && recordIds.length > 1;

    this.setData({
      recordType,
      recordId,
      recordIds,
      isAggregate,
      aggregateCount: recordIds.length,
      recordTypeLabel: this.getTypeLabel(recordType)
    });

    if (recordId) {
      this.fetchSingleRecord(recordType, recordId);
    } else if (recordIds.length > 0) {
      // 默认展示第一条记录详情
      this.fetchSingleRecord(recordType, recordIds[0]);
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
            water_bowl_clean: '水碗清洁'
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

  resolveDisplayTime(type, record) {
    // 尝试多个字段以兼容不同类型
    const t = record.feeding_time || record.cleaning_time || record.record_time || record.breeding_time || record.created_at || record.updated_at;
    if (!t) return '';
    try {
      // 保持与全局格式化一致（如果有）
      if (app && typeof app.formatDateTime === 'function') {
        return app.formatDateTime(t);
      }
      return String(t).replace('T', ' ').substring(0, 19);
    } catch (e) {
      return String(t);
    }
  }
});
