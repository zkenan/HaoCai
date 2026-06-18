const mysql = require('mysql2')
const path = require('path')

require('dotenv').config({ path: path.join(process.cwd(), '.env') })

const logger = require('../utils/logger')

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_DATABASE || 'xapiaihaocai',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
}

if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
  logger.error('数据库配置不完整，请检查 .env 文件中的 DB_HOST, DB_DATABASE, DB_USER')
  process.exit(1)
}

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
})

const getConnection = (callback) => {
  pool.getConnection(callback)
}

const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    if (params === undefined) {
      pool.query(sql, (error, results) => {
        if (error) reject(error)
        else resolve(results)
      })
    } else {
      pool.query(sql, params, (error, results) => {
        if (error) reject(error)
        else resolve(results)
      })
    }
  })
}

const close = () => {
  pool.end()
}

module.exports = {
  pool,
  getConnection,
  query,
  close
}