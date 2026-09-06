const express = require('express')
const { validationResult, body } = require('express-validator')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// 校验规则
const validateOwnership = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('归属名称1-50位')
]

/**
 * 获取归属字典列表
 * GET /api/ownerships
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM ownership_options ORDER BY sort ASC, id ASC')
    res.json({ message: '获取成功', data: rows })
  } catch (error) {
    logger.error('获取归属列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取失败' })
  }
})

/**
 * 创建归属
 * POST /api/ownerships
 * body: { name, sort, need_replenish }
 */
router.post('/', validateOwnership, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, sort = 0, need_replenish = false } = req.body
  try {
    const exists = await db.query('SELECT COUNT(*) as cnt FROM ownership_options WHERE name = ?', [name])
    if (exists[0].cnt > 0) {
      return res.status(400).json({ message: '该归属名称已存在' })
    }
    const result = await db.query(
      'INSERT INTO ownership_options (name, sort, need_replenish) VALUES (?, ?, ?)',
      [name, sort, need_replenish ? 1 : 0]
    )
    logger.info('创建归属', { id: result.insertId, name, need_replenish })
    res.json({ message: '创建成功', data: { id: result.insertId } })
  } catch (error) {
    logger.error('创建归属失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建失败' })
  }
})

/**
 * 更新归属（重命名/排序/补货开关）
 * PUT /api/ownerships/:id
 * body: { name, sort?, need_replenish? }
 *
 * 修复：未传 sort 时保留原 sort，避免重命名把排序重置为 0
 */
router.put('/:id', validateOwnership, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, sort, need_replenish } = req.body
  try {
    const rows = await db.query('SELECT * FROM ownership_options WHERE id = ?', [req.params.id])
    if (rows.length === 0) {
      return res.status(404).json({ message: '归属不存在' })
    }
    const current = rows[0]

    // 未传的字段保留原值（sort、need_replenish 均可选更新）
    const finalSort = sort !== undefined && sort !== null ? parseInt(sort) : current.sort
    const finalNeed = need_replenish !== undefined && need_replenish !== null
      ? (need_replenish ? 1 : 0)
      : current.need_replenish

    // 检查重名（排除自身）
    const exists = await db.query('SELECT COUNT(*) as cnt FROM ownership_options WHERE name = ? AND id != ?', [name, req.params.id])
    if (exists[0].cnt > 0) {
      return res.status(400).json({ message: '该归属名称已存在' })
    }
    await db.query(
      'UPDATE ownership_options SET name = ?, sort = ?, need_replenish = ? WHERE id = ?',
      [name, finalSort, finalNeed, req.params.id]
    )
    logger.info('更新归属', { id: req.params.id, name, sort: finalSort, need_replenish: finalNeed })
    res.json({ message: '更新成功' })
  } catch (error) {
    logger.error('更新归属失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '更新失败' })
  }
})

/**
 * 删除归属（若已被耗材通过 ownership_id 引用则禁止删除）
 * DELETE /api/ownerships/:id
 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const rows = await db.query('SELECT name FROM ownership_options WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ message: '归属不存在' })
    }
    const name = rows[0].name
    const used = await db.query('SELECT COUNT(*) as cnt FROM consumables WHERE ownership_id = ? AND is_deleted = 0', [id])
    if (used[0].cnt > 0) {
      return res.status(400).json({ message: `该归属已被 ${used[0].cnt} 个耗材引用，无法删除` })
    }
    await db.query('DELETE FROM ownership_options WHERE id = ?', [id])
    logger.info('删除归属', { id, name })
    res.json({ message: '删除成功' })
  } catch (error) {
    logger.error('删除归属失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: error.message || '删除失败' })
  }
})

module.exports = router
