const app = getApp()

Page({
  data: {
    gameId: '',
    round: 1,
    maxRounds: 5,
    phase: 'answering', // answering | revealing | discussing | voting | finished
    question: null,
    players: [],
    selectedAnswer: '',
    timeLeft: 30,
    timer: null,
    humanPlayer: null,
    aiPlayers: [],
    // 揭示阶段数据
    correctAnswer: '',
    answerResults: [],
    humanAnswer: null,
    myResult: null,
    // 讨论阶段数据
    discussions: [],
    discussionInput: '',
    discussionTimeLeft: 60,
    discussionTimer: null,
    correctCount: 0,
    wrongCount: 0
  },

  onLoad(options) {
    // 优先从 globalData 读取，降级到本地存储
    let gameData = app.globalData.currentGame
    if (!gameData) {
      gameData = wx.getStorageSync('currentGame')
      if (gameData) {
        app.globalData.currentGame = gameData
      }
    }
    if (!gameData) {
      wx.showToast({ title: '游戏数据异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const humanPlayer = gameData.players.find(p => p.isHuman)
    const aiPlayers = gameData.players.filter(p => !p.isHuman)

    this.setData({
      gameId: gameData.gameId,
      round: gameData.currentRound,
      maxRounds: 5,
      question: gameData.question,
      players: gameData.players,
      humanPlayer,
      aiPlayers,
      timeLeft: gameData.timeLimit || 30
    })

    this.startTimer()
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    if (this.data.discussionTimer) {
      clearInterval(this.data.discussionTimer)
    }
  },

  startTimer() {
    const timer = setInterval(() => {
      if (this.data.timeLeft <= 0) {
        clearInterval(timer)
        this.onTimeUp()
        return
      }
      this.setData({ timeLeft: this.data.timeLeft - 1 })
    }, 1000)
    this.setData({ timer })
  },

  onTimeUp() {
    if (!this.data.selectedAnswer) {
      this.submitAnswer('')
    }
  },

  onSelectOption(e) {
    const answer = e.currentTarget.dataset.answer
    this.setData({ selectedAnswer: answer })
  },

  onSubmitAnswer() {
    if (!this.data.selectedAnswer) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    this.submitAnswer(this.data.selectedAnswer)
  },

  submitAnswer(answer) {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }

    wx.showLoading({ title: '提交中...' })

    wx.cloud.callFunction({
      name: 'submitAnswer',
      data: {
        gameId: this.data.gameId,
        roundId: app.globalData.currentGame.roundId,
        answer,
        responseTime: (30 - this.data.timeLeft) * 1000
      },
      timeout: 30000,
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          const resultData = res.result.data
          this.setData({
            phase: 'revealing',
            correctAnswer: resultData.correctAnswer
          })
          // 加载所有答案
          this.loadAnswerResults()
        } else {
          wx.showToast({ title: res.result?.message || '提交失败', icon: 'none' })
          // 提交失败，恢复计时器
          this.startTimer()
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('提交答案失败', err)
        wx.showToast({ title: '提交失败', icon: 'none' })
        this.startTimer()
      }
    })
  },

  loadAnswerResults() {
    wx.cloud.callFunction({
      name: 'getAnswers',
      data: {
        gameId: this.data.gameId,
        roundId: app.globalData.currentGame.roundId
      },
      timeout: 30000,
      success: res => {
        if (res.result && res.result.code === 0) {
          const answers = res.result.data
          const players = this.data.players

          // 组合答案和玩家信息
          const answerResults = answers.map(answer => {
            const player = players.find(p => p.id === answer.playerId)
            return {
              ...answer,
              playerName: answer.isHuman ? '你' : `AI-${player?.personality || '未知'}`,
              isHuman: answer.isHuman,
              responseTimeStr: (answer.responseTime / 1000).toFixed(1) + '秒',
              anomalies: this.getAnomalies(answer)
            }
          })

          // 按作答时间排序
          answerResults.sort((a, b) => a.responseTime - b.responseTime)

          // 按嫌疑分数排序玩家（嫌疑公示栏）
          const sortedPlayers = [...players].sort((a, b) => b.humanPossibility - a.humanPossibility)

          // 找到人类的答案结果
          const myResult = answerResults.find(r => r.isHuman) || null

          this.setData({
            answerResults,
            myResult,
            players: sortedPlayers
          })

          // 自动生成AI初始讨论发言
          this.generateInitialDiscussions()
        }
      },
      fail: err => {
        console.error('获取答案失败', err)
      }
    })
  },

  getAnomalies(answer) {
    const anomalies = []
    if (!answer.isCorrect) {
      anomalies.push('答错')
    }
    if (answer.responseTime > 20000) {
      anomalies.push('超时')
    }
    if (answer.changeCount >= 2) {
      anomalies.push('犹豫')
    }
    if (answer.skipped) {
      anomalies.push('弃权')
    }
    return anomalies
  },

  onNextRound() {
    wx.showLoading({ title: '加载下一轮...' })

    wx.cloud.callFunction({
      name: 'nextRound',
      data: {
        gameId: this.data.gameId
      },
      timeout: 30000,
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          const nextData = res.result.data

          if (nextData.gameOver) {
            // 游戏结束，清除本地存储的游戏数据
            wx.removeStorageSync('currentGame')
            this.setData({ phase: 'finished' })
            wx.showModal({
              title: nextData.winner === 'human' ? '逃逸成功' : '被矩阵捕获',
              content: nextData.winner === 'human' ? '你成功伪装成AI存活到最后！' : '你的身份被识破了...',
              showCancel: false,
              confirmText: '返回',
              success: () => wx.navigateBack()
            })
            return
          }

          // 更新游戏数据（全局 + 本地存储）
          const updatedGame = {
            ...app.globalData.currentGame,
            roundId: nextData.roundId,
            currentRound: nextData.roundNumber,
            question: nextData.question,
            players: nextData.players
          }
          app.globalData.currentGame = updatedGame
          wx.setStorageSync('currentGame', updatedGame)

          const humanPlayer = nextData.players.find(p => p.isHuman)
          const aiPlayers = nextData.players.filter(p => !p.isHuman)

          this.setData({
            round: nextData.roundNumber,
            phase: 'answering',
            question: nextData.question,
            players: nextData.players,
            humanPlayer,
            aiPlayers,
            selectedAnswer: '',
            timeLeft: nextData.timeLimit || 30,
            correctAnswer: '',
            answerResults: [],
            myResult: null
          })

          this.startTimer()
        } else {
          wx.showToast({ title: res.result?.message || '加载失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('加载下一轮失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  onFinishGame() {
    wx.removeStorageSync('currentGame')
    wx.navigateBack()
  },

  // 进入讨论阶段
  onEnterDiscussion() {
    // 预处理统计数据
    const correctCount = this.data.answerResults.filter(r => r.isCorrect).length
    const wrongCount = this.data.answerResults.filter(r => !r.isCorrect).length

    this.setData({
      phase: 'discussing',
      discussions: [],
      discussionTimeLeft: 60,
      correctCount,
      wrongCount
    })
    this.startDiscussionTimer()
    this.loadDiscussions()
  },

  // 开始讨论倒计时
  startDiscussionTimer() {
    const discussionTimer = setInterval(() => {
      if (this.data.discussionTimeLeft <= 0) {
        clearInterval(discussionTimer)
        this.onDiscussionEnd()
        return
      }

      const timeLeft = this.data.discussionTimeLeft - 1
      this.setData({ discussionTimeLeft: timeLeft })

      // 在特定时间点触发AI发言
      if (timeLeft === 40 || timeLeft === 20 || timeLeft === 10) {
        this.triggerAIDiscussion()
      }
    }, 1000)
    this.setData({ discussionTimer })
  },

  // 讨论输入变化
  onDiscussionInput(e) {
    this.setData({ discussionInput: e.detail.value })
  },

  // 发送讨论消息
  onSendDiscussion() {
    const content = this.data.discussionInput.trim()
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })

    wx.cloud.callFunction({
      name: 'sendDiscussion',
      data: {
        gameId: this.data.gameId,
        roundId: app.globalData.currentGame.roundId,
        content
      },
      timeout: 30000,
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          this.setData({ discussionInput: '' })
          // 重新加载讨论消息
          this.loadDiscussions()
        } else {
          wx.showToast({ title: res.result?.message || '发送失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('发送讨论失败', err)
        wx.showToast({ title: '发送失败', icon: 'none' })
      }
    })
  },

  // 加载讨论消息
  loadDiscussions() {
    wx.cloud.callFunction({
      name: 'getDiscussions',
      data: {
        gameId: this.data.gameId,
        roundId: app.globalData.currentGame.roundId
      },
      timeout: 30000,
      success: res => {
        if (res.result && res.result.code === 0) {
          this.setData({ discussions: res.result.data })
          // 滚动到底部
          this.scrollToBottom()
        }
      },
      fail: err => {
        console.error('加载讨论失败', err)
      }
    })
  },

  // 滚动到讨论底部
  scrollToBottom() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select('.discussions-list').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec(res => {
        if (res[0]) {
          wx.pageScrollTo({
            scrollTop: res[0].bottom,
            duration: 300
          })
        }
      })
    }, 100)
  },

  // 生成初始AI讨论发言
  generateInitialDiscussions() {
    const { gameId, answerResults, players, round } = this.data
    const roundId = app.globalData.currentGame.roundId

    // 随机选择1-2个AI进行初始发言
    const aiPlayers = players.filter(p => !p.isHuman && p.alive)
    const speakingCount = Math.min(Math.floor(Math.random() * 2) + 1, aiPlayers.length)
    const shuffled = [...aiPlayers].sort(() => Math.random() - 0.5)
    const speakingAI = shuffled.slice(0, speakingCount)

    // AI发言模板
    const initTemplates = [
      '第{round}题的作答情况已经出来了，让我们分析一下。',
      '我注意到有人的作答时间异常，值得关注。',
      '这次的正确率整体{status}，但有些细节需要讨论。',
      '开始分析本轮作答数据，大家有什么发现？'
    ]

    speakingAI.forEach((ai, index) => {
      setTimeout(() => {
        const template = initTemplates[Math.floor(Math.random() * initTemplates.length)]
        const correctRate = answerResults.filter(r => r.isCorrect).length / answerResults.length
        const content = template
          .replace('{round}', round)
          .replace('{status}', correctRate > 0.7 ? '不错' : '偏低')

        wx.cloud.callFunction({
          name: 'sendDiscussion',
          data: {
            gameId,
            roundId,
            content,
            isSystem: true // 标记为系统生成，不触发额外AI回复
          }
        })

        this.loadDiscussions()
      }, index * 1500)
    })
  },

  // 讨论结束
  onDiscussionEnd() {
    if (this.data.discussionTimer) {
      clearInterval(this.data.discussionTimer)
    }
    // 进入下一轮
    this.onNextRound()
  },

  // 触发AI讨论发言
  triggerAIDiscussion() {
    const { gameId, players, answerResults, round } = this.data
    const roundId = app.globalData.currentGame.roundId

    // 随机选择1-2个AI发言
    const aiPlayers = players.filter(p => !p.isHuman && p.alive)
    const replyCount = Math.min(Math.floor(Math.random() * 2) + 1, aiPlayers.length)
    const shuffled = [...aiPlayers].sort(() => Math.random() - 0.5)
    const speakingAI = shuffled.slice(0, replyCount)

    // 根据时间点选择发言模板
    const timeTemplates = {
      40: [
        '大家讨论得怎么样了？我来分析一下数据。',
        '我注意到一些有趣的模式，让我分享一下。',
        '从作答数据来看，有几个值得关注的点。'
      ],
      20: [
        '时间不多了，我来总结一下目前的发现。',
        '距离讨论结束还有20秒，大家有什么结论？',
        '让我快速分析一下关键疑点。'
      ],
      10: [
        '最后10秒，我的结论是...',
        '时间紧迫，我必须说出我的判断。',
        '最终分析：有人在伪装，我有线索。'
      ]
    }

    const templates = timeTemplates[this.data.discussionTimeLeft] || timeTemplates[40]

    speakingAI.forEach((ai, index) => {
      setTimeout(() => {
        const template = templates[Math.floor(Math.random() * templates.length)]

        wx.cloud.callFunction({
          name: 'sendDiscussion',
          data: {
            gameId,
            roundId,
            content: template,
            isSystem: true
          },
          success: () => {
            this.loadDiscussions()
          }
        })
      }, index * 800)
    })
  }
})
