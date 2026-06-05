const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 处理更新用户资料的请求
  if (event.action === 'updateProfile') {
    try {
      await db.collection('users').where({
        openid: openid
      }).update({
        data: {
          nickName: event.nickName || '',
          avatarUrl: event.avatarUrl || '',
          lastLoginAt: db.serverDate()
        }
      })
      return { code: 0, message: '更新成功' }
    } catch (err) {
      console.error('更新失败', err)
      return { code: -1, message: '更新失败', error: err }
    }
  }

  // 登录流程
  try {
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    if (userRes.data.length === 0) {
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
