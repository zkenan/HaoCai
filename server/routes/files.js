const express = require('express')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')
const { buildStockInTemplate } = require('../utils/excelTemplate')

const router = express.Router()
router.use(authenticate)

/**
 * 下载Excel导入模板
 * GET /api/files/template
 *
 * 模板字段（含 Excel 数据验证下拉）：
 *   名称* | 规格型号 | 数量* | 单位 | 单价 | 提报人 | 归属* | 分类*
 *   - 归属列下拉 = 所有 ownership_options.name
 *   - 分类列下拉 = 所有"大类/小类"完整路径
 *
 * 附带 Sheet：
 *   - "分类清单"：所有分类（大类+小类），辅助查阅
 *   - "归属清单"：所有归属（含补货建议开关），辅助查阅
 */
router.get('/template', async (req, res) => {
  try {
    // 读取当前所有分类与归属（每次导出取最新，添加新归属/分类后重新导出即可生效）
    // 注：categories/ownership_options 表当前未启用 is_deleted 软删，过滤由前端/业务层处理
    const categories = await db.query(
      'SELECT id, name, parent_id, sort FROM categories ORDER BY parent_id ASC, sort ASC, id ASC'
    )
    const ownerships = await db.query(
      'SELECT id, name, sort, need_replenish FROM ownership_options ORDER BY sort ASC, id ASC'
    )

    const workbook = buildStockInTemplate(categories, ownerships)
    const excelBuffer = await workbook.xlsx.writeBuffer()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    const fileName = encodeURIComponent('耗材导入模板.xlsx')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
    )
    res.send(excelBuffer)
  } catch (error) {
    logger.error('生成模板失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '生成模板失败' })
  }
})

/**
 * 获取入库单数据（用于前端打印）
 * GET /api/files/stock-in/:id/data
 */
router.get('/stock-in/:id/data', async (req, res) => {
  try {
    // 获取入库单信息
    const recordSql = `
      SELECT sr.*
      FROM stock_in_records sr
      WHERE sr.id = ?
    `
    const recordResults = await db.query(recordSql, [req.params.id])

    if (recordResults.length === 0) {
      return res.status(404).json({ message: '入库单不存在' })
    }

    const record = recordResults[0]

    // 获取入库单明细（优先使用 stock_in_items 自身字段，兼容旧数据）
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

    res.json({ message: '获取成功', data: { record, items } })
  } catch (error) {
    logger.error('获取入库单数据失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取数据失败' })
  }
})

/**
 * 获取出库单数据（用于前端打印）
 * GET /api/files/stock-out/:id/data
 */
router.get('/stock-out/:id/data', async (req, res) => {
  try {
    // 获取出库单信息
    const recordSql = `
      SELECT sr.*
      FROM stock_out_records sr
      WHERE sr.id = ?
    `
    const recordResults = await db.query(recordSql, [req.params.id])

    if (recordResults.length === 0) {
      return res.status(404).json({ message: '出库单不存在' })
    }

    const record = recordResults[0]

    // 获取出库单明细
    const itemsSql = `
      SELECT si.*, c.product_code, c.name, c.spec_model, c.unit
      FROM stock_out_items si
      LEFT JOIN consumables c ON si.consumable_id = c.id
      WHERE si.stock_out_id = ?
      ORDER BY si.id ASC
    `
    const items = await db.query(itemsSql, [req.params.id])

    res.json({ message: '获取成功', data: { record, items } })
  } catch (error) {
    logger.error('获取出库单数据失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取数据失败' })
  }
})

module.exports = router