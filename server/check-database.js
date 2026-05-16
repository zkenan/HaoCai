const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function checkDatabase() {
  let connection;
  
  try {
    const configPath = path.join(__dirname, 'config', 'database.json');
    const dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功\n');

    console.log('=== consumables表结构 ===');
    const [columns] = await connection.query('DESCRIBE consumables');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Extra}`);
    });

    console.log('\n=== 检查total_price虚拟列 ===');
    const hasTotalPrice = columns.some(col => col.Field === 'total_price');
    if (hasTotalPrice) {
      console.log('❌ 发现total_price列（可能导致字段错位）');
    } else {
      console.log('✓ 未发现total_price列');
    }

    console.log('\n=== 检查product_code唯一索引 ===');
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'consumables' AND COLUMN_NAME = 'product_code'
    `, [dbConfig.database]);
    
    indexes.forEach(idx => {
      console.log(`  索引: ${idx.INDEX_NAME} | 唯一: ${idx.NON_UNIQUE === 0 ? '是' : '否'}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkDatabase();
