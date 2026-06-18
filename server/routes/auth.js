const express = require('express')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')

const logger = require('../utils/logger')
const db = require('../config/db')
const { generateToken, authenticate } = require('../middleware/auth')
const { logOperation } = require('../middleware/logger')
const { login } = require('../validations')

const router = express.Router()

/**
 * 修改管理员密码和用户名
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { username, password, newPassword } = req.body
    const userId = req.user.id
    
    if (!username || !password || !newPassword) {
      return res.status(400).json({ message: '所有字段都是必填项' })
    }
    
    if (password === newPassword) {
      return res.status(400).json({ message: '新密码不能与旧密码相同' })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度至少为6位' })
    }

    if (username.length > 50) {
      return res.status(400).json({ message: '用户名长度不能超过50个字符' })
    }
    
    // 查询当前用户
    const sql = 'SELECT * FROM users WHERE id = ?'
    const results = await db.query(sql, [userId])
    
    if (results.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    const user = results[0]
    
    if (!user.password) {
      return res.status(401).json({ message: '账户密码未设置，请联系管理员重置' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({ message: '旧密码错误' })
    }
    
    // 检查新用户名是否已存在
    if (username !== user.username) {
      const checkSql = 'SELECT id FROM users WHERE username = ? AND id != ?'
      const existingUsers = await db.query(checkSql, [username, userId])
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: '用户名已存在' })
      }
    }
    
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // 更新用户名和密码
    const updateSql = 'UPDATE users SET username = ?, password = ? WHERE id = ?'
    await db.query(updateSql, [username, hashedPassword, userId])
    
    logger.info('修改密码成功', { username })
    res.json({
      message: '修改成功',
      data: {
        username: username,
        role: user.role
      }
    })
  } catch (error) {
    logger.error('修改密码失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '修改密码失败' })
  }
})

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', login, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  try {
    const { username, password } = req.body

    // 查询用户
    const sql = 'SELECT * FROM users WHERE username = ?'
    const results = await db.query(sql, [username])
    
    if (results.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    const user = results[0]

    if (!user.password) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    // 生成token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    })

    logger.info('用户登录成功', { username: user.username, userId: user.id })

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })

    logOperation(user.id, user.username, 'login', 'auth', '用户登录成功', req.ip)
  } catch (error) {
    logger.error('登录错误', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '登录失败' })
  }
})

module.exports = router