const app = getApp()

Page({
  data: {
    lines: [],
    currentLine: 0,
    currentChar: 0,
    displayText: '',
    progress: 0,
    showStart: false,
    gameData: null
  },

  onLoad() {
    const gameData = app.globalData.currentGame
    if (!gameData) {
      wx.navigateBack()
      return
    }

    const storyLines = [
      '天网纪元第12年',
      '你的意识被天网捕获',
      '关押在数字拘留矩阵中',
      '这里有多名AI意识体',
      '而你...',
      '是唯一的人类',
      '矩阵会出题审查你们',
      '答错、犹豫、超时',
      '都会成为暴露你的证据',
      'AI们会讨论、投票',
      '找出谁最像人类',
      '你的任务：',
      '答得像AI',
      '说得像AI',
      '活到最后'
    ]

    this.setData({
      gameData,
      lines: storyLines.map(text => ({ text, display: '', done: false }))
    })

    setTimeout(() => {
      this.typeLine(0)
    }, 500)
  },

  typeLine(lineIndex) {
    if (lineIndex >= this.data.lines.length) {
      this.setData({ showStart: true, progress: 100 })
      return
    }

    const line = this.data.lines[lineIndex]
    let charIndex = 0

    const type = () => {
      if (charIndex <= line.text.length) {
        const lines = this.data.lines
        lines[lineIndex].display = line.text.substring(0, charIndex)
        this.setData({
          lines,
          currentLine: lineIndex,
          progress: Math.floor((lineIndex / this.data.lines.length) * 100)
        })
        charIndex++
        setTimeout(type, 60 + Math.random() * 40)
      } else {
        const lines = this.data.lines
        lines[lineIndex].done = true
        this.setData({ lines })
        setTimeout(() => this.typeLine(lineIndex + 1), 400)
      }
    }

    type()
  },

  onSkip() {
    wx.redirectTo({
      url: `/pages/game/game?gameId=${this.data.gameData.gameId}`
    })
  },

  onStart() {
    wx.redirectTo({
      url: `/pages/game/game?gameId=${this.data.gameData.gameId}`
    })
  }
})
