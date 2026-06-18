const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const path = require('path')

const logger = require('./utils/logger')
const errorMonitor = require('./middleware/errorMonitor')
const db = require('./config/db')
const initDatabase = require('./utils/initDatabase')
const authRoutes = require('./routes/auth')
const consumableRoutes = require('./routes/consumables')
const stockInRoutes = require('./routes/stock-in')
const stockOutRoutes = require('./routes/stock-out')
const fileRoutes = require('./routes/files')
const backupRoutes = require('./routes/backup')
const userRoutes = require('./routes/users')
const logRoutes = require('./routes/logs')

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet({ contentSecurityPolicy: false }))

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : null

app.use(cors({
  origin: function (origin, callback) {
    if (ALLOWED_ORIGINS) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('不允许的跨域请求'))
      }
    } else {
      callback(null, true)
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/consumables', consumableRoutes)
app.use('/api/stock-in', stockInRoutes)
app.use('/api/stock-out', stockOutRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/users', userRoutes)
app.use('/api/logs', logRoutes)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.use(errorMonitor)

db.getConnection((err, connection) => {
  if (err) {
    logger.error('数据库连接失败', { error: err.message })
    logger.info('请检查 .env 文件中的数据库配置是否正确')
  } else {
    logger.info('数据库连接成功')
    connection.release()
  }
})

const startServer = async () => {
  try {
    await initDatabase()
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('\n=========================================')
      logger.info('  耗材出入库管理系统已启动')
      logger.info(`  本地访问: http://localhost:${PORT}`)
      logger.info(`  局域网访问: http://[本机IP]:${PORT}`)
      logger.info(`  数据库: ${process.env.DB_HOST || '未配置'}:${process.env.DB_PORT || 3306}/${process.env.DB_DATABASE || '未配置'}`)
      logger.info('=========================================')
    })
  } catch (error) {
    logger.error('启动失败', { error: error.message })
    logger.info('\n请检查：')
    logger.info('1. MySQL服务器是否已启动且可访问')
    logger.info('2. .env 文件中的数据库配置是否正确')
    logger.info('3. 数据库用户权限是否足够')
    process.exit(1)
  }
}

startServer()