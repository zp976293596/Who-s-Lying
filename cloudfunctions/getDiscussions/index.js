const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, roundId } = event

  try {
    // 获取所有讨论消息
    const discussionsRes = await db.collection('discussions')
      .where({ gameId, roundId })
      .orderBy('timestamp', 'asc')
      .get()

    const discussions = discussionsRes.data

    // 获取游戏信息以解析玩家名称
    const gameRes = await db.collection('games').doc(gameId).get()
    const game = gameRes.data

    if (!game) {
      return { code: -1, message: '游戏不存在' }
    }

    // 为每条消息添加玩家信息
    const enrichedDiscussions = discussions.map(msg => {
      const player = game.players.find(p => p.id === msg.playerId)
      return {
        ...msg,
        playerName: player?.isHuman ? '你' : `AI-${player?.personality || '未知'}`,
        isHuman: player?.isHuman || false,
        timestampStr: formatTime(msg.timestamp)
      }
    })

    return {
      code: 0,
      data: enrichedDiscussions
    }
  } catch (err) {
    console.error('获取讨论消息失败', err)
    return { code: -1, message: '获取讨论失败', error: err.message }
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}
