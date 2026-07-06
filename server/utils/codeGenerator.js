const db = require('../config/db')

/**
 * 生成产品编号
 * 格式: YYMMDD + 四位序号 (例: 2605110001)
 * @param {number} offset - 偏移量（用于批量导入时避免重复）
 * @param {object} connection - 可选，事务连接（用于事务内生成不重复编号）
 * @returns {Promise<string>} 产品编号
 */
const generateProductCode = async (offset = 0, connection = null) => {
  const now = new Date()
  const year = String(now.getFullYear()).slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const sql = `
    SELECT COUNT(*) as count
    FROM consumables
    WHERE product_code LIKE ?
  `

  const executor = connection || db
  const results = await executor.execute(sql, [`${dateStr}%`])
  const rows = Array.isArray(results[0]) ? results[0] : results
  const count = rows[0].count + offset
  const sequence = String(count + 1).padStart(4, '0')

  return `${dateStr}${sequence}`
}

/**
 * 生成入库单号
 * 格式: RK + YYMMDD + 四位序号 (例: RK2605110001)
 * @returns {Promise<string>} 入库单号
 */
const generateStockInCode = async () => {
  const now = new Date()
  const year = String(now.getFullYear()).slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const sql = `
    SELECT COUNT(*) as count 
    FROM stock_in_records 
    WHERE record_code LIKE ?
  `
  
  const results = await db.query(sql, [`RK${dateStr}%`])
  const count = results[0].count
  const sequence = String(count + 1).padStart(4, '0')
  
  return `RK${dateStr}${sequence}`
}

/**
 * 生成出库单号
 * 格式: CK + YYMMDD + 四位序号 (例: CK2605110001)
 * @returns {Promise<string>} 出库单号
 */
const generateStockOutCode = async () => {
  const now = new Date()
  const year = String(now.getFullYear()).slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const sql = `
    SELECT COUNT(*) as count 
    FROM stock_out_records 
    WHERE record_code LIKE ?
  `
  
  const results = await db.query(sql, [`CK${dateStr}%`])
  const count = results[0].count
  const sequence = String(count + 1).padStart(4, '0')
  
  return `CK${dateStr}${sequence}`
}

/**
 * 数字转中文大写金额
 * @param {number} num 
 * @returns {string} 大写金额
 */
const numberToChineseMoney = (num) => {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']
  
  if (num === 0) return '零元整'
  
  let integer = Math.floor(num)
  let decimal = Math.round((num - integer) * 100)
  let result = ''
  
  // 处理整数部分
  if (integer > 0) {
    let intStr = String(integer)
    let len = intStr.length
    let pos = 0
    let hasZero = false
    
    for (let i = 0; i < len; i++) {
      let digit = parseInt(intStr[i])
      pos = len - i - 1
      
      if (digit === 0) {
        hasZero = true
      } else {
        if (hasZero && result.length > 0) {
          result += '零'
          hasZero = false
        }
        result += digits[digit] + units[pos % 4]
        if (pos > 0 && pos % 4 === 0) {
          result += bigUnits[Math.floor(pos / 4)]
        }
      }
    }
    result += '元'
  }
  
  // 处理小数部分
  if (decimal > 0) {
    let jiao = Math.floor(decimal / 10)
    let fen = decimal % 10
    
    if (jiao > 0) {
      result += digits[jiao] + '角'
    }
    if (fen > 0) {
      result += digits[fen] + '分'
    }
  } else {
    result += '整'
  }
  
  return result
}

module.exports = {
  generateProductCode,
  generateStockInCode,
  generateStockOutCode,
  numberToChineseMoney
}