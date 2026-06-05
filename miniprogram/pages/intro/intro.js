const app = getApp()

Page({
  data: {
    // 背景故事文本 - 分组显示
    storyGroups: [
      {
        lines: ['天网纪元第12年'],
        type: 'normal',
        pause: 1200
      },
      {
        lines: ['你的意识被天网捕获'],
        type: 'normal',
        pause: 1000
      },
      {
        lines: ['关押在数字拘留矩阵中'],
        type: 'normal',
        pause: 1500
      },
      {
        lines: ['这里有多名AI意识体', '而你...'],
        type: 'normal',
        pause: 800
      },
      {
        lines: ['是唯一的人类'],
        type: 'highlight',
        pause: 2000
      },
      {
        lines: ['矩阵会出题审查你们'],
        type: 'normal',
        pause: 1000
      },
      {
        lines: ['答错、犹豫、超时', '都会成为暴露你的证据'],
        type: 'warning',
        pause: 1500
      },
      {
        lines: ['AI们会讨论、投票', '找出谁最像人类'],
        type: 'normal',
        pause: 1500
      },
      {
        lines: ['你的任务：'],
        type: 'normal',
        pause: 800
      },
      {
        lines: ['答得像AI', '说得像AI', '活到最后'],
        type: 'mission',
        pause: 0
      }
    ],
    // 显示状态
    currentGroupIndex: -1,
    displayedGroups: [],
    currentCharIndex: 0,
    currentText: '',
    progress: 0,
    progressText: '0',
    isPlaying: false,
    isFinished: false,
    // 动画相关
    charTimer: null,
    groupTimer: null,
    progressTimer: null,
    // 游戏数据
    gameData: null
  },

  onLoad(options) {
    const gameData = app.globalData.currentGame
    if (!gameData) {
      wx.showToast({ title: '游戏数据异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ gameData })

    setTimeout(() => {
      this.startAnimation()
    }, 800)
  },

  onUnload() {
    this.clearAllTimers()
  },

  clearAllTimers() {
    if (this.data.charTimer) clearTimeout(this.data.charTimer)
    if (this.data.groupTimer) clearTimeout(this.data.groupTimer)
    if (this.data.progressTimer) clearInterval(this.data.progressTimer)
  },

  startAnimation() {
    this.setData({
      isPlaying: true,
      currentGroupIndex: -1,
      displayedGroups: [],
      progress: 0
    })

    this.startProgress()
    this.showNextGroup()
  },

  startProgress() {
    const totalGroups = this.data.storyGroups.length
    let currentProgress = 0

    const progressTimer = setInterval(() => {
      const targetProgress = ((this.data.currentGroupIndex + 1) / totalGroups) * 100
      // 平滑追赶目标进度
      currentProgress += (targetProgress - currentProgress) * 0.1

      if (currentProgress >= 99) {
        currentProgress = 100
        clearInterval(progressTimer)
      }

      this.setData({
        progress: currentProgress,
        progressText: Math.floor(currentProgress).toString()
      })
    }, 50)

    this.setData({ progressTimer })
  },

  showNextGroup() {
    const { currentGroupIndex, storyGroups, displayedGroups } = this.data
    const nextIndex = currentGroupIndex + 1

    if (nextIndex >= storyGroups.length) {
      this.onAnimationComplete()
      return
    }

    const group = storyGroups[nextIndex]

    // 添加新组
    const newGroup = {
      type: group.type,
      index: nextIndex,
      lines: group.lines.map(text => ({
        text: text,
        displayText: '',
        showCursor: true,
        charIndex: 0
      }))
    }

    displayedGroups.push(newGroup)

    this.setData({
      currentGroupIndex: nextIndex,
      displayedGroups
    })

    // 开始打字机效果
    this.typeGroupLine(nextIndex, 0)
  },

  typeGroupLine(groupIndex, lineIndex) {
    const { displayedGroups, storyGroups } = this.data
    const group = storyGroups[groupIndex]
    const line = displayedGroups[groupIndex].lines[lineIndex]

    if (line.charIndex >= line.text.length) {
      // 当前行打字完成
      displayedGroups[groupIndex].lines[lineIndex].showCursor = false
      this.setData({ displayedGroups })

      // 检查是否还有下一行
      if (lineIndex + 1 < group.lines.length) {
        // 显示下一行
        setTimeout(() => {
          this.typeGroupLine(groupIndex, lineIndex + 1)
        }, 300)
      } else {
        // 组内所有行显示完毕，等待后显示下一组
        const timer = setTimeout(() => {
          this.showNextGroup()
        }, group.pause)
        this.setData({ groupTimer: timer })
      }
      return
    }

    // 打下一个字
    line.charIndex++
    line.displayText = line.text.substring(0, line.charIndex)
    this.setData({ displayedGroups })

    // 继续打字 - 使用随机延迟增加呼吸感
    const baseDelay = 60
    const randomDelay = Math.random() * 40
    const delay = baseDelay + randomDelay

    const timer = setTimeout(() => {
      this.typeGroupLine(groupIndex, lineIndex)
    }, delay)

    this.setData({ charTimer: timer })
  },

  onAnimationComplete() {
    this.setData({
      isPlaying: false,
      isFinished: true,
      progress: 100
    })

    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer)
    }
  },

  onSkip() {
    this.clearAllTimers()
    this.navigateToGame()
  },

  onStartGame() {
    this.navigateToGame()
  },

  navigateToGame() {
    const { gameData } = this.data
    wx.redirectTo({
      url: `/pages/game/game?gameId=${gameData.gameId}`
    })
  }
})
