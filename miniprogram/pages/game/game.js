Page({
  data: {
    gameId: '',
    round: 1,
    phase: 'waiting' // waiting | answering | revealing | discussing | voting
  },

  onLoad(options) {
    if (options.gameId) {
      this.setData({ gameId: options.gameId })
    }
  }
})
