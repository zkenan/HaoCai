const express = require('express')
const XLSX = require('xlsx')

const path = require('path')
const fs = require('fs')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate } = require('../middleware/auth')
const { numberToChineseMoney } = require('../utils/codeGenerator')

const router = express.Router()
router.use(authenticate)

/**
 * 下载Excel导入模板
 * GET /api/files/template
 */
router.get('/template', (req, res) => {
  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建示例数据
    const data = [
      ['名称', '规格型号', '数量', '单位', '单价', '提报人'],
      ['网线', 'CAT6 1米', 100, '根', 5.5, '张老师'],
      ['内存', 'DDR4 8GB', 20, '条', 180.0, '李老师'],
      ['硒鼓', 'HP 88A', 10, '个', 250.0, '王老师'],
      ['键盘', '有线键盘', 30, '个', 45.0, '赵老师'],
      ['鼠标', '有线鼠标', 30, '个', 25.0, '刘老师']
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 }
    ]
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '耗材导入模板')
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    // 使用encodeURIComponent编码中文文件名，避免HTTP头中的无效字符
    const fileName = encodeURIComponent('耗材导入模板.xlsx')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`)
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

    // 获取入库单明细
    const itemsSql = `
      SELECT si.*, c.product_code, c.name, c.spec_model, c.unit 
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