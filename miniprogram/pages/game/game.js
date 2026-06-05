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
    myResult: null
  },

  onLoad(options) {
    const gameData = app.globalData.currentGame
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
          wx.showToast({ title: '提交失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('提交答案失败', err)
        wx.showToast({ title: '提交失败', icon: 'none' })
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

          // 找到人类的答案结果
          const myResult = answerResults.find(r => r.isHuman)

          this.setData({
            answerResults,
            myResult
          })
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
            // 游戏结束
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

          // 更新游戏数据
          app.globalData.currentGame = {
            ...app.globalData.currentGame,
            roundId: nextData.roundId,
            currentRound: nextData.roundNumber,
            question: nextData.question,
            players: nextData.players
          }

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
    wx.navigateBack()
  }
})
