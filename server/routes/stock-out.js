const express = require('express')
const { validationResult } = require('express-validator')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')
const { generateStockOutCode } = require('../utils/codeGenerator')
const { createStockOut } = require('../validations')
const { checkStockAlert } = require('../utils/notification')

const router = express.Router()
router.use(authenticate)

/**
 * 创建出库单
 * POST /api/stock-out
 */
router.post('/', createStockOut, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  try {
    const { 
      recipient, 
      purpose,
      items, // [{consumable_id, quantity, unit_price}]
      stock_out_date
    } = req.body

    const recordCode = await generateStockOutCode()
    const outDate = stock_out_date || new Date().toISOString().split('T')[0]
    const userId = req.user.id

    let totalAmount = 0
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price
    })

    const connection = await db.pool.promise().getConnection()
    
    try {
      await connection.beginTransaction()

      for (const item of items) {
        const [stockResults] = await connection.execute(
          'SELECT quantity FROM consumables WHERE id = ? FOR UPDATE',
          [item.consumable_id]
        )

        if (stockResults.length === 0) {
          throw new Error(`耗材ID ${item.consumable_id} 不存在`)
        }

        if (stockResults[0].quantity < item.quantity) {
          throw new Error(`耗材库存不足，当前库存: ${stockResults[0].quantity}，申请出库: ${item.quantity}`)
        }
      }

      const recordSql = `
        INSERT INTO stock_out_records 
        (record_code, stock_out_date, recipient, purpose, total_amount, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `

      const recordResult = await connection.execute(recordSql, [
        recordCode, outDate, recipient, purpose || '', totalAmount, userId
      ])

      const stockOutId = recordResult[0].insertId

      for (const item of items) {
        const itemSql = `
          INSERT INTO stock_out_items (stock_out_id, consumable_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `
        await connection.execute(itemSql, [
          stockOutId, item.consumable_id, item.quantity, item.unit_price, item.quantity * item.unit_price
        ])

        const updateSql = `UPDATE consumables SET quantity = quantity - ? WHERE id = ?`
        await connection.execute(updateSql, [item.quantity, item.consumable_id])
      }

      await connection.commit()

      const alertResult = await checkStockAlert()
      if (alertResult.count > 0) {
        logger.warn(`库存预警：${alertResult.count}项耗材库存不足`)
      }

      logger.info('创建出库单', { recordCode, totalAmount })
      res.json({
        message: '出库单创建成功',
        data: { id: stockOutId, record_code: recordCode, total_amount: totalAmount }
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('创建出库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建出库单失败' })
  }
})

/**
 * 获取出库单列表
 * GET /api/stock-out
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query
    const offset = (page - 1) * limit

    let sql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_out_records sr 
      LEFT JOIN users u ON sr.created_by = u.id
    `
    let countSql = `
      SELECT COUNT(*) as total 
      FROM stock_out_records sr
    `
    const params = []

    if (keyword) {
      sql += ' WHERE sr.record_code LIKE ? OR sr.recipient LIKE ?'
      countSql += ' WHERE sr.record_code LIKE ? OR sr.recipient LIKE ?'
      const searchParam = `%${keyword}%`
      params.push(searchParam, searchParam)
    }

    sql += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const [results, countResults] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, params.slice(0, -2))
    ])

    res.json({
      message: '获取成功',
      data: results,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    logger.error('获取出库单列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取出库单列表失败' })
  }
})

/**
 * 获取出库单详情
 * GET /api/stock-out/:id
 */
router.get('/:id', async (req, res) => {
  try {
    // 获取出库单基本信息
    const recordSql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_out_records sr 
      LEFT JOIN users u ON sr.created_by = u.id 
      WHERE sr.id = ?
    `
    const recordResults = await db.query(recordSql, [req.params.id])
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '出库单不存在' })
    }

    // 获取出库单明细
    const itemsSql = `
      SELECT si.*, c.product_code, c.name, c.spec_model, c.unit 
      FROM stock_out_items si 
      LEFT JOIN consumables c ON si.consumable_id = c.id 
      WHERE si.stock_out_id = ?
      ORDER BY si.id ASC
    `
    const items = await db.query(itemsSql, [req.params.id])

    res.json({
      data: {
        ...recordResults[0],
        items
      }
    })
  } catch (error) {
    logger.error('获取出库单详情失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取出库单详情失败' })
  }
})

/**
 * 批量删除出库单
 * POST /api/stock-out/batch-delete
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要删除的出库单' })
    }

    const connection = await db.pool.promise().getConnection()
    try {
      await connection.beginTransaction()

      const placeholders = ids.map(() => '?').join(',')
      const [allItems] = await connection.execute(
        `SELECT * FROM stock_out_items WHERE stock_out_id IN (${placeholders})`, ids
      )

      const stockUpdates = {}
      allItems.forEach(item => {
        stockUpdates[item.consumable_id] = (stockUpdates[item.consumable_id] || 0) + item.quantity
      })
      for (const [cid, qty] of Object.entries(stockUpdates)) {
        await connection.execute('UPDATE consumables SET quantity = quantity + ? WHERE id = ?', [qty, cid])
      }

      await connection.execute(`DELETE FROM stock_out_items WHERE stock_out_id IN (${placeholders})`, ids)
      await connection.execute(`DELETE FROM stock_out_records WHERE id IN (${placeholders})`, ids)

      await connection.commit()
      logger.info('批量删除出库单', { count: ids.length })
      res.json({ message: `成功删除${ids.length}条出库单` })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('批量删除出库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '批量删除失败' })
  }
})

/**
 * 删除出库单
 * DELETE /api/stock-out/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // 获取出库单信息
    const recordSql = 'SELECT * FROM stock_out_records WHERE id = ?'
    const recordResults = await db.query(recordSql, [req.params.id])
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '出库单不存在' })
    }

    // 开启事务
    const connection = await db.pool.promise().getConnection()
    
    try {
      await connection.beginTransaction()

      // 获取出库单明细
      const itemsSql = 'SELECT * FROM stock_out_items WHERE stock_out_id = ?'
      const items = await connection.execute(itemsSql, [req.params.id])

      // 恢复耗材库存
      for (const item of items[0]) {
        const updateSql = `
          UPDATE consumables 
          SET quantity = quantity + ? 
          WHERE id = ?
        `
        await connection.execute(updateSql, [item.quantity, item.consumable_id])
      }

      // 删除出库单(级联删除明细)
      const deleteSql = 'DELETE FROM stock_out_records WHERE id = ?'
      await connection.execute(deleteSql, [req.params.id])

      await connection.commit()

      logger.info('删除出库单', { id: req.params.id })
      res.json({ message: '删除成功' })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('删除出库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '删除出库单失败' })
  }
})

module.exports = router