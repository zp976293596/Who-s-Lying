Page({
  data: {
    userInfo: null,
    stats: {
      totalGames: 0,
      wins: 0,
      winRate: '0%'
    }
  },

  onLoad() {
    this.loadUserStats()
  },

  loadUserStats() {
    // 后续Phase实现：从云数据库读取用户战绩
    console.log('加载用户战绩...')
  },

  onBackHome() {
    wx.navigateBack()
  }
})
