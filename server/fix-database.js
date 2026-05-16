const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
  let connection;
  
  try {
    // 读取数据库配置
    const configPath = path.join(__dirname, 'config', 'database.json');
    const dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功');

    // 检查并移除total_price列
    console.log('\n正在检查consumables表结构...');
    const [columns] = await connection.query('DESCRIBE consumables');
    
    const hasTotalPrice = columns.some(col => col.Field === 'total_price');
    
    if (hasTotalPrice) {
      console.log('发现total_price列，正在移除...');
      await connection.query('ALTER TABLE consumables DROP COLUMN total_price');
      console.log('✓ total_price列已成功移除');
    } else {
      console.log('✓ total_price列不存在，无需移除');
    }

    // 验证表结构
    console.log('\n当前consumables表结构:');
    const [newColumns] = await connection.query('DESCRIBE consumables');
    newColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    console.log('\n✅ 数据库修复完成！');
    
  } catch (error) {
    console.error('❌ 数据库修复失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

fixDatabase();
