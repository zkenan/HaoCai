const logger = require('./logger')
const db = require('../config/db')

async function checkStockAlert() {
  try {
    const threshold = parseInt(process.env.STOCK_ALERT_THRESHOLD || '10')
    const lowStock = await db.query(
      `SELECT c.id, c.name, c.quantity, c.product_code,
              COALESCE(si.total_in, 0) as total_in,
              COALESCE(so.total_out, 0) as total_out,
              (c.quantity + COALESCE(si.total_in, 0) - COALESCE(so.total_out, 0)) as current_stock
       FROM consumables c
       LEFT JOIN (SELECT consumable_id, SUM(quantity) as total_in FROM stock_in_items GROUP BY consumable_id) si ON c.id = si.consumable_id
       LEFT JOIN (SELECT consumable_id, SUM(quantity) as total_out FROM stock_out_items GROUP BY consumable_id) so ON c.id = so.consumable_id
       WHERE (c.quantity + COALESCE(si.total_in, 0) - COALESCE(so.total_out, 0)) < ?
       ORDER BY current_stock ASC`,
      [threshold]
    )

    if (lowStock.length === 0) {
      logger.info('库存检查：无低库存耗材')
      return { alerts: [], count: 0 }
    }

    logger.info(`库存检查：发现${lowStock.length}项低库存耗材`)

    const webhookUrl = process.env.STOCK_ALERT_WEBHOOK
    if (webhookUrl) {
      await sendWebhook(webhookUrl, lowStock)
    }

    return { alerts: lowStock, count: lowStock.length }
  } catch (error) {
    logger.error('库存预警检查失败', { error: error.message, stack: error.stack })
    return { alerts: [], count: 0 }
  }
}

async function sendWebhook(url, alerts) {
  try {
    const threshold = parseInt(process.env.STOCK_ALERT_THRESHOLD || '10')
    const content = alerts.map(a => `- ${a.name}: 当前${a.current_stock}件`).join('\n')
    const message = `⚠️ 库存预警\n\n以下耗材库存不足${threshold}件：\n${content}`

    const https = require('https')
    const http = require('http')
    const client = url.startsWith('https') ? https : http

    const data = JSON.stringify({ msgtype: 'text', text: { content: message } })

    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          logger.info('webhook通知发送成功')
          resolve(body)
        })
      })
      req.on('error', (err) => {
        logger.error('webhook通知发送失败:', err.message)
        reject(err)
      })
      req.write(data)
      req.end()
    })
  } catch (error) {
    logger.error('webhook发送失败:', error.message)
  }
}

module.exports = { checkStockAlert, sendWebhook }
