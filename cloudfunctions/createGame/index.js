const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// AI人格配置
const AI_PERSONALITIES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA']

// 题型配置
const QUESTION_TYPES = [
  'verbal', 'quantitative', 'reasoning', 'data',
  'knowledge', 'scenario', 'organize', 'analyze'
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { difficulty = 'normal' } = event

  try {
    // 1. 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { code: -1, message: '用户不存在' }
    }
    const user = userRes.data[0]

    // 2. 根据难度确定AI数量和阈值
    const difficultyConfig = {
      easy: { aiCount: 3, threshold: 90 },
      normal: { aiCount: 4, threshold: 80 },
      hard: { aiCount: 5, threshold: 70 }
    }
    const config = difficultyConfig[difficulty] || difficultyConfig.normal

    // 3. 随机选择AI人格
    const shuffled = [...AI_PERSONALITIES].sort(() => Math.random() - 0.5)
    const selectedPersonalities = shuffled.slice(0, config.aiCount)

    // 4. 随机选择5道题（每轮1道，共5轮）
    const questionsRes = await db.collection('questions')
      .limit(100)
      .get()

    if (questionsRes.data.length < 5) {
      return { code: -1, message: '题库不足，需要至少5道题' }
    }

    const allQuestions = questionsRes.data.sort(() => Math.random() - 0.5)
    const selectedQuestions = allQuestions.slice(0, 5)

    // 5. 创建玩家列表
    const players = [
      {
        id: 'player_0',
        isHuman: true,
        personality: null,
        providerId: null,
        humanPossibility: 20,
        alive: true,
        abilities: {
          dataLeak: { total: difficulty === 'easy' ? 2 : 1, used: 0 },
          signalShield: { total: difficulty === 'easy' ? 3 : 2, used: 0 },
          consciousnessDisruption: { total: difficulty === 'easy' ? 2 : 1, used: 0 },
          memoryOverride: { total: 1, used: 0 },
          silentMode: { total: 1, used: 0 },
          skip: { total: 1, used: 0 }
        }
      }
    ]

    selectedPersonalities.forEach((personality, index) => {
      players.push({
        id: `player_${index + 1}`,
        isHuman: false,
        personality,
        providerId: `local_template_${personality.toLowerCase()}`,
        humanPossibility: 20,
        alive: true
      })
    })

    // 6. 创建游戏记录
    const gameData = {
      userId: user._id,
      status: 'playing',
      playerCount: config.aiCount,
      currentRound: 1,
      maxRounds: 5,
      eliminateThreshold: config.threshold,
      humanAlive: true,
      winner: null,
      players,
      difficulty,
      questionIds: selectedQuestions.map(q => q._id),
      createdAt: db.serverDate(),
      finishedAt: null
    }

    const gameRes = await db.collection('games').add({ data: gameData })
    const gameId = gameRes._id

    // 7. 创建第一轮记录
    const firstQuestion = selectedQuestions[0]
    const roundData = {
      gameId,
      roundNumber: 1,
      questionType: firstQuestion.type,
      questionId: firstQuestion._id,
      question: {
        id: firstQuestion._id,
        content: firstQuestion.content,
        options: firstQuestion.options,
        type: firstQuestion.type
      },
      correctAnswer: firstQuestion.correctAnswer,
      status: 'answering',
      timeLimit: 30,
      event: null,
      createdAt: db.serverDate()
    }

    const roundRes = await db.collection('rounds').add({ data: roundData })

    return {
      code: 0,
      message: '游戏创建成功',
      data: {
        gameId,
        roundId: roundRes._id,
        players,
        currentRound: 1,
        question: roundData.question,
        timeLimit: roundData.timeLimit,
        eliminateThreshold: config.threshold
      }
    }
  } catch (err) {
    console.error('创建游戏失败', err)
    return { code: -1, message: '创建游戏失败', error: err }
  }
}
