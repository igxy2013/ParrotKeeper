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
    operationLogs: []
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
      url: `/api/records/${type}/${id}`,
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
        // 喂食单位映射
        if (type === 'feeding') {
          try {
            const ft = record.feed_type || null;
            record.amountUnit = (ft && ft.unit) ? ft.unit : 'g';
          } catch (_) {
            record.amountUnit = 'g';
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
      try { this.fetchOperationLogs(type, id) } catch(_) {}
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
          const t = item.feed_type && item.feed_type.type
          const s = String(feedTypeName)
          const isNut = s.indexOf('坚果') !== -1
          const byType = (t === 'milk_powder' || t === 'supplement')
          const byName = (s.indexOf('奶粉') !== -1 || s.indexOf('保健品') !== -1 || s.indexOf('幼鸟奶粉') !== -1)
          const unit = (!isNut && (byType || byName)) ? 'ml' : 'g'
          return { ...base, feedTypeName, amount, amountUnit: unit }
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
    return this.formatLocalTime(s)
  },

  formatLocalTime(t) {
    try {
      let dt = parseServerTime(t)
      if (!dt && typeof t === 'string') {
        let s = t.trim()
        if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
          let local = s.replace(/-/g, '/')
          if (/^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}$/.test(local)) local = local + ':00'
          const dLocal = new Date(local)
          if (!isNaN(dLocal.getTime())) dt = dLocal
        }
        if (!dt) {
          let iso = s.includes(' ') ? s.replace(' ', 'T') : s
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) iso = iso + ':00'
          const dIso = new Date(iso)
          if (!isNaN(dIso.getTime())) dt = dIso
        }
      }
      if (!dt && t) {
        const dAny = new Date(t)
        if (!isNaN(dAny.getTime())) dt = dAny
      }
      return dt ? app.formatDateTime(dt, 'YYYY-MM-DD HH:mm:ss') : String(t || '')
    } catch (_) {
      return String(t || '')
    }
  },

  resolveRecorderName(record) {
    // 优先显示昵称，其次用户名
    const nick = record.created_by_nickname || (record.created_by && record.created_by.nickname) || ''
    if (nick) return nick
    const uname = record.created_by_username || (record.created_by && record.created_by.username) || ''
    return uname
  },

  formatOperationLogTime(t) {
    try {
      if (!t) return ''
      if (t instanceof Date) return app.formatDateTime(t, 'YYYY-MM-DD HH:mm:ss')
      if (typeof t === 'number') {
        const dNum = new Date(t)
        return isNaN(dNum.getTime()) ? '' : app.formatDateTime(dNum, 'YYYY-MM-DD HH:mm:ss')
      }

      const s0 = String(t).trim()
      if (!s0) return ''

      const hasTZ = /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s0)

      if (hasTZ) {
        let s = s0
        if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
        s = s.replace(/([+\-]\d{2})(\d{2})$/, '$1:$2')
        const d = new Date(s)
        if (!isNaN(d.getTime())) return app.formatDateTime(d, 'YYYY-MM-DD HH:mm:ss')
      }

      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s0)) {
        const d = new Date(s0 + 'Z')
        if (!isNaN(d.getTime())) return app.formatDateTime(d, 'YYYY-MM-DD HH:mm:ss')
      }

      let m = s0.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
      if (!m) m = s0.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
      if (m) {
        const y = parseInt(m[1], 10)
        const mo = parseInt(m[2], 10) - 1
        const d0 = parseInt(m[3], 10)
        const hh = parseInt(m[4], 10)
        const mm = parseInt(m[5], 10)
        const ss = m[6] ? parseInt(m[6], 10) : 0
        const d = new Date(Date.UTC(y, mo, d0, hh, mm, ss))
        if (!isNaN(d.getTime())) return app.formatDateTime(d, 'YYYY-MM-DD HH:mm:ss')
      }

      const dt = parseServerTime(s0)
      return dt ? app.formatDateTime(dt, 'YYYY-MM-DD HH:mm:ss') : s0
    } catch (_) {
      return String(t || '')
    }
  },

  onShow() {
    const type = this.data.recordType
    const id = this.data.recordId || (Array.isArray(this.data.recordIds) && this.data.recordIds[0]) || ''
    if (!this.data.isAggregate && type && id) {
      this.fetchSingleRecord(type, id)
    }
  },

  async fetchOperationLogs(type, id) {
    try {
      const tryEndpoints = [
        `/api/records/${type}/${id}/operations`,
        `/api/records/${type}/${id}/logs`,
        `/api/records/${type}/${id}/history`,
        `/api/records/${type}/operations?id=${encodeURIComponent(id)}`,
        `/api/records/operations?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
      ]
      let list = []
      for (let i = 0; i < tryEndpoints.length; i++) {
        const url = tryEndpoints[i]
        try {
          const res = await app.request({ url, method: 'GET' })
          if (res && res.success) {
            const raw = (res.data && (res.data.operations || res.data.logs || res.data.items)) || (Array.isArray(res.data) ? res.data : [])
            if (Array.isArray(raw) && raw.length) { list = raw; break }
          }
        } catch (_) {
          continue
        }
      }
      const mapped = (list || []).map(it => {
        const actionRaw = String(it.action || it.operation || it.type || it.event || '').toLowerCase()
        const actionText = this.mapActionToCN(actionRaw)
        let operatorName = (
          it.operator_nickname ||
          (it.operator && it.operator.nickname) ||
          it.created_by_nickname ||
          it.updated_by_nickname ||
          it.operator_name ||
          (it.operator && it.operator.name) ||
          it.created_by_name ||
          it.updated_by_name ||
          (it.operator && it.operator.username) ||
          it.created_by_username ||
          it.updated_by_username ||
          ''
        )
        operatorName = String(operatorName || '').trim()
        if (!operatorName) {
          const r = this.data.record || {}
          operatorName = String(
            r.created_by_nickname || (r.created_by && r.created_by.nickname) ||
            (app.globalData && app.globalData.userInfo && app.globalData.userInfo.nickname) ||
            ''
          ).trim()
        }
        const t = it.time || it.created_at || it.updated_at || it.operation_time || it.record_time || ''
        const timeText = this.formatOperationLogTime(t)
        const note = it.note || it.notes || it.description || ''
        const changeLines = this.formatChangeSummary(it, type, this.data.record || {})
        return { id: it.id || `${actionRaw}-${t}-${operatorName}`, actionText, operatorName, timeText, note, changeLines }
      })
      if (mapped.length) {
        this.setData({ operationLogs: mapped })
      } else {
        const fallback = this.deriveOperationLogs(this.data.record || {})
        this.setData({ operationLogs: fallback })
      }
    } catch (_) {
      const fallback = this.deriveOperationLogs(this.data.record || {})
      this.setData({ operationLogs: fallback })
    }
  },

  mapActionToCN(a) {
    const s = String(a || '').toLowerCase()
    if (!s) return '操作'
    if (s.includes('create') || s.includes('new') || s === 'add') return '创建'
    if (s.includes('update') || s.includes('edit') || s === 'modify') return '编辑'
    if (s.includes('delete') || s === 'remove') return '删除'
    if (s.includes('assign')) return '分配'
    if (s.includes('approve')) return '审批'
    if (s.includes('reject')) return '驳回'
    return s
  },

  deriveOperationLogs(record) {
    try {
      const logs = []
      const cAt = record.created_at || ''
      const uAt = record.updated_at || ''
      const cBy = record.created_by_nickname || (record.created_by && record.created_by.nickname) || record.created_by_username || (record.created_by && record.created_by.username) || ''
      const uBy = record.updated_by_nickname || (record.updated_by && record.updated_by.nickname) || record.updated_by_username || (record.updated_by && record.updated_by.username) || ''
      const dcText = this.formatOperationLogTime(cAt)
      const duText = this.formatOperationLogTime(uAt)
      if (dcText) {
        logs.push({ id: `created-${cAt}-${cBy}`, actionText: '创建', operatorName: cBy, timeText: dcText, note: '', changeLines: [] })
      }
      if (duText && (!dcText || duText !== dcText)) {
        logs.push({ id: `updated-${uAt}-${uBy}`, actionText: '编辑', operatorName: (uBy || cBy), timeText: duText, note: '', changeLines: [] })
      }
      return logs
    } catch (_) {
      return []
    }
  },

  formatChangeSummary(log, type, record) {
    try {
      const lines = []
      const payload = log.changes || log.diff || log.delta || null
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const keys = Object.keys(payload)
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i]
          const v = payload[k]
          const from = (v && (v.from != null ? v.from : v.old))
          const to = (v && (v.to != null ? v.to : v.new))
          if (from == null && to == null) continue
          const label = this.mapFieldLabel(k, type)
          if (type === 'feeding' && k === 'amount') {
            const unit = (v && v.unit) || record.amountUnit || 'g'
            const f = from != null ? `${from}${unit}` : '—'
            const t = to != null ? `${to}${unit}` : '—'
            lines.push(`${label} ${f} → ${t}`)
          } else {
            const f = from != null ? String(from) : '—'
            const t = to != null ? String(to) : '—'
            lines.push(`${label} ${f} → ${t}`)
          }
        }
      } else {
        const txt = log.diff_text || log.change_summary || log.summary || ''
        if (txt) lines.push(String(txt))
      }
      return lines
    } catch (_) {
      return []
    }
  },

  mapFieldLabel(field, type) {
    const s = String(field || '')
    if (type === 'feeding') {
      if (s === 'amount') return '食物量'
      if (s === 'feed_type' || s === 'feed_type_id' || s === 'feed') return '食物类型'
    } else if (type === 'cleaning') {
      if (s === 'cleaning_type') return '清洁类型'
      if (s === 'description') return '清洁描述'
    } else if (type === 'health') {
      if (s === 'weight') return '体重'
      if (s === 'health_status') return '健康状态'
    }
    return s
  }
});
