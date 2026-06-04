const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    if (userRes.data.length === 0) {
      // 首次登录，创建用户记录
      await db.collection('users').add({
        data: {
          openid: openid,
          nickName: '',
          avatarUrl: '',
          totalGames: 0,
          wins: 0,
          createdAt: db.serverDate(),
          lastLoginAt: db.serverDate()
        }
      })
    } else {
      // 更新最后登录时间
      await db.collection('users').where({
        openid: openid
      }).update({
        data: {
          lastLoginAt: db.serverDate()
        }
      })
    }

    return {
      code: 0,
      openid: openid,
      message: '登录成功'
    }
  } catch (err) {
    console.error('登录失败', err)
    return {
      code: -1,
      message: '登录失败',
      error: err
    }
  }
}
