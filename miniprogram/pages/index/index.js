const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    openid: null,
    isLoading: true
  },

  onLoad() {
    // 延迟确保云开发初始化完成
    setTimeout(() => {
      this.checkLogin()
    }, 500)
  },

  checkLogin() {
    wx.cloud.callFunction({
      name: 'login',
      timeout: 30000,
      success: res => {
        console.log('登录成功', res)
        if (res.result && res.result.code === 0) {
          const openid = res.result.openid
          app.globalData.openid = openid
          this.setData({ openid })

          const cachedUserInfo = wx.getStorageSync('userInfo')
          if (cachedUserInfo) {
            app.globalData.userInfo = cachedUserInfo
            this.setData({
              userInfo: cachedUserInfo,
              hasUserInfo: true,
              isLoading: false
            })
          } else {
            this.setData({ isLoading: false })
          }
        } else {
          this.setData({ isLoading: false })
        }
      },
      fail: err => {
        console.error('登录失败', err)
        this.setData({ isLoading: false })
        wx.showToast({ title: '连接矩阵失败，请重试', icon: 'none' })
      }
    })
  },

  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于展示审查者身份',
      success: res => {
        const userInfo = res.userInfo
        app.globalData.userInfo = userInfo

        // 缓存用户信息
        wx.setStorageSync('userInfo', userInfo)

        // 更新到数据库
        this.updateUserInfo(userInfo)

        this.setData({
          userInfo,
          hasUserInfo: true
        })
      },
      fail: err => {
        console.log('用户拒绝授权', err)
      }
    })
  },

  updateUserInfo(userInfo) {
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'updateProfile',
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      }
    })
  },

  onLogout() {
    wx.showModal({
      title: '断开连接',
      content: '确定要断开与矩阵的连接吗？',
      confirmText: '断开',
      confirmColor: '#ff3366',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null
          this.setData({
            userInfo: null,
            hasUserInfo: false
          })
          wx.showToast({ title: '已断开连接', icon: 'none' })
        }
      }
    })
  },

  onStartGame() {
    if (!this.data.hasUserInfo) {
      wx.showToast({ title: '请先连接矩阵', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在创建游戏...' })

    wx.cloud.callFunction({
      name: 'createGame',
      timeout: 30000,
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          const gameData = res.result.data
          // 将游戏数据存储到全局和本地
          app.globalData.currentGame = gameData
          wx.setStorageSync('currentGame', gameData)
          // 跳转到过场动画页面
          wx.navigateTo({
            url: '/pages/intro/intro'
          })
        } else {
          wx.showToast({ title: res.result?.message || '创建失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('创建游戏失败', err)
        wx.showToast({ title: '创建游戏失败', icon: 'none' })
      }
    })
  },

  onGoProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  }
})
