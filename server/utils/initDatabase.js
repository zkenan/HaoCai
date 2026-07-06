const mysql = require('mysql2')
const path = require('path')

require('dotenv').config({ path: path.join(process.cwd(), '.env') })

const logger = require('./logger')

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'xapiaihaocai'
}

if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
  throw new Error('数据库配置不完整，请检查 .env 文件中的 DB_HOST, DB_DATABASE, DB_USER')
}

async function initDatabase() {
  logger.info('\n=========================================')
  logger.info('  正在检查数据库...')
  logger.info('=========================================')

  const connection = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true
  })

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        reject(new Error(`数据库连接失败: ${err.message}`))
        return
      }

      (async () => {
        try {
          await executeQuery(connection, `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
          logger.info(`✓ 数据库 ${dbConfig.database} 已就绪`)

          await executeQuery(connection, `USE \`${dbConfig.database}\``)

          const checkTableSql = `
            SELECT COUNT(*) as count
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
          `
          const tables = await executeQuery(connection, checkTableSql, [dbConfig.database])
          
          if (tables.length === 0 || (tables[0] && tables[0].count === 0)) {
            logger.info('正在初始化数据库表结构...')
            
            const initSql = `
              CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
                password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
                role VARCHAR(20) DEFAULT 'user' COMMENT '角色: admin-管理员, user-普通用户',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

              CREATE TABLE IF NOT EXISTS consumables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_code VARCHAR(20) NOT NULL UNIQUE COMMENT '产品编号(YYMMDD+四位序号)',
                name VARCHAR(100) NOT NULL COMMENT '耗材名称',
                spec_model VARCHAR(200) DEFAULT '' COMMENT '规格型号',
                quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
                unit VARCHAR(20) NOT NULL DEFAULT '个' COMMENT '单位',
                unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '单价',
                reporter VARCHAR(50) NOT NULL COMMENT '提报人',
                is_deleted TINYINT DEFAULT 0 COMMENT '是否删除: 0-正常, 1-已删除',
                deleted_at TIMESTAMP NULL COMMENT '删除时间',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_product_code (product_code),
                INDEX idx_created_at (created_at),
                INDEX idx_is_deleted (is_deleted)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='耗材表';

              CREATE TABLE IF NOT EXISTS stock_in_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                record_code VARCHAR(20) NOT NULL UNIQUE COMMENT '入库单号(RK+YYMMDD+四位序号)',
                supplier_name VARCHAR(200) NOT NULL COMMENT '供货商名称',
                supplier_address VARCHAR(500) DEFAULT '' COMMENT '供货商地址',
                contact_phone VARCHAR(50) DEFAULT '' COMMENT '联系电话',
                contact_person VARCHAR(50) DEFAULT '' COMMENT '联系人',
                delivery_person VARCHAR(50) NOT NULL COMMENT '送货人',
                warehouse_manager VARCHAR(50) NOT NULL COMMENT '库房负责人',
                stock_in_date DATE NOT NULL COMMENT '入库日期',
                total_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT '总金额',
                created_by INT NOT NULL COMMENT '创建人ID',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_record_code (record_code),
                INDEX idx_stock_in_date (stock_in_date),
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单表';

              CREATE TABLE IF NOT EXISTS stock_in_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                stock_in_id INT NOT NULL COMMENT '入库单ID',
                consumable_id INT NOT NULL COMMENT '耗材ID',
                consumable_name VARCHAR(100) COMMENT '耗材名称',
                spec_model VARCHAR(200) DEFAULT '' COMMENT '规格型号',
                unit VARCHAR(20) DEFAULT '个' COMMENT '单位',
                reporter VARCHAR(50) DEFAULT '' COMMENT '提报人',
                quantity INT NOT NULL COMMENT '入库数量',
                unit_price DECIMAL(10, 2) NOT NULL COMMENT '入库单价',
                total_price DECIMAL(12, 2) NOT NULL COMMENT '入库总价',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_in_id) REFERENCES stock_in_records(id) ON DELETE CASCADE,
                FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE RESTRICT
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

              CREATE TABLE IF NOT EXISTS stock_out_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                record_code VARCHAR(20) NOT NULL UNIQUE COMMENT '出库单号(CK+YYMMDD+四位序号)',
                stock_out_date DATE NOT NULL COMMENT '出库日期',
                recipient VARCHAR(50) NOT NULL COMMENT '领用人',
                purpose VARCHAR(200) DEFAULT '' COMMENT '用途说明',
                total_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT '总金额',
                created_by INT NOT NULL COMMENT '创建人ID',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_record_code (record_code),
                INDEX idx_stock_out_date (stock_out_date),
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单表';

              CREATE TABLE IF NOT EXISTS stock_out_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                stock_out_id INT NOT NULL COMMENT '出库单ID',
                consumable_id INT NOT NULL COMMENT '耗材ID',
                quantity INT NOT NULL COMMENT '出库数量',
                unit_price DECIMAL(10, 2) NOT NULL COMMENT '出库单价',
                total_price DECIMAL(12, 2) NOT NULL COMMENT '出库总价',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_out_id) REFERENCES stock_out_records(id) ON DELETE CASCADE,
                FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE RESTRICT
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细表';

              CREATE TABLE IF NOT EXISTS operation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED COMMENT '操作用户ID',
                username VARCHAR(50) COMMENT '操作用户名',
                action VARCHAR(50) NOT NULL COMMENT '操作类型',
                module VARCHAR(50) NOT NULL COMMENT '操作模块',
                detail VARCHAR(500) DEFAULT '' COMMENT '操作详情',
                ip VARCHAR(50) DEFAULT '' COMMENT '操作IP',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_log_user_id (user_id),
                INDEX idx_log_action (action),
                INDEX idx_log_created_at (created_at)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
            `
            
            await executeQuery(connection, initSql)
            
            logger.info('✓ 数据库表结构创建成功')

            const bcrypt = require('bcryptjs')
            const adminPassword = await bcrypt.hash('admin123', 10)
            await executeQuery(connection,
              'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
              ['admin', adminPassword, 'admin']
            )
            logger.info('✓ 已创建默认管理员账户 admin / admin123')
          } else {
            logger.info('✓ 数据库表已存在，检查数据完整性...')
            
            // 自动升级：检查并添加缺失的列
            try {
              const cols = await executeQuery(connection, `SHOW COLUMNS FROM consumables LIKE 'is_deleted'`)
              if (cols.length === 0) {
                logger.info('  升级: 添加 consumables.is_deleted 列')
                await executeQuery(connection, 'ALTER TABLE consumables ADD COLUMN is_deleted TINYINT DEFAULT 0 COMMENT \'是否删除\' AFTER updated_at')
              }
              const cols2 = await executeQuery(connection, `SHOW COLUMNS FROM consumables LIKE 'deleted_at'`)
              if (cols2.length === 0) {
                logger.info('  升级: 添加 consumables.deleted_at 列')
                await executeQuery(connection, 'ALTER TABLE consumables ADD COLUMN deleted_at TIMESTAMP NULL COMMENT \'删除时间\' AFTER is_deleted')
              }
            } catch (e) {
              logger.error('升级consumables表失败', { error: e.message })
            }

            // 自动升级：stock_in_items 增加耗材信息快照字段
            try {
              const stockInFields = [
                { name: 'consumable_name', def: "VARCHAR(100) COMMENT '耗材名称'" },
                { name: 'spec_model', def: "VARCHAR(200) DEFAULT '' COMMENT '规格型号'" },
                { name: 'unit', def: "VARCHAR(20) DEFAULT '个' COMMENT '单位'" },
                { name: 'reporter', def: "VARCHAR(50) DEFAULT '' COMMENT '提报人'" }
              ]
              for (const field of stockInFields) {
                const col = await executeQuery(connection, `SHOW COLUMNS FROM stock_in_items LIKE '${field.name}'`)
                if (col.length === 0) {
                  logger.info(`  升级: 添加 stock_in_items.${field.name} 列`)
                  await executeQuery(connection, `ALTER TABLE stock_in_items ADD COLUMN ${field.name} ${field.def}`)
                }
              }
            } catch (e) {
              logger.error('升级stock_in_items表失败', { error: e.message })
            }

            // 检查 operation_logs 表是否存在
            try {
              const logTable = await executeQuery(connection, `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${dbConfig.database}' AND TABLE_NAME = 'operation_logs'`)
              if (logTable[0] && logTable[0].count === 0) {
                logger.info('  升级: 创建 operation_logs 表')
                await executeQuery(connection, `
                  CREATE TABLE IF NOT EXISTS operation_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT UNSIGNED COMMENT '操作用户ID',
                    username VARCHAR(50) COMMENT '操作用户名',
                    action VARCHAR(50) NOT NULL COMMENT '操作类型',
                    module VARCHAR(50) NOT NULL COMMENT '操作模块',
                    detail VARCHAR(500) DEFAULT '' COMMENT '操作详情',
                    ip VARCHAR(50) DEFAULT '' COMMENT '操作IP',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_log_user_id (user_id),
                    INDEX idx_log_action (action),
                    INDEX idx_log_created_at (created_at)
                  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表'
                `)
                logger.info('  升级: operation_logs 表创建成功')
              }
            } catch (e) {
              logger.error('升级operation_logs表失败', { error: e.message })
            }

            const usersCheck = await executeQuery(connection, `SELECT COUNT(*) as count FROM users`)
            const userCount = usersCheck[0] ? usersCheck[0].count : 0
            
            if (userCount === 0) {
              logger.info('⚠️  检测到用户表为空，正在恢复管理员账号...')
              
              const bcrypt = require('bcryptjs')
              const adminPassword = await bcrypt.hash('admin123', 10)
              const userPassword = await bcrypt.hash('user123', 10)
              
              await executeQuery(connection,
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?), (?, ?, ?)',
                ['admin', adminPassword, 'admin', 'user', userPassword, 'user']
              )
              logger.info('✓ 管理员账号已恢复: admin / admin123')
              logger.info('✓ 普通用户已恢复: user / user123')
            } else {
              logger.info(`✓ 用户表有 ${userCount} 个用户，数据完整`)
            }
          }

          logger.info('\n=========================================')
          connection.end()
          resolve()
        } catch (error) {
          connection.end()
          reject(error)
        }
      })()
    })
  })
}

function executeQuery(connection, sql, params = null) {
  return new Promise((resolve, reject) => {
    if (params) {
      connection.query(sql, params, (error, results) => {
        if (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            resolve(results || [])
            return
          }
          reject(error)
        } else {
          resolve(results || [])
        }
      })
    } else {
      connection.query(sql, (error, results) => {
        if (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            resolve(results || [])
            return
          }
          reject(error)
        } else {
          resolve(results || [])
        }
      })
    }
  })
}

module.exports = initDatabase