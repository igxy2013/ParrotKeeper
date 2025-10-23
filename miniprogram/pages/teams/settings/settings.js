// pages/teams/settings/settings.js
const app = getApp();

Page({
  data: {
    teamId: null,
    team: {},
    members: [],
    userRole: 'member'
  },

  onLoad() {
    this.fetchTeamDetail();
  },

  onShow() {
    this.fetchTeamDetail();
  },

  fetchTeamDetail() {
    app.showLoading('加载设置');
    app.request({ url: '/api/teams/current' })
      .then(res => {
        if (!res.success) throw new Error(res.message || '获取当前团队失败');
        const t = res.data;
        if (!t) {
          throw new Error('未选择团队');
        }
        this.setData({ teamId: t.id, userRole: t.role });
        return app.request({ url: `/api/teams/${t.id}` });
      })
      .then(detailRes => {
        if (!detailRes.success) throw new Error(detailRes.message || '获取团队详情失败');
        const d = detailRes.data;
        this.setData({ team: d, members: d.members || [] });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        app.hideLoading();
      });
  },

  copyInviteCode() {
    if (!this.data.team.invite_code) return;
    wx.setClipboardData({ data: String(this.data.team.invite_code) });
  },

  onToggleRole(e) {
    const userId = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.id === userId);
    if (!member) return;

    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    app.showLoading('提交中');
    app.request({
      url: `/api/teams/${this.data.teamId}/members/${userId}/role`,
      method: 'PUT',
      data: { role: nextRole }
    })
    .then(res => {
      if (!res.success) throw new Error(res.message || '修改角色失败');
      const members = this.data.members.map(m => m.id === userId ? { ...m, role: nextRole } : m);
      this.setData({ members });
      app.showSuccess('角色已更新');
    })
    .catch(err => {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    })
    .finally(() => app.hideLoading());
  },

  onRemoveMember(e) {
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      success: (r) => {
        if (!r.confirm) return;
        app.showLoading('移除中');
        app.request({
          url: `/api/teams/${this.data.teamId}/members/${userId}`,
          method: 'DELETE'
        })
        .then(res => {
          if (!res.success) throw new Error(res.message || '移除失败');
          const members = this.data.members.filter(m => m.id !== userId);
          this.setData({ members });
          app.showSuccess('已移除');
        })
        .catch(err => {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        })
        .finally(() => app.hideLoading());
      }
    });
  },

  onLeaveTeam() {
    wx.showModal({
      title: '离开团队',
      content: '确认要离开当前团队吗？',
      success: (r) => {
        if (!r.confirm) return;
        app.showLoading('处理中');
        app.request({
          url: `/api/teams/${this.data.teamId}/leave`,
          method: 'POST'
        })
        .then(res => {
          if (!res.success) throw new Error(res.message || '离开失败');
          app.showSuccess('已离开团队');
          wx.navigateBack();
        })
        .catch(err => {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        })
        .finally(() => app.hideLoading());
      }
    });
  }
});