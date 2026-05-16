-- 人工智能学院耗材出入库管理系统数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS xapiaihaocai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE xapiaihaocai;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  role VARCHAR(20) DEFAULT 'user' COMMENT '角色: admin-管理员, user-普通用户',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 耗材表
CREATE TABLE IF NOT EXISTS consumables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(20) NOT NULL UNIQUE COMMENT '产品编号(YYMMDD+四位序号)',
  name VARCHAR(100) NOT NULL COMMENT '耗材名称',
  spec_model VARCHAR(200) DEFAULT '' COMMENT '规格型号',
  quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
  unit VARCHAR(20) NOT NULL DEFAULT '个' COMMENT '单位',
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '单价',
  reporter VARCHAR(50) NOT NULL COMMENT '提报人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_code (product_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='耗材表';

-- 入库单表
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

-- 入库单明细表
CREATE TABLE IF NOT EXISTS stock_in_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_in_id INT NOT NULL COMMENT '入库单ID',
  consumable_id INT NOT NULL COMMENT '耗材ID',
  quantity INT NOT NULL COMMENT '入库数量',
  unit_price DECIMAL(10, 2) NOT NULL COMMENT '入库单价',
  total_price DECIMAL(12, 2) NOT NULL COMMENT '入库总价',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_in_id) REFERENCES stock_in_records(id) ON DELETE CASCADE,
  FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

-- 出库单表
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

-- 出库单明细表
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

-- 插入默认管理员账户 (密码: 123456)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', 'admin');
