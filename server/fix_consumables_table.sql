-- 修复consumables表结构，移除total_price自动生成列
USE xapiaihaocai;

-- 检查并移除total_price列（如果存在）
ALTER TABLE consumables DROP COLUMN IF EXISTS total_price;

-- 重新添加total_price作为普通列（可选，如果需要保留）
-- ALTER TABLE consumables ADD COLUMN total_price DECIMAL(12, 2) DEFAULT 0.00 COMMENT '总价';
