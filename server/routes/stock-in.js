const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const { validationResult } = require('express-validator')

const path = require('path')
const fs = require('fs')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')
const { generateStockInCode, generateProductCode } = require('../utils/codeGenerator')
const { createStockIn } = require('../validations')

const router = express.Router()
router.use(authenticate)

// 配置临时文件上传（用于 Excel 解析）
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true)
    } else {
      cb(new Error('只支持Excel文件格式(.xlsx, .xls)'))
    }
  }
})

/**
 * 解析上传的 Excel 文件，返回耗材列表（不写入数据库）
 * POST /api/stock-in/parse-excel
 */
router.post('/parse-excel', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传Excel文件' })
  }

  try {
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: 'Excel文件为空' })
    }

    const items = data.map((row, index) => ({
      consumable_name: row['名称'] || row['name'] || '',
      spec_model: row['规格型号'] || row['spec_model'] || '',
      quantity: parseInt(row['数量'] || row['quantity'] || 0),
      unit: row['单位'] || row['unit'] || '个',
      unit_price: parseFloat(row['单价'] || row['unit_price'] || 0),
      reporter: row['提报人'] || row['reporter'] || req.user?.username || ''
    }))

    // 删除临时文件
    fs.unlinkSync(req.file.path)

    logger.info('解析入库Excel', { count: items.length })
    res.json({ message: '解析成功', data: items })
  } catch (error) {
    logger.error('解析Excel失败', { error: error.message, stack: error.stack })
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ message: '解析Excel失败' })
  }
})

/**
 * 创建入库单
 * POST /api/stock-in
 * items 中每项: { consumable_id?, consumable_name, spec_model?, unit?, quantity, unit_price, reporter? }
 */
router.post('/', createStockIn, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  try {
    const {
      supplier_name,
      supplier_address,
      contact_phone,
      contact_person,
      delivery_person,
      warehouse_manager,
      items
    } = req.body

    // 生成入库单号
    const recordCode = await generateStockInCode()
    const stockInDate = new Date().toISOString().split('T')[0]
    const userId = req.user.id

    // 计算总金额
    let totalAmount = 0
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price
    })

    // 开启事务
    const connection = await db.pool.promise().getConnection()

    try {
      await connection.beginTransaction()

      // 插入入库单
      const recordSql = `
        INSERT INTO stock_in_records
        (record_code, supplier_name, supplier_address, contact_phone, contact_person,
         delivery_person, warehouse_manager, stock_in_date, total_amount, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const recordResult = await connection.execute(recordSql, [
        recordCode,
        supplier_name,
        supplier_address || '',
        contact_phone || '',
        contact_person || '',
        delivery_person,
        warehouse_manager,
        stockInDate,
        totalAmount,
        userId
      ])

      const stockInId = recordResult[0].insertId

      // 插入入库单明细，并创建/更新耗材
      for (const item of items) {
        let consumableId = item.consumable_id

        if (!consumableId) {
          // 新建耗材（传入事务连接，确保批量时不生成重复编号）
          const productCode = await generateProductCode(0, connection)
          const insertSql = `
            INSERT INTO consumables (product_code, name, spec_model, quantity, unit, unit_price, reporter, is_deleted)
            VALUES (?, ?, ?, 0, ?, ?, ?, 0)
          `
          const insertResult = await connection.execute(insertSql, [
            productCode,
            item.consumable_name,
            item.spec_model || '',
            item.unit || '个',
            item.unit_price,
            item.reporter || req.user?.username || ''
          ])
          consumableId = insertResult[0].insertId
        }

        // 插入入库单明细（包含耗材信息快照）
        const itemSql = `
          INSERT INTO stock_in_items
          (stock_in_id, consumable_id, consumable_name, spec_model, unit, reporter, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        await connection.execute(itemSql, [
          stockInId,
          consumableId,
          item.consumable_name,
          item.spec_model || '',
          item.unit || '个',
          item.reporter || '',
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price
        ])

        // 更新耗材库存（增加入库数量）
        const updateSql = `UPDATE consumables SET quantity = quantity + ? WHERE id = ?`
        await connection.execute(updateSql, [item.quantity, consumableId])
      }

      await connection.commit()

      logger.info('创建入库单', { recordCode, totalAmount })
      res.json({
        message: '入库单创建成功',
        data: {
          id: stockInId,
          record_code: recordCode,
          total_amount: totalAmount
        }
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('创建入库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建入库单失败' })
  }
})

/**
 * 获取入库单列表
 * GET /api/stock-in
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query
    const offset = (page - 1) * limit

    let sql = `
      SELECT sr.*, u.username as created_by_name
      FROM stock_in_records sr
      LEFT JOIN users u ON sr.created_by = u.id
    `
    let countSql = `
      SELECT COUNT(*) as total
      FROM stock_in_records sr
    `
    const params = []

    if (keyword) {
      sql += ' WHERE sr.record_code LIKE ? OR sr.supplier_name LIKE ?'
      countSql += ' WHERE sr.record_code LIKE ? OR sr.supplier_name LIKE ?'
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
    logger.error('获取入库单列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取入库单列表失败' })
  }
})

/**
 * 获取入库单详情
 * GET /api/stock-in/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const recordSql = `
      SELECT sr.*, u.username as created_by_name
      FROM stock_in_records sr
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE sr.id = ?
    `
    const recordResults = await db.query(recordSql, [req.params.id])

    if (recordResults.length === 0) {
      return res.status(404).json({ message: '入库单不存在' })
    }

    // 优先使用 stock_in_items 自身字段，兼容旧数据通过 COALESCE 回退到 consumables
    const itemsSql = `
      SELECT si.*,
        c.product_code,
        COALESCE(si.consumable_name, c.name) as name,
        COALESCE(si.spec_model, c.spec_model) as spec_model,
        COALESCE(si.unit, c.unit) as unit
      FROM stock_in_items si
      LEFT JOIN consumables c ON si.consumable_id = c.id
      WHERE si.stock_in_id = ?
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
    logger.error('获取入库单详情失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取入库单详情失败' })
  }
})

/**
 * 批量删除入库单
 * POST /api/stock-in/batch-delete
 * body: { ids: [...], deleteStock: boolean }
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids, deleteStock } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要删除的入库单' })
    }

    const connection = await db.pool.promise().getConnection()
    try {
      await connection.beginTransaction()

      const placeholders = ids.map(() => '?').join(',')
      const [allItems] = await connection.execute(
        `SELECT * FROM stock_in_items WHERE stock_in_id IN (${placeholders})`, ids
      )

      // 先删除 stock_in_items（解除对 consumables 的外键引用）
      await connection.execute(`DELETE FROM stock_in_items WHERE stock_in_id IN (${placeholders})`, ids)

      if (deleteStock) {
        const consumableIds = [...new Set(allItems.map(item => item.consumable_id))]
        for (const cid of consumableIds) {
          // 检查是否被其他入库单引用（此时当前入库单的 items 已删除）
          const [otherInRefs] = await connection.execute(
            'SELECT COUNT(*) as cnt FROM stock_in_items WHERE consumable_id = ?', [cid]
          )
          if (otherInRefs[0].cnt > 0) continue // 共享耗材，跳过

          // 不共享，级联删除：出库单明细 → 出库单主表 → 耗材
          const [outItems] = await connection.execute(
            'SELECT stock_out_id FROM stock_out_items WHERE consumable_id = ?', [cid]
          )
          const outIds = [...new Set(outItems.map(r => r.stock_out_id))]
          if (outIds.length > 0) {
            const outPH = outIds.map(() => '?').join(',')
            await connection.execute(`DELETE FROM stock_out_items WHERE stock_out_id IN (${outPH})`, outIds)
            await connection.execute(`DELETE FROM stock_out_records WHERE id IN (${outPH})`, outIds)
          }
          await connection.execute('DELETE FROM consumables WHERE id = ?', [cid])
        }
      }

      await connection.execute(`DELETE FROM stock_in_records WHERE id IN (${placeholders})`, ids)

      await connection.commit()
      logger.info('批量删除入库单', { count: ids.length, deleteStock: !!deleteStock })
      res.json({ message: `成功删除${ids.length}条入库单` })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('批量删除入库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '批量删除失败' })
  }
})

/**
 * 删除入库单
 * DELETE /api/stock-in/:id?deleteStock=true|false
 */
router.delete('/:id', async (req, res) => {
  try {
    const recordSql = 'SELECT * FROM stock_in_records WHERE id = ?'
    const recordResults = await db.query(recordSql, [req.params.id])

    if (recordResults.length === 0) {
      return res.status(404).json({ message: '入库单不存在' })
    }

    const deleteStock = req.query.deleteStock === 'true'
    const stockInId = parseInt(req.params.id)
    const connection = await db.pool.promise().getConnection()

    try {
      await connection.beginTransaction()

      const itemsSql = 'SELECT * FROM stock_in_items WHERE stock_in_id = ?'
      const items = await connection.execute(itemsSql, [stockInId])

      // 先删除 stock_in_items（解除对 consumables 的外键引用）
      await connection.execute('DELETE FROM stock_in_items WHERE stock_in_id = ?', [stockInId])

      if (deleteStock) {
        for (const item of items[0]) {
          const cid = item.consumable_id

          // 检查是否被其他入库单引用（此时当前入库单的 items 已删除）
          const [otherInRefs] = await connection.execute(
            'SELECT COUNT(*) as cnt FROM stock_in_items WHERE consumable_id = ?', [cid]
          )
          if (otherInRefs[0].cnt > 0) continue // 共享耗材，跳过

          // 不共享，级联删除：出库单明细 → 出库单主表 → 耗材
          const [outItems] = await connection.execute(
            'SELECT stock_out_id FROM stock_out_items WHERE consumable_id = ?', [cid]
          )
          const outIds = [...new Set(outItems.map(r => r.stock_out_id))]
          if (outIds.length > 0) {
            const outPH = outIds.map(() => '?').join(',')
            await connection.execute(`DELETE FROM stock_out_items WHERE stock_out_id IN (${outPH})`, outIds)
            await connection.execute(`DELETE FROM stock_out_records WHERE id IN (${outPH})`, outIds)
          }
          await connection.execute('DELETE FROM consumables WHERE id = ?', [cid])
        }
      }

      await connection.execute('DELETE FROM stock_in_records WHERE id = ?', [stockInId])

      await connection.commit()

      logger.info('删除入库单', { id: req.params.id, deleteStock })
      res.json({ message: '删除成功' })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    logger.error('删除入库单失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '删除入库单失败' })
  }
})

module.exports = router
