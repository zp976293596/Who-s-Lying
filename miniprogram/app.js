App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'your-env-id', // TODO: 替换为实际云开发环境ID
      traceUser: true
    })
    this.globalData = {}
  },

  globalData: {
    userInfo: null,
    openid: null
  }
})
