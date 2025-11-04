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
    aggregateRecords: [],
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

  async fetchAggregateRecords(type, ids) {
    try {
      this.setData({ loading: true, error: '' })
      const requests = ids.map(id => app.request({ url: `/api/records/${type}/${id}`, method: 'GET' }))
      const results = await Promise.all(requests)
      const okItems = results
        .filter(r => r && r.success && r.data)
        .map(r => r.data)

      // 构建展示用列表项（喂食为主）
      const listItems = okItems.map(item => {
        const parrotName = (item.parrot && item.parrot.name) || item.parrot_name || ''
        const feedTypeName = item.feed_type_name || (item.feed_type && item.feed_type.name) || ''
        const amount = (item.amount !== undefined && item.amount !== null) ? item.amount : ''
        return {
          id: item.id,
          parrotName,
          feedTypeName,
          amount,
          displayTime: this.resolveDisplayTime(type, item),
          recorderName: this.resolveRecorderName(item)
        }
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
    // 统一格式为 YYYY-MM-DD HH:MM:SS，兼容 ISO/空格分隔/仅日期/分离的日期与时间
    const normalize = (dateStr, timeStr) => {
      const d = (dateStr || '').trim()
      const t = (timeStr || '').trim()
      if (d && t) {
        let tt = t
        if (tt.length === 5) tt = `${tt}:00`
        if (tt.length > 8) tt = tt.substring(0, 8)
        return `${d} ${tt}`
      }
      const s = (t || d || '').trim()
      if (!s) return ''
      if (s.includes('T')) {
        let x = s.replace('T', ' ')
        x = x.replace('Z', '')
        x = x.replace(/([\+\-]\d{2}:?\d{2})$/, '')
        if (x.includes('.')) x = x.split('.')[0]
        return x.substring(0, 19)
      }
      if (s.includes(' ')) {
        const parts = s.split(' ')
        const d0 = parts[0]
        let t0 = parts[1] || '00:00:00'
        if (t0.length === 5) t0 = `${t0}:00`
        return `${d0} ${t0.substring(0, 8)}`
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`
      return s
    }

    // 详情页优先：使用 created_at
    const created = record.created_at || ''
    const normCreated = normalize('', created)
    if (normCreated) return normCreated
    // 次选：updated_at
    const updated = record.updated_at || ''
    const normUpdated = normalize('', updated)
    if (normUpdated) return normUpdated
    // 再次：合并 record_date + record_time（健康等类型）
    const recordDate = record.record_date || ''
    const recordTime = record.record_time || ''
    const merged = normalize(recordDate, recordTime)
    if (merged) return merged
    // 兜底：各类型专属时间
    const primary = record.record_time || record.feeding_time || record.cleaning_time || record.breeding_time || ''
    return normalize('', primary)
  },

  resolveRecorderName(record) {
    // 优先显示昵称，其次用户名
    const nick = record.created_by_nickname || (record.created_by && record.created_by.nickname) || ''
    if (nick) return nick
    const uname = record.created_by_username || (record.created_by && record.created_by.username) || ''
    return uname
  }
});
