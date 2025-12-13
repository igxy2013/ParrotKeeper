const app = getApp()

Component({
  properties: {
    active: { type: String, value: '' },
    selectedColor: { type: String, value: '#10B981' },
    defaultColor: { type: String, value: '#9CA3AF' }
  },
  data: {
    hasUnreadFeedback: false,
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
      const update = () => { try { this.setData({ hasUnreadFeedback: !!(app && app.globalData && app.globalData.hasUnreadFeedback) }) } catch(_){} }
      update()
      try { app.globalData.feedbackBadgeUpdateCallback = update } catch(_){ }
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
