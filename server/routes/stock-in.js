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

/**
 * 去掉 Excel 表头 key 末尾的 *（模板必填标识），生成兼容字段字典
 * 如 {'名称*': 'A4纸', ...} → {'名称': 'A4纸', ...}
 */
function stripStarKeys(row) {
  const r = {}
  Object.keys(row).forEach(k => {
    r[k.replace(/\*$/, '')] = row[k]
  })
  return r
}

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
 * 同时解析"归属"和"分类"字段：
 *   - 归属按 name 查 ownership_id
 *   - 分类按 "大类/小类" 拆分，分别查 categories 取 id
 * 若归属/分类在数据库中找不到，对应行进入 invalid_items，不影响其他行解析。
 *
 * POST /api/stock-in/parse-excel
 * 返回：{ data: { items: [...], invalid_items: [...] } }
 */
router.post('/parse-excel', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传Excel文件' })
  }

  try {
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    if (data.length === 0) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: 'Excel文件为空' })
    }

    // 预读所有归属与分类，构建查找字典
    // 注：categories/ownership_options 表当前未启用 is_deleted 字段
    const ownerships = await db.query(
      'SELECT id, name FROM ownership_options'
    )
    const ownershipByName = new Map(ownerships.map(o => [o.name, o.id]))

    const allCats = await db.query(
      'SELECT id, name, parent_id FROM categories'
    )
    const bigCats = allCats.filter(c => c.parent_id === 0 || c.parent_id === null)
    const smallCats = allCats.filter(c => c.parent_id !== 0 && c.parent_id !== null)
    const bigByName = new Map(bigCats.map(c => [c.name, c]))

    const items = []
    const invalid_items = []

    data.forEach((rawRow, index) => {
      const row = stripStarKeys(rawRow)
      const consumable_name = (row['名称'] || row['name'] || '').toString().trim()
      const ownership_name = (row['归属'] || row['ownership'] || '').toString().trim()
      const category_path = (row['分类'] || row['category'] || '').toString().trim()

      const baseItem = {
        consumable_name,
        spec_model: (row['规格型号'] || row['spec_model'] || '').toString(),
        quantity: parseInt(row['数量'] || row['quantity'] || 0),
        unit: (row['单位'] || row['unit'] || '个').toString(),
        unit_price: parseFloat(row['单价'] || row['unit_price'] || 0),
        reporter: (row['提报人'] || row['reporter'] || req.user?.username || '').toString()
      }

      // 必填校验：耗材名称
      if (!consumable_name) {
        invalid_items.push({
          row: index + 2,
          ...baseItem,
          ownership_name,
          category_path,
          error: '耗材名称为空'
        })
        return
      }

      // 归属解析（按 name 查 id）
      let ownership_id = null
      if (ownership_name) {
        ownership_id = ownershipByName.get(ownership_name)
        if (!ownership_id) {
          invalid_items.push({
            row: index + 2,
            ...baseItem,
            ownership_name,
            category_path,
            error: `归属"${ownership_name}"在系统中不存在，请先在归属管理中添加`
          })
          return
        }
      }

      // 分类解析（按 "大类/小类" 拆分）
      let category_id = null
      let big_category_name = null
      let small_category_name = null
      if (category_path) {
        const parts = category_path.split('/').map(s => s.trim())
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          invalid_items.push({
            row: index + 2,
            ...baseItem,
            ownership_name,
            category_path,
            error: '分类格式错误（应为"大类/小类"，例如"办公耗材/A4纸"）'
          })
          return
        }
        big_category_name = parts[0]
        small_category_name = parts[1]
        const big = bigByName.get(big_category_name)
        if (!big) {
          invalid_items.push({
            row: index + 2,
            ...baseItem,
            ownership_name,
            category_path,
            error: `大类"${big_category_name}"在系统中不存在，请先在分类管理中添加`
          })
          return
        }
        const small = smallCats.find(c => c.parent_id === big.id && c.name === small_category_name)
        if (!small) {
          invalid_items.push({
            row: index + 2,
            ...baseItem,
            ownership_name,
            category_path,
            error: `小类"${small_category_name}"不存在于"${big_category_name}"下`
          })
          return
        }
        category_id = small.id
      }

      items.push({
        ...baseItem,
        ownership_name: ownership_name || null,
        ownership_id,
        category_path: category_path || null,
        big_category_name,
        small_category_name,
        category_id
      })
    })

    // 删除临时文件
    fs.unlinkSync(req.file.path)

    logger.info('解析入库Excel', { count: items.length, invalid: invalid_items.length })
    res.json({
      message: '解析成功',
      data: { items, invalid_items }
    })
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
          // 解析归属：ownership_id 存在则查字典取 name（同时写 ownership 与 ownership_id 字段，保持外键 + 文本双轨）
          let finalOwnership = '部门公用'
          let finalOwnershipId = null
          if (item.ownership_id) {
            const [oRows] = await connection.execute(
              'SELECT id, name FROM ownership_options WHERE id = ?',
              [item.ownership_id]
            )
            if (oRows.length > 0) {
              finalOwnership = oRows[0].name
              finalOwnershipId = oRows[0].id
            }
          }

          const productCode = await generateProductCode(0, connection)
          const insertSql = `
            INSERT INTO consumables
              (product_code, name, spec_model, quantity, unit, unit_price, reporter,
               ownership, ownership_id, category_id, is_deleted)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0)
          `
          const insertResult = await connection.execute(insertSql, [
            productCode,
            item.consumable_name,
            item.spec_model || '',
            item.unit || '个',
            item.unit_price,
            item.reporter || req.user?.username || '',
            finalOwnership,
            finalOwnershipId,
            item.category_id || null
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
    // 第八轮改动：新增 start_date / end_date 查询参数（前端工作台抽屉按本月筛选）
    const { page = 1, limit = 20, keyword, start_date, end_date } = req.query
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

    // 第八轮改动：以 WHERE 1=1 起始占位，便于后续 AND 拼接
    sql += ' WHERE 1=1'
    countSql += ' WHERE 1=1'

    if (start_date) {
      sql += ' AND sr.created_at >= ?'
      countSql += ' AND sr.created_at >= ?'
      params.push(`${start_date} 00:00:00`)
    }
    if (end_date) {
      sql += ' AND sr.created_at <= ?'
      countSql += ' AND sr.created_at <= ?'
      params.push(`${end_date} 23:59:59`)
    }
    if (keyword) {
      sql += ' AND (sr.record_code LIKE ? OR sr.supplier_name LIKE ?)'
      countSql += ' AND (sr.record_code LIKE ? OR sr.supplier_name LIKE ?)'
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
