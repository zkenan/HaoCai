const jwt = require('jsonwebtoken')

if (!process.env.JWT_SECRET) {
  console.error('错误: 未设置 JWT_SECRET 环境变量，请在 .env 文件中配置')
  process.exit(1)
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

/**
 * 生成JWT Token
 * @param {object} payload - 用户信息
 * @returns {string} Token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证JWT Token
 * @param {string} token 
 * @returns {object} 解码后的用户信息
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Token验证失败')
  }
}

/**
 * 认证中间件
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证信息' })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: '认证信息无效或已过期' })
  }
}

/**
 * 管理员权限中间件
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }
  next()
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  isAdmin
}