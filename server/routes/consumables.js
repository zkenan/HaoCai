const express = require('express')
const multer = require('multer')
const xlsx = require('xlsx')
const { validationResult } = require('express-validator')

const path = require('path')
const fs = require('fs')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')
const { generateProductCode } = require('../utils/codeGenerator')
const { createConsumable } = require('../validations')
const { checkStockAlert } = require('../utils/notification')

const router = express.Router()
router.use(authenticate)

// 配置文件上传 - 使用process.cwd()获取当前工作目录
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
 * 获取已删除的耗材列表
 * GET /api/consumables/deleted
 */
router.get('/deleted', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM consumables WHERE is_deleted = 1 ORDER BY deleted_at DESC')
    res.json({ message: '获取成功', data: items })
  } catch (error) {
    logger.error('获取已删除耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取失败' })
  }
})

/**
 * 恢复已删除的耗材
 * POST /api/consumables/restore/:id
 */
router.post('/restore/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query('UPDATE consumables SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '耗材不存在' })
    }

    logger.info('恢复耗材', { id })
    res.json({ message: '恢复成功' })
  } catch (error) {
    logger.error('恢复耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '恢复失败' })
  }
})

/**
 * 获取耗材列表
 * GET /api/consumables
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query
    const offset = (page - 1) * limit

    // 使用别名明确指定需要的字段，避免total_price自动生成列干扰
    let sql = `SELECT 
      id, 
      product_code, 
      name, 
      spec_model, 
      quantity, 
      unit, 
      unit_price,
      reporter, 
      created_at, 
      updated_at 
    FROM consumables WHERE is_deleted = 0`
    let countSql = 'SELECT COUNT(*) as total FROM consumables WHERE is_deleted = 0'
    const params = []

    if (keyword) {
      sql += ' AND (name LIKE ? OR product_code LIKE ?)'
      countSql += ' AND (name LIKE ? OR product_code LIKE ?)'
      const searchParam = `%${keyword}%`
      params.push(searchParam, searchParam)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const [results, countResults] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, params.slice(0, -2))
    ])

    // 确保返回的数据不包含total_price字段
    const cleanResults = results.map(row => ({
      id: row.id,
      product_code: row.product_code,
      name: row.name,
      spec_model: row.spec_model,
      quantity: row.quantity,
      unit: row.unit,
      unit_price: row.unit_price,
      reporter: row.reporter,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

    res.json({
      message: '获取成功',
      data: cleanResults,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    logger.error('获取耗材列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取耗材列表失败' })
  }
})

/**
 * 获取库存预警
 * GET /api/consumables/stock/alerts
 */
router.get('/stock/alerts', async (req, res) => {
  try {
    const result = await checkStockAlert()
    res.json({ message: '获取成功', data: result.alerts, count: result.count })
  } catch (error) {
    logger.error('获取库存预警失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取库存预警失败' })
  }
})

/**
 * 获取耗材详情
 * GET /api/consumables/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const sql = 'SELECT * FROM consumables WHERE id = ? AND is_deleted = 0'
    const results = await db.query(sql, [req.params.id])
    
    if (results.length === 0) {
      return res.status(404).json({ message: '耗材不存在' })
    }

    res.json({ message: '获取成功', data: results[0] })
  } catch (error) {
    logger.error('获取耗材详情失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取耗材详情失败' })
  }
})

/**
 * 创建耗材
 * POST /api/consumables
 */
router.post('/', createConsumable, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, spec_model, quantity, unit, unit_price, reporter } = req.body

  try {
    const productCode = await generateProductCode()

    const sql = `
      INSERT INTO consumables (product_code, name, spec_model, quantity, unit, unit_price, reporter)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    const result = await db.query(sql, [
      productCode,
      name,
      spec_model || '',
      parseInt(quantity),
      unit,
      parseFloat(unit_price),
      reporter
    ])

    logger.info('创建耗材', { id: result.insertId, name, productCode })
    res.json({
      message: '创建成功',
      data: {
        id: result.insertId,
        product_code: productCode,
        total_price: quantity * unit_price
      }
    })
  } catch (error) {
    logger.error('创建耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '创建耗材失败' })
  }
})

/**
 * 批量导入耗材
 * POST /api/consumables/batch
 */
router.post('/batch', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传Excel文件' })
  }

  try {
    const { reporter: defaultReporter } = req.body

    // 读取Excel文件
    const workbook = xlsx.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: 'Excel文件为空' })
    }

    let successCount = 0
    const errors = []
    
    const connection = await db.pool.promise().getConnection()
    try {
      await connection.beginTransaction()

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        try {
          const rowReporter = row['提报人'] || row['reporter'] || row['reporter '] || defaultReporter || 'admin'
          
          const productCode = await generateProductCode(i)
          
          const sql = `
            INSERT INTO consumables (product_code, name, spec_model, quantity, unit, unit_price, reporter, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `

          await connection.execute(sql, [
            productCode,
            row['名称'] || row['name'] || '',
            row['规格型号'] || row['spec_model'] || '',
            parseInt(row['数量'] || row['quantity'] || 0),
            row['单位'] || row['unit'] || '个',
            parseFloat(row['单价'] || row['unit_price'] || 0),
            rowReporter
          ])
          successCount++
        } catch (error) {
          errors.push({ row: i + 1, error: error.message })
        }
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    // 删除上传的文件
    fs.unlinkSync(req.file.path)

    logger.info('批量导入耗材', { count: successCount })

    // 返回导入结果
    if (errors.length > 0) {
      res.json({
        message: `批量导入完成，成功 ${successCount} 条，失败 ${errors.length} 条`,
        count: successCount,
        errors: errors
      })
    } else {
      res.json({
        message: `批量导入成功，共导入 ${successCount} 条记录`,
        count: successCount
      })
    }
  } catch (error) {
    logger.error('批量导入耗材失败', { error: error.message, stack: error.stack })
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ message: '批量导入失败' })
  }
})

/**
 * 更新耗材
 * PUT /api/consumables/:id
 */
router.put('/:id', createConsumable, (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}, async (req, res) => {
  const { name, spec_model, quantity, unit, unit_price, reporter } = req.body

  try {
    const sql = `
      UPDATE consumables 
      SET name = ?, spec_model = ?, quantity = ?, unit = ?, unit_price = ?, reporter = ?
      WHERE id = ?
    `

    await db.query(sql, [
      name,
      spec_model || '',
      parseInt(quantity),
      unit,
      parseFloat(unit_price),
      reporter,
      req.params.id
    ])

    logger.info('更新耗材', { id: req.params.id, name })
    res.json({ message: '更新成功' })
  } catch (error) {
    logger.error('更新耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '更新耗材失败' })
  }
})

/**
 * 批量删除耗材（软删除）
 * POST /api/consumables/batch-delete
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要删除的耗材' })
    }

    const placeholders = ids.map(() => '?').join(',')
    await db.query(`UPDATE consumables SET is_deleted = 1, deleted_at = NOW() WHERE id IN (${placeholders}) AND is_deleted = 0`, ids)

    logger.info('批量删除耗材', { count: ids.length })
    res.json({ message: `成功删除${ids.length}条耗材` })
  } catch (error) {
    logger.error('批量删除耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '批量删除失败' })
  }
})

/**
 * 删除耗材（软删除）
 * DELETE /api/consumables/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const sql = 'UPDATE consumables SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0'
    const result = await db.query(sql, [req.params.id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '耗材不存在或已删除' })
    }

    logger.info('删除耗材', { id: req.params.id })
    res.json({ message: '删除成功' })
  } catch (error) {
    logger.error('删除耗材失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '删除耗材失败' })
  }
})

/**
 * 获取库存趋势数据
 * GET /api/consumables/stock/trends
 */
router.get('/stock/trends', async (req, res) => {
  try {
    const { period = 'day', days = 30 } = req.query

    const dateFormatMap = { day: '%Y-%m-%d', week: '%Y-%u', month: '%Y-%m' }
    const dateFormat = dateFormatMap[period] || dateFormatMap.day

    const stockInSql = `
      SELECT DATE_FORMAT(si.created_at, ?) as date,
             SUM(si.quantity) as quantity,
             SUM(si.total_price) as amount
      FROM stock_in_items si
      WHERE si.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY date
      ORDER BY date
    `

    const stockOutSql = `
      SELECT DATE_FORMAT(so.created_at, ?) as date,
             SUM(so.quantity) as quantity,
             SUM(so.total_price) as amount
      FROM stock_out_items so
      WHERE so.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY date
      ORDER BY date
    `

    const [stockInData, stockOutData] = await Promise.all([
      db.query(stockInSql, [dateFormat, parseInt(days)]),
      db.query(stockOutSql, [dateFormat, parseInt(days)])
    ])

    res.json({
      message: '获取成功',
      data: {
        stockIn: stockInData,
        stockOut: stockOutData
      }
    })
  } catch (error) {
    logger.error('获取库存趋势失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取库存趋势失败' })
  }
})

/**
 * 获取库存数据（包含当前库存、累计入库、累计出库）
 * GET /api/stock/inventory
 */
router.get('/stock/inventory', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query
    const offset = (page - 1) * limit

    // 查询每个耗材的当前库存、累计入库和累计出库（排除已删除）
    let sql = `
      SELECT
        c.*,
        COALESCE(si.total_stock_in, 0) as total_stock_in,
        COALESCE(so.total_stock_out, 0) as total_stock_out,
        (c.quantity + COALESCE(si.total_stock_in, 0) - COALESCE(so.total_stock_out, 0)) as current_stock
      FROM consumables c
      LEFT JOIN (
        SELECT
          si.consumable_id,
          SUM(si.quantity) as total_stock_in
        FROM stock_in_items si
        GROUP BY si.consumable_id
      ) si ON c.id = si.consumable_id
      LEFT JOIN (
        SELECT
          so.consumable_id,
          SUM(so.quantity) as total_stock_out
        FROM stock_out_items so
        GROUP BY so.consumable_id
      ) so ON c.id = so.consumable_id
      WHERE c.is_deleted = 0
    `

    let countSql = 'SELECT COUNT(*) as total FROM consumables WHERE is_deleted = 0'
    const params = []

    if (keyword) {
      sql += ' AND (c.name LIKE ? OR c.product_code LIKE ?)'
      countSql += ' AND (name LIKE ? OR product_code LIKE ?)'
      const searchParam = `%${keyword}%`
      params.push(searchParam, searchParam)
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
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
    logger.error('获取库存数据失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取库存数据失败' })
  }
})

/**
 * 获取库存统计数据
 * GET /api/stock/stats
 */
router.get('/stock/stats', async (req, res) => {
  try {
    const statsSql = `
      SELECT 
        (SELECT COUNT(*) FROM consumables WHERE is_deleted = 0) as totalTypes,
        (SELECT COALESCE(SUM(quantity), 0) FROM consumables WHERE is_deleted = 0) as totalQuantity,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_in_items) as totalStockIn,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_out_items) as totalStockOut
    `
    const [stats] = await db.query(statsSql)

    res.json({
      message: '获取成功',
      data: {
        totalTypes: stats.totalTypes || 0,
        totalQuantity: stats.totalQuantity || 0,
        totalStockIn: stats.totalStockIn || 0,
        totalStockOut: stats.totalStockOut || 0
      }
    })
  } catch (error) {
    logger.error('获取库存统计失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取库存统计失败' })
  }
})

/**
 * 获取最近动态（最近入库和出库记录）
 * GET /api/stock/activities
 */
router.get('/stock/activities', async (req, res) => {
  try {
    const { limit = 10 } = req.query

    // 查询最近的入库记录
    const stockInSql = `
      SELECT 
        'in' as type,
        si.stock_in_id as id,
        c.name as consumable_name,
        si.quantity,
        c.unit,
        sr.delivery_person as user,
        sr.supplier_name as department,
        sr.created_at as time
      FROM stock_in_items si
      LEFT JOIN consumables c ON si.consumable_id = c.id
      LEFT JOIN stock_in_records sr ON si.stock_in_id = sr.id
      ORDER BY sr.created_at DESC
      LIMIT ?
    `

    // 查询最近的出库记录
    const stockOutSql = `
      SELECT 
        'out' as type,
        so.id,
        c.name as consumable_name,
        so.quantity,
        c.unit,
        sor.recipient as user,
        sor.purpose as department,
        sor.created_at as time
      FROM stock_out_items so
      LEFT JOIN consumables c ON so.consumable_id = c.id
      LEFT JOIN stock_out_records sor ON so.stock_out_id = sor.id
      ORDER BY sor.created_at DESC
      LIMIT ?
    `

    const [stockInRecords, stockOutRecords] = await Promise.all([
      db.query(stockInSql, [parseInt(limit)]),
      db.query(stockOutSql, [parseInt(limit)])
    ])

    // 合并并按时间排序
    const allActivities = [...stockInRecords, ...stockOutRecords]
      .map(item => ({
        id: `${item.type}-${item.id}-${Math.random()}`,
        type: item.type,
        title: item.type === 'in' 
          ? `入库 · ${item.consumable_name} x${item.quantity}` 
          : `出库 · ${item.consumable_name} x${item.quantity}`,
        user: item.user || '系统',
        department: item.department || '-',
        time: new Date(item.time).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, parseInt(limit))

    res.json({
      message: '获取成功',
      data: allActivities,
      total: allActivities.length
    })
  } catch (error) {
    logger.error('获取最近动态失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取最近动态失败' })
  }
})

module.exports = router