Component({
  properties: {
    active: { type: String, value: '' },
    selectedColor: { type: String, value: '#10B981' },
    defaultColor: { type: String, value: '#9CA3AF' }
  },
  data: {
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
  methods: {
    onTap(e) {
      const page = e.currentTarget.dataset.page
      if (page) {
        wx.reLaunch({ url: page })
      }
    }
  }
})
