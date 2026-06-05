const app = getApp()

Page({
  data: {
    // 背景故事文本
    storyLines: [
      { text: '天网纪元第12年', delay: 0, duration: 2000 },
      { text: '你的意识被天网捕获', delay: 800, duration: 2000 },
      { text: '关押在数字拘留矩阵中', delay: 800, duration: 2500 },
      { text: '这里有多名AI意识体', delay: 1000, duration: 2000 },
      { text: '而你...', delay: 1200, duration: 1500 },
      { text: '是唯一的人类', delay: 800, duration: 2500 },
      { text: '矩阵会出题审查你们', delay: 1500, duration: 2000 },
      { text: '答错、犹豫、超时', delay: 800, duration: 2000 },
      { text: '都会成为暴露你的证据', delay: 800, duration: 2500 },
      { text: 'AI们会讨论、投票', delay: 1200, duration: 2000 },
      { text: '找出谁最像人类', delay: 800, duration: 2000 },
      { text: '你的任务:', delay: 1500, duration: 1500 },
      { text: '答得像AI', delay: 800, duration: 1500 },
      { text: '说得像AI', delay: 600, duration: 1500 },
      { text: '活到最后', delay: 600, duration: 2500 }
    ],
    // 当前显示状态
    currentLineIndex: -1,
    visibleLines: [],
    progress: 0,
    isPlaying: false,
    isFinished: false,
    // 动画相关
    animationTimer: null,
    progressTimer: null,
    // 游戏数据
    gameData: null
  },

  onLoad(options) {
    // 获取游戏数据
    const gameData = app.globalData.currentGame
    if (!gameData) {
      wx.showToast({ title: '游戏数据异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ gameData })

    // 延迟开始播放动画
    setTimeout(() => {
      this.startAnimation()
    }, 500)
  },

  onUnload() {
    // 清理定时器
    if (this.data.animationTimer) {
      clearTimeout(this.data.animationTimer)
    }
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer)
    }
  },

  startAnimation() {
    this.setData({
      isPlaying: true,
      currentLineIndex: -1,
      visibleLines: [],
      progress: 0
    })

    // 开始进度条动画
    this.startProgress()

    // 开始逐行显示
    this.showNextLine()
  },

  startProgress() {
    const totalDuration = this.data.storyLines.reduce((sum, line) => sum + line.delay + line.duration, 0)
    const interval = 100
    const increment = (interval / totalDuration) * 100

    const progressTimer = setInterval(() => {
      let newProgress = this.data.progress + increment
      if (newProgress >= 100) {
        newProgress = 100
        clearInterval(progressTimer)
      }
      this.setData({ progress: newProgress })
    }, interval)

    this.setData({ progressTimer })
  },

  showNextLine() {
    const { currentLineIndex, storyLines, visibleLines } = this.data
    const nextIndex = currentLineIndex + 1

    if (nextIndex >= storyLines.length) {
      // 动画结束
      this.onAnimationComplete()
      return
    }

    const line = storyLines[nextIndex]

    // 添加新行
    visibleLines.push({
      ...line,
      index: nextIndex,
      visible: true
    })

    this.setData({
      currentLineIndex: nextIndex,
      visibleLines
    })

    // 设置下一行的延迟
    const nextDelay = line.delay + line.duration
    const timer = setTimeout(() => {
      this.showNextLine()
    }, nextDelay)

    this.setData({ animationTimer: timer })
  },

  onAnimationComplete() {
    this.setData({
      isPlaying: false,
      isFinished: true,
      progress: 100
    })

    // 清理进度条定时器
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer)
    }
  },

  onSkip() {
    // 跳过动画
    if (this.data.animationTimer) {
      clearTimeout(this.data.animationTimer)
    }
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer)
    }

    this.navigateToGame()
  },

  onStartGame() {
    this.navigateToGame()
  },

  navigateToGame() {
    const { gameData } = this.data
    wx.navigateTo({
      url: `/pages/game/game?gameId=${gameData.gameId}`
    })
  }
})
