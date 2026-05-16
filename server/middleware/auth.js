const jwt = require('jsonwebtoken');

const JWT_SECRET = 'xapiaihaocai_secret_key_2024';
const JWT_EXPIRES_IN = '24h';

/**
 * 生成JWT Token
 * @param {object} payload - 用户信息
 * @returns {string} Token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * 验证JWT Token
 * @param {string} token 
 * @returns {object} 解码后的用户信息
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token验证失败');
  }
};

/**
 * 认证中间件
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证信息' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '认证信息无效或已过期' });
  }
};

/**
 * 管理员权限中间件
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  isAdmin
};
