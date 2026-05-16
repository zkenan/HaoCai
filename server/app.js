const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dbConfig = require('./config/database.json');
const db = require('./config/db');
const initDatabase = require('./utils/initDatabase');

// 导入路由
const authRoutes = require('./routes/auth');
const consumableRoutes = require('./routes/consumables');
const stockInRoutes = require('./routes/stock-in');
const stockOutRoutes = require('./routes/stock-out');
const fileRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/consumables', consumableRoutes);
app.use('/api/stock-in', stockInRoutes);
app.use('/api/stock-out', stockOutRoutes);
app.use('/api/files', fileRoutes);

// SPA路由支持 - 所有其他请求返回前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

// 测试数据库连接
db.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    console.log('请检查 database.json 配置文件是否正确');
  } else {
    console.log('数据库连接成功');
    connection.release();
  }
});

// 启动服务器
const startServer = async () => {
  try {
    // 自动初始化数据库
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n=========================================`);
      console.log(`  耗材出入库管理系统已启动`);
      console.log(`  本地访问: http://localhost:${PORT}`);
      console.log(`  局域网访问: http://[本机IP]:${PORT}`);
      console.log(`  数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
      console.log(`=========================================\n`);
    });
  } catch (error) {
    console.error('\n启动失败:', error.message);
    console.log('\n请检查：');
    console.log('1. MySQL服务器是否已启动');
    console.log('2. database.json 配置是否正确');
    console.log('3. 数据库用户权限是否足够');
    process.exit(1);
  }
};

startServer();
