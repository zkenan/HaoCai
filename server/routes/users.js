const express = require('express')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate, isAdmin } = require('../middleware/auth')
const { createUser, updateUser } = require('../validations')

const router = express.Router()
router.use(authenticate)
router.use(isAdmin)

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const sql = 'SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    const countSql = 'SELECT COUNT(*) as total FROM users'

    const [results, countResults] = await Promise.all([
      db.query(sql, [parseInt(limit), parseInt(offset)]),
      db.query(countSql)
    ])

    res.json({
      message: '获取成功',
      data: results,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    logger.error('获取用户列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取用户列表失败' })
  }
})

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', createUser, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { username, password, role } = req.body

  try {
    const checkSql = 'SELECT id FROM users WHERE username = ?'
    const existingUsers = await db.query(checkSql, [username])
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
    const result = await db.query(sql, [username, hashedPassword, role])

    logger.info('创建用户', { username, role })
    res.json({
      message: '创建成功',
      data: {
        id: result.insertId,
        username,
        role
      }
    })
  } catch (error) {
    logger.error('创建用户失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建用户失败' })
  }
})

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', updateUser, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { username, role } = req.body
  const { id } = req.params

  try {
    const checkSql = 'SELECT id FROM users WHERE id = ?'
    const existingUser = await db.query(checkSql, [id])
    if (existingUser.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const duplicateSql = 'SELECT id FROM users WHERE username = ? AND id != ?'
    const duplicates = await db.query(duplicateSql, [username, id])
    if (duplicates.length > 0) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    const sql = 'UPDATE users SET username = ?, role = ? WHERE id = ?'
    await db.query(sql, [username, role, id])

    logger.info('更新用户', { id })
    res.json({ message: '更新成功' })
  } catch (error) {
    logger.error('更新用户失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '更新用户失败' })
  }
})

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: '不能删除自己' })
  }

  try {
    const stockIn = await db.query('SELECT COUNT(*) as c FROM stock_in_records WHERE created_by = ?', [id])
    const stockOut = await db.query('SELECT COUNT(*) as c FROM stock_out_records WHERE created_by = ?', [id])
    if (stockIn[0].c > 0 || stockOut[0].c > 0) {
      return res.status(400).json({ message: '该用户有关联的入库/出库记录，无法删除' })
    }

    const sql = 'DELETE FROM users WHERE id = ?'
    const result = await db.query(sql, [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    logger.info('删除用户', { id })
    res.json({ message: '删除成功' })
  } catch (error) {
    logger.error('删除用户失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '删除用户失败' })
  }
})

/**
 * 重置密码
 * PUT /api/users/:id/password
 */
router.put('/:id/password', async (req, res) => {
  const { newPassword, adminPassword } = req.body
  const { id } = req.params

  if (!newPassword) {
    return res.status(400).json({ message: '请提供新密码' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '密码长度至少为6位' })
  }

  try {
    const adminUser = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id])
    const isValid = await bcrypt.compare(adminPassword, adminUser[0].password)
    if (!isValid) {
      return res.status(401).json({ message: '管理员密码错误' })
    }

    const checkSql = 'SELECT id FROM users WHERE id = ?'
    const existingUser = await db.query(checkSql, [id])
    if (existingUser.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const sql = 'UPDATE users SET password = ? WHERE id = ?'
    await db.query(sql, [hashedPassword, id])

    logger.info('重置用户密码', { id })
    res.json({ message: '密码重置成功' })
  } catch (error) {
    logger.error('重置密码失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '重置密码失败' })
  }
})

module.exports = router
