const app = getApp()

Page({
  data: {
    isSuperAdmin: false,
    loading: false,
    runningBackup: false,
    runningSync: false,
    status: { last_backup: {}, last_sync: {}, last_sync_ts: null },
    logs: [],
    saving: false,
    form: { backup_enabled: false, sync_enabled: false, remote_host:'', remote_port:3306, remote_user:'', remote_password:'', remote_db_name:'', remote_db_prefix:'', backup_schedule_hour:3, sync_schedule_minute:0, retention_days:7 }
  },
  onShow() {
    try {
      const userInfo = (app.globalData && app.globalData.userInfo) || {}
      const role = String(userInfo.role || '')
      this.setData({ isSuperAdmin: role === 'super_admin' })
    } catch (_) {
      this.setData({ isSuperAdmin: false })
    }
    if (this.data.isSuperAdmin) { this.loadConfig(); this.fetchStatus(); this.fetchLogs() }
  },
  async loadConfig() {
    try {
      const r = await app.request({ url: '/api/admin/backup/config', method: 'GET' })
      if (r && r.success) this.setData({ form: { ...this.data.form, ...(r.data || {}), remote_password: '' } })
    } catch (_) {}
  },
  async fetchStatus() {
    try {
      const r = await app.request({ url: '/api/admin/backup/status', method: 'GET' })
      if (r && r.success) this.setData({ status: r.data })
    } catch (_) {}
  },
  async fetchLogs() {
    this.setData({ loading: true })
    try {
      const r = await app.request({ url: '/api/admin/backup/logs', method: 'GET', data: { limit: 100 } })
      if (r && r.success) this.setData({ logs: (r.data && r.data.logs) || [] })
    } catch (_) {} finally { this.setData({ loading: false }) }
  },
  async triggerBackup() {
    if (!this.data.isSuperAdmin) { app.showError && app.showError('仅超级管理员可进入'); return }
    this.setData({ runningBackup: true })
    try {
      const r = await app.request({ url: '/api/admin/backup/run', method: 'POST' })
      if (r && r.success) { wx.showToast({ title: r.message || '已触发备份', icon: 'none' }); await this.fetchStatus(); await this.fetchLogs() }
      else wx.showToast({ title: (r && r.message) || '触发失败', icon: 'none' })
    } catch (_) { wx.showToast({ title: '触发失败', icon: 'none' }) } finally { this.setData({ runningBackup: false }) }
  },
  async triggerSync() {
    if (!this.data.isSuperAdmin) { app.showError && app.showError('仅超级管理员可进入'); return }
    this.setData({ runningSync: true })
    try {
      const r = await app.request({ url: '/api/admin/backup/sync', method: 'POST' })
      if (r && r.success) { wx.showToast({ title: r.message || '已触发同步', icon: 'none' }); await this.fetchStatus(); await this.fetchLogs() }
      else wx.showToast({ title: (r && r.message) || '触发失败', icon: 'none' })
    } catch (_) { wx.showToast({ title: '触发失败', icon: 'none' }) } finally { this.setData({ runningSync: false }) }
  }
  ,
  onToggleBackup(e){ this.setData({ form: { ...this.data.form, backup_enabled: !!(e.detail && e.detail.value) } }) },
  onToggleSync(e){ this.setData({ form: { ...this.data.form, sync_enabled: !!(e.detail && e.detail.value) } }) },
  onInputHost(e){ this.setData({ form: { ...this.data.form, remote_host: (e.detail && e.detail.value) || '' } }) },
  onInputPort(e){ this.setData({ form: { ...this.data.form, remote_port: Number((e.detail && e.detail.value) || 0) } }) },
  onInputUser(e){ this.setData({ form: { ...this.data.form, remote_user: (e.detail && e.detail.value) || '' } }) },
  onInputPwd(e){ this.setData({ form: { ...this.data.form, remote_password: (e.detail && e.detail.value) || '' } }) },
  onInputDb(e){ this.setData({ form: { ...this.data.form, remote_db_name: (e.detail && e.detail.value) || '' } }) },
  onInputPrefix(e){ this.setData({ form: { ...this.data.form, remote_db_prefix: (e.detail && e.detail.value) || '' } }) },
  onInputBackupHour(e){ this.setData({ form: { ...this.data.form, backup_schedule_hour: Number((e.detail && e.detail.value) || 0) } }) },
  onInputSyncMinute(e){ this.setData({ form: { ...this.data.form, sync_schedule_minute: Number((e.detail && e.detail.value) || 0) } }) },
  onInputRetention(e){ this.setData({ form: { ...this.data.form, retention_days: Number((e.detail && e.detail.value) || 0) } }) },
  async saveConfig(){
    if (!this.data.isSuperAdmin) { app.showError && app.showError('仅超级管理员可进入'); return }
    this.setData({ saving: true })
    try {
      const r = await app.request({ url: '/api/admin/backup/config', method: 'PUT', data: this.data.form })
      if (r && r.success) { wx.showToast({ title: r.message || '配置已更新', icon: 'none' }) }
      else wx.showToast({ title: (r && r.message) || '保存失败', icon: 'none' })
    } catch (_) { wx.showToast({ title: '保存失败', icon: 'none' }) } finally { this.setData({ saving: false }) }
  }
})
