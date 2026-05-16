const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

// 智能读取配置文件，支持开发和打包后的exe环境
let dbConfig;
const configPath = path.join(process.cwd(), 'config', 'database.json');

if (fs.existsSync(configPath)) {
  dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  // 开发环境使用相对路径
  dbConfig = require('./database.json');
}

// 创建连接池
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
});

// 获取连接
const getConnection = (callback) => {
  pool.getConnection(callback);
};

// 执行查询
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

// 关闭连接池
const close = () => {
  pool.end();
};

module.exports = {
  pool,
  getConnection,
  query,
  close
};
