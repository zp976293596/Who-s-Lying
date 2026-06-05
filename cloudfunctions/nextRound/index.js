const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId } = event

  try {
    // 获取游戏信息
    const gameRes = await db.collection('games').doc(gameId).get()
    const game = gameRes.data

    // 获取当前轮次的所有答案
    const currentRoundRes = await db.collection('rounds')
      .where({ gameId, roundNumber: game.currentRound })
      .get()

    if (currentRoundRes.data.length === 0) {
      return { code: -1, message: '轮次数据异常' }
    }

    const currentRound = currentRoundRes.data[0]

    // 获取所有答案
    const answersRes = await db.collection('answers')
      .where({ gameId, roundId: currentRound._id })
      .get()

    const answers = answersRes.data

    // 校验所有存活玩家是否已作答
    const alivePlayersList = game.players.filter(p => p.alive)
    if (answers.length < alivePlayersList.length) {
      return { code: -1, message: '还有玩家未作答，无法进入下一轮' }
    }

    // 计算每个玩家的人类可能性变化
    let players = [...game.players]

    // 计算投票得分和异常得分
    for (let player of players) {
      if (!player.alive) continue

      const playerAnswer = answers.find(a => a.playerId === player.id)
      if (playerAnswer) {
        // 异常得分
        let anomalyScore = 0
        if (!playerAnswer.isCorrect) anomalyScore += 10
        if (playerAnswer.responseTime > 20000) anomalyScore += 5
        if (playerAnswer.changeCount >= 2) anomalyScore += 5

        player.humanPossibility += anomalyScore
      }

      // 衰减机制：每轮结束 -3
      player.humanPossibility = Math.max(0, player.humanPossibility - 3)
    }

    // 检查是否有人被淘汰
    const eliminatedPlayers = players.filter(p =>
      p.alive && p.humanPossibility >= game.eliminateThreshold
    )

    for (let player of eliminatedPlayers) {
      player.alive = false
    }

    // 更新玩家状态
    await db.collection('games').doc(gameId).update({
      data: { players }
    })

    // 检查游戏是否结束
    const alivePlayers = players.filter(p => p.alive)
    const humanPlayer = players.find(p => p.isHuman)

    // 人类被淘汰
    if (!humanPlayer.alive) {
      await db.collection('games').doc(gameId).update({
        data: {
          status: 'finished',
          winner: 'ai',
          finishedAt: db.serverDate()
        }
      })

      return {
        code: 0,
        data: {
          gameOver: true,
          winner: 'ai',
          players
        }
      }
    }

    // 仅剩人类1人（所有AI被淘汰），人类胜利
    if (alivePlayers.length === 1) {
      await db.collection('games').doc(gameId).update({
        data: {
          status: 'finished',
          winner: 'human',
          finishedAt: db.serverDate()
        }
      })

      return {
        code: 0,
        data: {
          gameOver: true,
          winner: 'human',
          players
        }
      }
    }

    // 存活2人（人类+1AI），进入最终审判
    if (alivePlayers.length === 2) {
      await db.collection('games').doc(gameId).update({
        data: {
          finalTrial: { started: true, roundId: currentRound._id, result: null }
        }
      })

      return {
        code: 0,
        data: {
          gameOver: false,
          finalTrial: true,
          players,
          eliminatedPlayers: eliminatedPlayers.map(p => ({
            id: p.id,
            personality: p.personality,
            isHuman: p.isHuman
          }))
        }
      }
    }

    // 达到最大轮次
    if (game.currentRound >= game.maxRounds) {
      await db.collection('games').doc(gameId).update({
        data: {
          status: 'finished',
          winner: 'human',
          finishedAt: db.serverDate()
        }
      })

      return {
        code: 0,
        data: {
          gameOver: true,
          winner: 'human',
          players
        }
      }
    }

    // 创建下一轮
    const nextRoundNumber = game.currentRound + 1
    const questionId = game.questionIds[nextRoundNumber - 1]

    // 获取题目信息
    const questionRes = await db.collection('questions').doc(questionId).get()
    const question = questionRes.data

    const roundData = {
      gameId,
      roundNumber: nextRoundNumber,
      questionType: question.type,
      questionId: question._id,
      question: {
        id: question._id,
        content: question.content,
        options: question.options,
        type: question.type
      },
      correctAnswer: question.correctAnswer,
      status: 'answering',
      timeLimit: 30,
      event: null,
      createdAt: db.serverDate()
    }

    const roundRes = await db.collection('rounds').add({ data: roundData })

    // 更新游戏当前轮次
    await db.collection('games').doc(gameId).update({
      data: { currentRound: nextRoundNumber }
    })

    return {
      code: 0,
      data: {
        gameOver: false,
        roundId: roundRes._id,
        roundNumber: nextRoundNumber,
        question: roundData.question,
        timeLimit: roundData.timeLimit,
        players,
        eliminatedPlayers: eliminatedPlayers.map(p => ({
          id: p.id,
          personality: p.personality,
          isHuman: p.isHuman
        }))
      }
    }
  } catch (err) {
    console.error('下一轮失败', err)
    return { code: -1, message: '下一轮失败', error: err }
  }
}
