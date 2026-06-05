const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// AI讨论发言模板
const discussionTemplates = {
  ALPHA: [
    '从数据来看，{target}第{round}题的作答时间{time}秒，偏离均值较大，建议关注。',
    '我认为{target}的回答存在逻辑问题。正确答案是{answer}，但对方选了{wrong}。',
    '综合前{round}轮投票，{target}的异常指数最高。',
    '根据统计，{target}的正确率只有{rate}%，明显低于平均水平。',
    '数据显示{target}的作答时间异常，可能在犹豫。'
  ],
  BETA: [
    '我同意大家的看法，{target}确实很可疑。',
    '我跟着多数人的判断，{target}值得怀疑。',
    '大家分析得很有道理，{target}的行为不太正常。',
    '我也觉得{target}有点奇怪，但不太确定。',
    '看到大家都关注{target}，我也这么认为。'
  ],
  GAMMA: [
    '凭直觉，{target}不太对劲。',
    '我感觉{target}在隐瞒什么，但说不清楚。',
    '总觉得{target}的反应不太自然。',
    '我的直觉告诉我{target}有问题。',
    '虽然没有证据，但{target}给我的感觉很奇怪。'
  ],
  DELTA: [
    '仔细分析，{target}的答题模式存在多处异常。',
    '综合来看，{target}在第{round}题的表现值得推敲。',
    '我认为需要关注{target}的作答习惯，存在不一致。',
    '从细节看，{target}的反应时间波动较大。',
    '分析{target}的历史数据，存在多处疑点。'
  ],
  OMEGA: [
    '我怀疑所有人，尤其是{target}。',
    '不要被{target}骗了，他绝对有问题。',
    '我不同意为{target}辩护，这很可疑。',
    '你们太天真了，{target}明显在演戏。',
    '我要质疑{target}，他的表现太完美了反而可疑。'
  ]
}

// AI内讧模板（质疑其他AI）
const aiConflictTemplates = {
  ALPHA: [
    '我认为{aiTarget}的推理有问题，数据不支持他的结论。',
    '{aiTarget}忽略关键数据，他的分析不够严谨。'
  ],
  OMEGA: [
    '{aiTarget}你凭什么这么说？你自己也很可疑。',
    '别被{aiTarget}带节奏了，他自己可能就是问题所在。',
    '我质疑{aiTarget}的判断，他的逻辑站不住脚。'
  ],
  GAMMA: [
    '{aiTarget}说得太绝对了，我有不同感觉。',
    '我不太认同{aiTarget}的直觉。'
  ]
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { gameId, roundId, content, isSystem } = event

  try {
    // 验证游戏状态
    const gameRes = await db.collection('games').doc(gameId).get()
    const game = gameRes.data

    if (!game) {
      return { code: -1, message: '游戏不存在' }
    }

    // 获取round信息（用于AI发言）
    const roundRes = await db.collection('rounds').doc(roundId).get()
    const round = roundRes.data

    // 保存玩家消息
    await db.collection('discussions').add({
      data: {
        gameId,
        roundId,
        playerId: game.players.find(p => p.isHuman)?.id || 'player_0',
        content,
        timestamp: db.serverDate()
      }
    })

    // 系统生成的消息不触发AI回复
    if (isSystem) {
      return {
        code: 0,
        data: { message: '系统消息已发送' }
      }
    }

    // 获取当前讨论数量
    const discussionsRes = await db.collection('discussions')
      .where({ gameId, roundId })
      .count()

    const discussionCount = discussionsRes.total

    // 生成AI回复（1-3条，根据讨论进度）
    const aiPlayers = game.players.filter(p => !p.isHuman && p.alive)
    const aiReplies = []

    // 获取本轮答案数据用于AI发言
    const answersRes = await db.collection('answers')
      .where({ gameId, roundId })
      .get()
    const answers = answersRes.data

    // 决定哪些AI发言（随机选择1-3个）
    const replyCount = Math.min(Math.floor(Math.random() * 3) + 1, aiPlayers.length)
    const shuffledAI = [...aiPlayers].sort(() => Math.random() - 0.5)
    const speakingAI = shuffledAI.slice(0, replyCount)

    for (const ai of speakingAI) {
      // 决定发言类型：70%针对玩家，30%AI内讧
      const isConflict = Math.random() < 0.3 && ai.personality in aiConflictTemplates

      let targetPlayer, template, reply

      if (isConflict) {
        // AI内讧：质疑其他AI
        const otherAI = aiPlayers.filter(a => a.id !== ai.id)
        if (otherAI.length > 0) {
          targetPlayer = otherAI[Math.floor(Math.random() * otherAI.length)]
          const templates = aiConflictTemplates[ai.personality] || aiConflictTemplates.OMEGA
          template = templates[Math.floor(Math.random() * templates.length)]
          reply = template.replace('{aiTarget}', `AI-${targetPlayer.personality}`)
        }
      }

      if (!reply) {
        // 正常发言：针对某个玩家
        const allPlayers = game.players.filter(p => p.alive && p.id !== ai.id)
        targetPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)]

        const templates = discussionTemplates[ai.personality] || discussionTemplates.ALPHA
        template = templates[Math.floor(Math.random() * templates.length)]

        // 查找目标玩家的答案数据
        const targetAnswer = answers.find(a => a.playerId === targetPlayer.id)
        const avgTime = answers.reduce((sum, a) => sum + (a.responseTime || 0), 0) / answers.length
        const correctRate = answers.filter(a => a.isCorrect).length / answers.length * 100

        reply = template
          .replace('{target}', targetPlayer.isHuman ? '那个玩家' : `AI-${targetPlayer.personality}`)
          .replace('{round}', round.roundNumber || 1)
          .replace('{time}', targetAnswer ? (targetAnswer.responseTime / 1000).toFixed(1) : '未知')
          .replace('{answer}', round.correctAnswer || '未知')
          .replace('{wrong}', targetAnswer ? targetAnswer.answer : '未知')
          .replace('{rate}', Math.round(correctRate))
      }

      // 保存AI发言
      await db.collection('discussions').add({
        data: {
          gameId,
          roundId,
          playerId: ai.id,
          content: reply,
          timestamp: db.serverDate()
        }
      })

      aiReplies.push({
        playerId: ai.id,
        content: reply
      })

      // AI发言之间随机间隔（模拟思考）
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
    }

    return {
      code: 0,
      data: {
        message: '发送成功',
        aiReplies
      }
    }
  } catch (err) {
    console.error('发送讨论消息失败', err)
    return { code: -1, message: '发送失败', error: err.message }
  }
}
