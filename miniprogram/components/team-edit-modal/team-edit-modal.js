// components/team-edit-modal/team-edit-modal.js
const app = getApp()

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    teamInfo: {
      type: Object,
      value: {}
    }
  },

  data: {
    formData: {
      name: '',
      description: '',
      avatar_url: ''
    }
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        // 初始化表单数据
        this.setData({
          formData: {
            name: this.data.teamInfo.name || '',
            description: this.data.teamInfo.description || '',
            avatar_url: this.data.teamInfo.avatar_url || ''
          }
        })
      }
    },
    'teamInfo': function(teamInfo) {
      // 当teamInfo更新时，同步更新表单数据
      if (this.data.visible) {
        this.setData({
          formData: {
            name: teamInfo.name || '',
            description: teamInfo.description || '',
            avatar_url: teamInfo.avatar_url || ''
          }
        })
      }
    }
  },

  methods: {
    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
    },

    // 点击遮罩层关闭
    onOverlayTap(e) {
      // 只有点击遮罩层才关闭弹窗，避免点击内容区域也关闭
      if (e.target === e.currentTarget) {
        this.onClose()
      }
    },

    // 团队名称输入
    onNameInput(e) {
      this.setData({
        'formData.name': e.detail.value
      })
    },

    // 团队描述输入
    onDescInput(e) {
      this.setData({
        'formData.description': e.detail.value
      })
    },

    // 选择头像
    chooseAvatar() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath
          this.uploadAvatar(tempFilePath)
        }
      })
    },

    // 上传头像
    async uploadAvatar(filePath) {
      try {
        app.showLoading('上传中...')
        const uploadRes = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: app.globalData.baseUrl + '/api/upload/image',
            filePath,
            name: 'file',
            formData: { category: 'teams' },
            header: { 'X-OpenID': app.globalData.openid },
            success: resolve,
            fail: reject
          })
        })
        const result = JSON.parse(uploadRes.data)
        if (result.success) {
          const fullUrl = app.globalData.baseUrl + '/uploads/' + result.data.url
          this.setData({ 'formData.avatar_url': fullUrl })
          app.showSuccess('上传成功')
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error('上传头像失败:', error)
        app.showError('上传头像失败')
      } finally {
        app.hideLoading()
      }
    },

    // 预览头像
    previewAvatar() {
      if (!this.data.formData.avatar_url) return
      wx.previewImage({ urls: [this.data.formData.avatar_url] })
    },

    // 删除头像
    deleteAvatar() {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张头像吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'formData.avatar_url': '' })
          }
        }
      })
    },

    // 提交表单
    onSubmit() {
      const { name, description, avatar_url } = this.data.formData
      if (!name.trim()) {
        app.showError('请输入团队名称')
        return
      }

      // 触发提交事件，将数据传递给父组件
      this.triggerEvent('submit', {
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatar_url
      })
    }
  }
})