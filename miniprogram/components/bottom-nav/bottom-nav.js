const app = getApp()

Component({
  properties: {
    active: { type: String, value: '' },
    selectedColor: { type: String, value: '#10B981' },
    defaultColor: { type: String, value: '#9CA3AF' }
  },
  data: {
    hasUnreadFeedback: false,
    isSuperAdmin: false,
    items: [
      {
        key: 'index',
        text: '首页',
        pagePath: '/pages/index/index',
        iconPath: '/images/home.png',
        selectedIconPath: '/images/home-active.png'
      },
      {
        key: 'parrots',
        text: '我的鹦鹉',
        pagePath: '/pages/parrots/parrots',
        iconPath: '/images/parrot.png',
        selectedIconPath: '/images/parrot-active.png'
      },
      {
        key: 'statistics',
        text: '数据统计',
        pagePath: '/pages/statistics/statistics',
        iconPath: '/images/chart.png',
        selectedIconPath: '/images/chart-active.png'
      },
      {
        key: 'profile',
        text: '个人中心',
        pagePath: '/pages/profile/profile',
        iconPath: '/images/profile.png',
        selectedIconPath: '/images/profile-active.png'
      }
    ]
  },
  lifetimes: {
    attached(){
      const app = getApp()
      const update = () => {
        try {
          const role = ((app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.role) || '')
          this.setData({
            hasUnreadFeedback: !!(app && app.globalData && app.globalData.hasUnreadFeedback),
            isSuperAdmin: role === 'super_admin'
          })
        } catch(_){}
      }
      update()
      try { app.globalData.feedbackBadgeUpdateCallback = update } catch(_){ }
    }
  },
  pageLifetimes: {
    show() {
      const app = getApp()
      try {
        const role = ((app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.role) || '')
        this.setData({
          hasUnreadFeedback: !!(app && app.globalData && app.globalData.hasUnreadFeedback),
          isSuperAdmin: role === 'super_admin'
        })
      } catch(_){}
    }
  },
  methods: {
    onTap(e) {
      const page = e.currentTarget.dataset.page
      if (page) {
        wx.reLaunch({ url: page })
      }
    }
    ,
    onTapAdd() {
      // 未登录时先提示登录
      if (!app.globalData.isLogin) {
        if (app && typeof app.showError === 'function') {
          app.showError('请先登录后使用此功能')
        } else {
          wx.showToast({ title: '请先登录后使用此功能', icon: 'none' })
        }
        wx.reLaunch({ url: '/pages/index/index' })
        return
      }

      const mode = (app && app.globalData && app.globalData.userMode) || 'personal'
      if (mode === 'team') {
        const hasOp = !!(app && typeof app.hasOperationPermission === 'function' && app.hasOperationPermission())
        if (!hasOp) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); return }
        try {
          const cur = app.request({ url: '/api/teams/current', method: 'GET' })
          const userId = (app.globalData && app.globalData.userInfo && app.globalData.userInfo.id) || null
          Promise.resolve(cur).then(res => {
            const teamId = res && res.success && res.data && res.data.id
            if (teamId && userId) {
              return app.request({ url: `/api/teams/${teamId}/members`, method: 'GET' })
                .then(membersRes => {
                  if (membersRes && membersRes.success && Array.isArray(membersRes.data)) {
                    const me = membersRes.data.find(m => String(m.user_id || m.id) === String(userId))
                    const groupId = me && (typeof me.group_id !== 'undefined' ? me.group_id : null)
                    if (!groupId) { wx.showToast({ title: '无操作权限，请联系管理员分配权限', icon: 'none', duration: 3000 }); throw new Error('no_group') }
                  }
                })
            }
          }).catch(() => {})
        } catch (_) {}
      }

      // 检查当前是否已有鹦鹉
      app.request({
        url: '/api/parrots',
        method: 'GET',
        data: { page: 1, limit: 1 }
      }).then(res => {
        const list = res && res.data && Array.isArray(res.data.parrots) ? res.data.parrots : []
        const hasParrot = !!list.length

        if (!hasParrot) {
          wx.showModal({
            title: '温馨提示',
            content: '当前还没有鹦鹉，请先添加一只后再记录喂食、清洁等信息。',
            confirmText: '去添加',
            cancelText: '稍后再说',
            success: (r) => {
              if (r.confirm) {
                wx.reLaunch({ url: '/pages/index/index?openAddParrot=1' })
              }
            }
          })
        } else {
          wx.navigateTo({ url: '/pages/records/add-record/add-record' })
        }
      }).catch(() => {
        wx.navigateTo({ url: '/pages/records/add-record/add-record' })
      })
    }
  }
})
