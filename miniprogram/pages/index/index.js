Page({
  data: {
    userInfo: null,
    hasUserInfo: false
  },

  onLoad() {
    // 检查登录态
    this.checkLogin()
  },

  checkLogin() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        console.log('登录成功', res.result)
        this.setData({ hasUserInfo: true })
      },
      fail: err => {
        console.error('登录失败', err)
      }
    })
  },

  onStartGame() {
    wx.navigateTo({ url: '/pages/game/game' })
  },

  onGoProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  }
})
