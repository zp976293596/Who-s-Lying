const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { gameId, roundId, answer, responseTime } = event

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { code: -1, message: '用户不存在' }
    }
    const user = userRes.data[0]

    // 获取游戏信息
    const gameRes = await db.collection('games').doc(gameId).get()
    const game = gameRes.data

    // 找到人类玩家
    const humanPlayer = game.players.find(p => p.isHuman)
    if (!humanPlayer) {
      return { code: -1, message: '玩家不存在' }
    }

    // 获取轮次信息
    const roundRes = await db.collection('rounds').doc(roundId).get()
    const round = roundRes.data

    // 判断答案是否正确
    const isCorrect = answer === round.correctAnswer

    // 计算作答异常度
    let anomaly = 0
    if (!isCorrect) {
      anomaly += 10 // 答错
    }
    if (responseTime > 20000) {
      anomaly += 5 // 作答时间过长
    }

    // 记录答案
    await db.collection('answers').add({
      data: {
        gameId,
        roundId,
        playerId: humanPlayer.id,
        isHuman: true,
        answer,
        isCorrect,
        responseTime,
        changeCount: 0,
        anomaly,
        skipped: answer === '',
        timestamp: db.serverDate()
      }
    })

    // 生成AI答案
    await generateAIAnswers(game, round, gameId, roundId)

    return {
      code: 0,
      message: '答案提交成功',
      data: {
        isCorrect,
        correctAnswer: round.correctAnswer
      }
    }
  } catch (err) {
    console.error('提交答案失败', err)
    return { code: -1, message: '提交答案失败', error: err }
  }
}

// 生成AI玩家答案
async function generateAIAnswers(game, round, gameId, roundId) {
  const aiPlayers = game.players.filter(p => !p.isHuman)

  const promises = aiPlayers.map(async (player) => {
    // 根据人格决定正确率
    const accuracyMap = {
      ALPHA: 0.85,  // 分析型，正确率高
      BETA: 0.70,   // 从众型，中等正确率
      GAMMA: 0.75,  // 平衡型
      DELTA: 0.65,  // 冒险型，正确率较低
      OMEGA: 0.60   // 怀疑型，容易出错
    }

    const accuracy = accuracyMap[player.personality] || 0.7
    const isCorrect = Math.random() < accuracy

    // 生成答案
    let answer
    if (isCorrect) {
      answer = round.correctAnswer
    } else {
      // 随机选一个错误答案
      const options = ['A', 'B', 'C', 'D'].filter(o => o !== round.correctAnswer)
      answer = options[Math.floor(Math.random() * options.length)]
    }

    // 随机作答时间 2-8秒
    const responseTime = (2 + Math.random() * 6) * 1000

    // 计算异常度
    let anomaly = 0
    if (!isCorrect) anomaly += 10
    if (responseTime > 20000) anomaly += 5

    // 记录答案
    return db.collection('answers').add({
      data: {
        gameId,
        roundId,
        playerId: player.id,
        isHuman: false,
        answer,
        isCorrect,
        responseTime,
        changeCount: 0,
        anomaly,
        skipped: false,
        timestamp: db.serverDate()
      }
    })
  })

  await Promise.all(promises)
}
