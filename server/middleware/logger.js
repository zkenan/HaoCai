const db = require('../config/db')

const logOperation = async (userId, username, action, module, detail = '', ip = '') => {
  try {
    await db.query(
      'INSERT INTO operation_logs (user_id, username, action, module, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, action, module, detail, ip]
    )
  } catch (error) {
    console.error('记录操作日志失败:', error.message)
  }
}

const operationLogger = (action, module) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data?.message) {
        const userId = req.user?.id || null
        const username = req.user?.username || 'unknown'
        const ip = req.ip || req.connection?.remoteAddress || ''
        const detail = data.message
        logOperation(userId, username, action, module, detail, ip)
      }
      return originalJson(data)
    }
    next()
  }
}

module.exports = { logOperation, operationLogger }
