const express = require('express')
const { validationResult } = require('express-validator')
const { body } = require('express-validator')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// 校验规则
const validateCategory = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('分类名称1-50位')
]

/**
 * 获取分类树（两级：大类 + 小类）
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM categories ORDER BY parent_id ASC, sort ASC, id ASC')

    // 组装成树形结构
    const bigCategories = rows.filter(r => r.parent_id === 0)
    const tree = bigCategories.map(big => ({
      id: big.id,
      name: big.name,
      sort: big.sort,
      children: rows.filter(r => r.parent_id === big.id)
    }))

    res.json({ message: '获取成功', data: tree })
  } catch (error) {
    logger.error('获取分类失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取失败' })
  }
})

/**
 * 获取扁平分类列表（用于下拉框）
 * GET /api/categories/flat
 */
router.get('/flat', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM categories ORDER BY parent_id ASC, sort ASC, id ASC')
    res.json({ message: '获取成功', data: rows })
  } catch (error) {
    logger.error('获取分类失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取失败' })
  }
})

/**
 * 创建分类
 * POST /api/categories
 * body: { name, parent_id }
 */
router.post('/', validateCategory, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, parent_id = 0, sort = 0 } = req.body
  try {
    const result = await db.query(
      'INSERT INTO categories (name, parent_id, sort) VALUES (?, ?, ?)',
      [name, parent_id, sort]
    )
    logger.info('创建分类', { id: result.insertId, name, parent_id })
    res.json({ message: '创建成功', data: { id: result.insertId } })
  } catch (error) {
    logger.error('创建分类失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建失败' })
  }
})

/**
 * 更新分类
 * PUT /api/categories/:id
 * body: { name, sort }
 */
router.put('/:id', validateCategory, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, sort } = req.body
  try {
    await db.query(
      'UPDATE categories SET name = ?, sort = ? WHERE id = ?',
      [name, sort || 0, req.params.id]
    )
    logger.info('更新分类', { id: req.params.id, name })
    res.json({ message: '更新成功' })
  } catch (error) {
    logger.error('更新分类失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '更新失败' })
  }
})

/**
 * 删除分类（若分类下还有耗材则禁止删除）
 * DELETE /api/categories/:id
 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    // 检查是否有小类挂在此大类下
    const children = await db.query('SELECT COUNT(*) as cnt FROM categories WHERE parent_id = ?', [id])
    if (children[0].cnt > 0) {
      return res.status(400).json({ message: '该分类下存在小类，请先删除小类' })
    }
    // 检查是否有耗材引用此分类
    const used = await db.query('SELECT COUNT(*) as cnt FROM consumables WHERE category_id = ? AND is_deleted = 0', [id])
    if (used[0].cnt > 0) {
      return res.status(400).json({ message: '该分类下存在耗材，无法删除' })
    }
    await db.query('DELETE FROM categories WHERE id = ?', [id])
    logger.info('删除分类', { id })
    res.json({ message: '删除成功' })
  } catch (error) {
    logger.error('删除分类失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: error.message || '删除失败' })
  }
})

module.exports = router
