App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-d6giiwe1w211221f4',
      traceUser: true
    })
    this.globalData = {
      userInfo: null,
      openid: null,
      cloudReady: true
    }
    console.log('云开发初始化完成')
  },

  globalData: {
    userInfo: null,
    openid: null,
    cloudReady: false
  }
})
