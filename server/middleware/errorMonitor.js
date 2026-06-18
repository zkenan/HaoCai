const logger = require('../utils/logger')

const errorMonitor = (err, req, res, next) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.id,
    username: req.user?.username,
    errorMessage: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  }

  logger.error('API Error', errorInfo)

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({ message: '服务器内部错误' })
}

module.exports = errorMonitor
