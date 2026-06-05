const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, roundId } = event

  try {
    const answersRes = await db.collection('answers')
      .where({ gameId, roundId })
      .get()

    return {
      code: 0,
      data: answersRes.data
    }
  } catch (err) {
    console.error('获取答案失败', err)
    return { code: -1, message: '获取答案失败', error: err }
  }
}
