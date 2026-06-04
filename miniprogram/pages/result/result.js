Page({
  data: {
    gameId: '',
    result: '' // win | lose
  },

  onLoad(options) {
    if (options.gameId) {
      this.setData({ gameId: options.gameId })
    }
    if (options.result) {
      this.setData({ result: options.result })
    }
  },

  onPlayAgain() {
    wx.redirectTo({ url: '/pages/game/game' })
  },

  onBackHome() {
    wx.navigateBack({ delta: 10 })
  }
})
