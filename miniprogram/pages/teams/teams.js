// pages/teams/teams.js
const app = getApp();

Page({
  data: {
    teamInfo: {
      name: '加载中...',
      description: '',
      memberCount: 0,
      recordCount: 0,
      todayTasks: 0,
      completedTasks: 0,
      avatar: '/images/team-avatar.png',
      createTime: '',
      status: '活跃',
      stats: {
        totalMembers: 0,
        activeTasks: 0,
        completedTasks: 0,
        totalProjects: 0
      }
    },
    members: [],
    filteredMembers: [],
    searchKeyword: '',
    selectedRole: 'all',
    recentActivities: [],
    onlineMembersCount: 0,
    currentTeamId: null
  },

  onLoad: function () {
    this.loadTeamData();
  },

  onShow: function () {
    this.loadTeamData();
    
    // 检查是否需要刷新数据（加入团队或模式切换后）
    if (app.globalData.needRefresh) {
      console.log('Teams页面检测到needRefresh标志，刷新数据');
      app.globalData.needRefresh = false; // 重置标志
      this.loadTeamData(); // 重新加载团队数据
    }
  },

  // 解码Unicode字符串
  decodeUnicode: function(str) {
    if (!str) return str;
    try {
      // 如果字符串包含Unicode转义序列，进行解码
      return str.replace(/\\u[\dA-F]{4}/gi, function (match) {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      });
    } catch (e) {
      console.error('Unicode解码失败:', e);
      return str;
    }
  },

  // 加载团队数据（后端）
  loadTeamData: function() {
    app.showLoading('加载团队数据');
    app.request({ url: '/api/teams/current' })
      .then(res => {
        if (res.success) {
          const t = res.data;
          if (!t) {
            app.hideLoading();
            wx.showToast({ title: '未选择团队', icon: 'none' });
            this.setData({
              teamInfo: { ...this.data.teamInfo, name: '未选择团队', memberCount: 0, createTime: '' },
              members: [],
              filteredMembers: [],
              onlineMembersCount: 0,
              currentTeamId: null
            });
            return;
          }
          const teamInfo = {
            name: t.name,
            description: t.description || '',
            memberCount: t.member_count || 0,
            recordCount: 0,
            todayTasks: 0,
            completedTasks: 0,
            avatar: '/images/team-avatar.png',
            createTime: app.formatDate(t.created_at || new Date()),
            status: '活跃',
            stats: {
              totalMembers: t.member_count || 0,
              activeTasks: 0,
              completedTasks: 0,
              totalProjects: 0
            }
          };

          this.setData({ teamInfo, currentTeamId: t.id });

          // 加载成员
          return app.request({ url: `/api/teams/${t.id}/members` });
        } else {
          throw new Error(res.message || '获取团队失败');
        }
      })
      .then(memberRes => {
        if (!memberRes) return; // 前一步可能未选择团队
        if (memberRes.success) {
          const members = (memberRes.data || []).map(m => ({
            id: m.id,
            name: this.decodeUnicode(m.nickname) || '无名',
            avatar: m.avatar_url || '/images/default-avatar.svg',
            role: (m.role === 'owner' || m.role === 'admin') ? '管理员' : '成员',
            isOnline: false,
            joinTime: app.formatDate(m.joined_at),
            lastActive: '未知'
          }));
          const onlineCount = members.filter(mm => mm.isOnline).length;
          this.setData({ members, filteredMembers: members, onlineMembersCount: onlineCount });
        } else {
          throw new Error(memberRes.message || '获取成员失败');
        }
      })
      .catch(err => {
        console.error('加载团队数据错误:', err);
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        app.hideLoading();
      });
  },

  filterMembers: function() {
    const { members, searchKeyword, selectedRole } = this.data;
    let filtered = members;

    if (selectedRole !== 'all') {
      filtered = filtered.filter(member => member.role === selectedRole);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(member =>
        (member.name || '').toLowerCase().includes(keyword) ||
        (member.role || '').toLowerCase().includes(keyword)
      );
    }

    this.setData({ filteredMembers: filtered });
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value }, () => { this.filterMembers(); });
  },

  clearSearch: function() {
    this.setData({ searchKeyword: '' }, () => { this.filterMembers(); });
  },

  onRoleFilter: function(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role }, () => { this.filterMembers(); });
  },

  resetFilters: function() {
    this.setData({ searchKeyword: '', selectedRole: 'all' }, () => { this.filterMembers(); });
  },

  // 快速操作点击事件
  onQuickActionTap: function(e) {
    const actionId = e.currentTarget.dataset.id;
    switch(actionId) {
      case 'invite':
        this.inviteMember();
        break;
      case 'addRecord':
        this.addRecord();
        break;
      case 'createTask':
        this.createTask();
        break;
      case 'settings':
        this.openSettings();
        break;
    }
  },

  inviteMember: function() {
    if (!this.data.currentTeamId) {
      wx.showToast({ title: '未选择团队', icon: 'none' });
      return;
    }

    app.showLoading('获取邀请码');
    app.request({ url: `/api/teams/${this.data.currentTeamId}` })
      .then(res => {
        if (!res.success) throw new Error(res.message || '获取失败');
        const code = res.data && res.data.invite_code;

        if (code) {
          this.setData({ teamInfo: { ...this.data.teamInfo, invite_code: code } });
          wx.showModal({
            title: '团队邀请码',
            content: `邀请码：${code}\n点击“复制”以分享给成员`,
            confirmText: '复制',
            cancelText: '关闭',
            success: (r) => {
              if (r.confirm) {
                wx.setClipboardData({
                  data: code,
                  success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
                  fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
                });
              }
            }
          });
        } else {
          wx.showModal({
            title: '暂无邀请码',
            content: '未获取到邀请码，请前往“团队设置”页查看或联系管理员。',
            confirmText: '前往设置',
            success: (r) => {
              if (r.confirm) wx.navigateTo({ url: '/pages/teams/settings/settings' });
            }
          });
        }
      })
      .catch(err => {
        wx.showToast({ title: err.message || '获取失败', icon: 'none' });
      })
      .finally(() => {
        app.hideLoading();
      });
  },

  addRecord: function() {
    wx.navigateTo({ url: '/pages/records/add-record/add-record' });
  },

  createTask: function() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  openSettings: function() {
    if (!this.data.currentTeamId) {
      wx.showToast({ title: '未选择团队', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '编辑团队名称',
      editable: true,
      placeholderText: '请输入新的团队名称',
      content: this.data.teamInfo.name,
      success: (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim();
          if (newName && newName !== this.data.teamInfo.name) {
            this.updateTeamName(newName);
          } else if (!newName) {
            wx.showToast({
              title: '团队名称不能为空',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 更新团队名称
  updateTeamName: function(newName) {
    app.showLoading('更新中...');

    app.request({
      url: `/api/teams/${this.data.currentTeamId}`,
      method: 'PUT',
      data: {
        name: newName
      }
    })
    .then(res => {
      if (res.success) {
        // 更新本地数据
        this.setData({
          'teamInfo.name': newName
        });
        
        wx.showToast({
          title: '团队名称更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.message || '更新失败');
      }
    })
    .catch(error => {
      console.error('更新团队名称失败:', error);
      wx.showToast({
        title: error.message || '网络错误，请重试',
        icon: 'error'
      });
    })
    .finally(() => {
      app.hideLoading();
    });
  },

  // 成员点击事件（改为无动作，不再弹窗）
  onMemberTap(e) {
    // 用户要求：点击成员不需要弹出详情窗口
    return;
  },

  // 成员管理相关
  inviteNewMember: function() {
    // 复用邀请成员逻辑：拉取后台邀请码并提供复制
    this.inviteMember();
  },

  manageMemberPermissions: function(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.id === memberId);
    if (!member) return;

    const isAdmin = member.role === '管理员';
    wx.showActionSheet({
      itemList: [isAdmin ? '设为成员' : '设为管理员', '移除成员', '查看详情'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: {
            const nextRole = isAdmin ? 'member' : 'admin';
            app.showLoading('提交中');
            app.request({
              url: `/api/teams/${this.data.currentTeamId}/members/${memberId}/role`,
              method: 'PUT',
              data: { role: nextRole }
            }).then(r => {
              if (!r.success) throw new Error(r.message || '修改角色失败');
              const members = this.data.members.map(m => m.id === memberId ? { ...m, role: nextRole === 'admin' ? '管理员' : '成员' } : m);
              this.setData({ members }, () => this.filterMembers());
              app.showSuccess('角色已更新');
            }).catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            }).finally(() => app.hideLoading());
            break;
          }
          case 1: {
            wx.showModal({
              title: '确认移除',
              content: '确定要移除该成员吗？',
              success: (r) => {
                if (!r.confirm) return;
                app.showLoading('移除中');
                app.request({
                  url: `/api/teams/${this.data.currentTeamId}/members/${memberId}`,
                  method: 'DELETE'
                }).then(rm => {
                  if (!rm.success) throw new Error(rm.message || '移除失败');
                  const members = this.data.members.filter(m => m.id !== memberId);
                  this.setData({ members }, () => this.filterMembers());
                  app.showSuccess('已移除');
                }).catch(err => {
                  wx.showToast({ title: err.message || '操作失败', icon: 'none' });
                }).finally(() => app.hideLoading());
              }
            });
            break;
          }
          case 2: {
            this.viewMemberProfile({ currentTarget: { dataset: { id: memberId } } });
            break;
          }
        }
      }
    });
  },

  viewMemberProfile: function(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.id === memberId);
    if (!member) return;
    wx.showModal({
      title: member.name,
      content: `角色: ${member.role}\n加入时间: ${member.joinTime}\n最后活跃: ${member.lastActive}`,
      showCancel: false
    });
  }
});