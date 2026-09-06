const logger = require('./logger')
const db = require('../config/db')

async function checkStockAlert() {
  try {
    // 使用每种耗材独立的安全库存阈值（默认5），当前库存直接取 c.quantity
    // 口径与补货建议接口（stock/replenish）一致：只有归属开关 need_replenish=1 的归属底下的耗材才告警。
    // LEFT JOIN 意味着无归属（c.ownership_id NULL）时 oo.need_replenish 为 NULL，= 1 不匹配 → 自动排除（决策点 1：无归属不告警）
    const lowStock = await db.query(
      `SELECT c.id, c.name, c.quantity as current_stock, c.product_code,
              c.safety_stock, c.unit, c.ownership,
              c.ownership_id,
              oo.need_replenish,
              (c.safety_stock - c.quantity) as need_quantity
       FROM consumables c
       LEFT JOIN ownership_options oo ON c.ownership_id = oo.id
       WHERE c.is_deleted = 0
         AND c.quantity < c.safety_stock
         AND oo.need_replenish = 1
       ORDER BY need_quantity DESC`
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
    const content = alerts.map(a => `- ${a.name}: 当前${a.current_stock}件（安全库存${a.safety_stock}）`).join('\n')
    const message = `⚠️ 库存预警\n\n以下耗材库存不足安全库存：\n${content}`

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
