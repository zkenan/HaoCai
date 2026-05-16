const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 查询用户
    const sql = 'SELECT * FROM users WHERE username = ?';
    const results = await db.query(sql, [username]);
    
    if (results.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const user = results[0];

    // 验证密码 (admin用户的默认密码是123456)
    let isValidPassword = false;
    if (username === 'admin') {
      // 默认admin密码特殊处理
      isValidPassword = password === '123456';
    } else {
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

module.exports = router;
