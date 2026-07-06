const express = require('express')
const router = express.Router()

const fs = require('fs')
const path = require('path')

const logger = require('../utils/logger')
const db = require('../config/db')
const { authenticate, isAdmin } = require('../middleware/auth')

// 各表合法列名白名单
const TABLE_COLUMNS = {
  users: ['id', 'username', 'password', 'role', 'created_at', 'updated_at'],
  consumables: ['id', 'product_code', 'name', 'spec_model', 'quantity', 'unit', 'unit_price', 'reporter', 'created_at', 'updated_at'],
  stock_in_records: ['id', 'record_code', 'supplier_name', 'supplier_address', 'contact_phone', 'contact_person', 'delivery_person', 'warehouse_manager', 'stock_in_date', 'total_amount', 'created_by', 'created_at', 'updated_at'],
  stock_in_items: ['id', 'stock_in_id', 'consumable_id', 'quantity', 'unit_price', 'total_price', 'created_at'],
  stock_out_records: ['id', 'record_code', 'stock_out_date', 'recipient', 'purpose', 'total_amount', 'created_by', 'created_at', 'updated_at'],
  stock_out_items: ['id', 'stock_out_id', 'consumable_id', 'quantity', 'unit_price', 'total_price', 'created_at']
}

const VALID_TABLES = Object.keys(TABLE_COLUMNS)

function sanitizeColumns(tableName, row) {
  const allowed = TABLE_COLUMNS[tableName]
  if (!allowed) return null
  const columns = Object.keys(row).filter(col => allowed.includes(col))
  if (columns.length === 0) return null
  return columns
}

function getBackupsDir() {
  return path.join(process.cwd(), 'uploads', 'backups')
}

function safePath(baseDir, filename) {
  const resolved = path.resolve(baseDir, filename)
  if (!resolved.startsWith(path.resolve(baseDir))) return null
  return resolved
}

router.use(authenticate)
router.use(isAdmin)

router.get('/export', async (req, res) => {
  try {
    const backupData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      database: 'xapiaihaocai',
      tables: {}
    }

    const tables = [
      'users', 'consumables', 'stock_in_records', 'stock_in_items',
      'stock_out_records', 'stock_out_items'
    ]

    for (const tableName of tables) {
      let rows
      if (tableName === 'users') {
        rows = await db.query('SELECT * FROM `users`')
      } else {
        rows = await db.query(`SELECT * FROM \`${tableName}\``)
      }
      backupData.tables[tableName] = rows
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup_${timestamp}.json`

    // 直接返回文件流，不经过 JSON 包装
    const jsonStr = JSON.stringify(backupData, null, 2)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(jsonStr)

    logger.info('导出备份数据', { filename })
  } catch (error) {
    logger.error('数据导出失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '数据导出失败' })
  }
})

router.post('/import', async (req, res) => {
  let connection
  try {
    const backupData = req.body

    if (!backupData.tables || !backupData.version) {
      return res.status(400).json({
        message: '无效的备份文件格式'
      })
    }

    const tableNames = Object.keys(backupData.tables)
    for (const t of tableNames) {
      if (!VALID_TABLES.includes(t)) {
        return res.status(400).json({ message: `未知的表名: ${t}` })
      }
    }

    const totalRecords = Object.values(backupData.tables).reduce((sum, arr) => {
      return sum + (Array.isArray(arr) ? arr.length : 0)
    }, 0)

    if (totalRecords === 0) {
      return res.status(400).json({
        message: '导入失败：备份文件中没有任何数据！'
      })
    }

    const usersData = backupData.tables.users
    if (!usersData || !Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({
        message: '导入失败：备份文件中缺少用户数据！'
      })
    }

    logger.info(`备份文件验证通过，总记录数: ${totalRecords}`)

    connection = await new Promise((resolve, reject) => {
      db.pool.getConnection((err, conn) => {
        if (err) reject(err)
        else resolve(conn)
      })
    })

    await new Promise((resolve, reject) => {
      connection.query('START TRANSACTION', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    logger.info('事务已开启，开始导入数据...')

    const clearOrder = [
      'stock_out_items', 'stock_in_items', 'stock_out_records',
      'stock_in_records', 'consumables', 'users'
    ]

    for (const tableName of clearOrder) {
      await new Promise((resolve, reject) => {
        connection.query(`DELETE FROM \`${tableName}\``, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      await new Promise((resolve, reject) => {
        connection.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      logger.info(`已清空表: ${tableName}`)
    }

    const importOrder = [
      'users', 'consumables', 'stock_in_records', 'stock_in_items',
      'stock_out_records', 'stock_out_items'
    ]

    let importedCount = 0
    let importedTables = 0

    const datetimeFields = ['created_at', 'updated_at', 'stock_in_date', 'stock_out_date']

    const convertDatetime = (value) => {
      if (!value) return value
      if (typeof value === 'string' && value.includes('T')) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 19).replace('T', ' ')
        }
      }
      return value
    }

    for (const tableName of importOrder) {
      const rows = backupData.tables[tableName]

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        logger.info(`跳过空表: ${tableName}`)
        continue
      }

      logger.info(`导入表 ${tableName}: ${rows.length} 条记录`)

      for (const row of rows) {
        const columns = sanitizeColumns(tableName, row)
        if (!columns || columns.length === 0) continue

        const values = columns.map(col => {
          const value = row[col]
          if (datetimeFields.includes(col)) {
            return convertDatetime(value)
          }
          return value
        })
        const placeholders = columns.map(() => '?').join(', ')
        const escapedCols = columns.map(c => `\`${c}\``).join(', ')
        const insertSQL = `INSERT INTO \`${tableName}\` (${escapedCols}) VALUES (${placeholders})`

        await new Promise((resolve, reject) => {
          connection.query(insertSQL, values, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }

      importedCount += rows.length
      importedTables++
    }

    await new Promise((resolve, reject) => {
      connection.query('COMMIT', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    logger.info('导入备份数据', { count: importedCount })

    res.json({
      message: '数据还原成功',
      data: { importedTables, importedRecords: importedCount }
    })

  } catch (error) {
    if (connection) {
      try {
        await new Promise((resolve) => {
          connection.query('ROLLBACK', () => resolve())
        })
        logger.info('事务已回滚')
      } catch (rollbackError) {
        logger.error('回滚失败', { error: rollbackError.message, stack: rollbackError.stack })
      }
    }

    logger.error('数据导入失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '数据还原失败' })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.get('/list', async (req, res) => {
  try {
    const uploadsDir = getBackupsDir()
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(uploadsDir, file)
        const stats = fs.statSync(filePath)
        return {
          filename: file,
          size: stats.size,
          createTime: stats.birthtime,
          modifyTime: stats.mtime
        }
      })
      .sort((a, b) => b.modifyTime - a.modifyTime)

    res.json({ message: '获取成功', data: files })
  } catch (error) {
    logger.error('获取备份列表失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '获取备份列表失败' })
  }
})

router.post('/save', async (req, res) => {
  try {
    const uploadsDir = getBackupsDir()
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const backupData = req.body
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup_${timestamp}.json`
    const filePath = path.join(uploadsDir, filename)

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8')

    res.json({
      message: '保存成功',
      data: { filename }
    })
  } catch (error) {
    logger.error('保存备份文件失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '保存备份文件失败' })
  }
})

router.get('/download/:filename', (req, res) => {
  try {
    const uploadsDir = getBackupsDir()
    const filePath = safePath(uploadsDir, req.params.filename)

    if (!filePath) {
      return res.status(403).json({ message: '非法的文件路径' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '备份文件不存在' })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`)
    res.sendFile(filePath)
  } catch (error) {
    logger.error('下载备份文件失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '下载备份文件失败' })
  }
})

router.delete('/delete/:filename', (req, res) => {
  try {
    const uploadsDir = getBackupsDir()
    const filePath = safePath(uploadsDir, req.params.filename)

    if (!filePath) {
      return res.status(403).json({ message: '非法的文件路径' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '备份文件不存在' })
    }

    fs.unlinkSync(filePath)
    logger.info('删除备份文件', { filename: req.params.filename })
    res.json({ message: '删除成功' })
  } catch (error) {
    logger.error('删除备份文件失败', { error: error.message, stack: error.stack })
    res.status(500).json({ message: '删除备份文件失败' })
  }
})

module.exports = router