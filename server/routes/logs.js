const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate, isAdmin } = require('../middleware/auth')

router.use(authenticate)
router.use(isAdmin)

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, action, module, user_id } = req.query
    const offset = (page - 1) * limit

    let sql = 'SELECT * FROM operation_logs'
    let countSql = 'SELECT COUNT(*) as total FROM operation_logs'
    const conditions = []
    const params = []

    if (action) {
      conditions.push('action = ?')
      params.push(action)
    }
    if (module) {
      conditions.push('module = ?')
      params.push(module)
    }
    if (user_id) {
      conditions.push('user_id = ?')
      params.push(user_id)
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ')
      sql += where
      countSql += where
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const [results, countResults] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, conditions.length > 0 ? params.slice(0, -2) : [])
    ])

    res.json({
      message: '获取成功',
      data: results,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    logger.error('获取操作日志失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取操作日志失败' })
  }
})

module.exports = router
