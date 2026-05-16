-- 修复consumables表字段错位问题
-- 移除total_price虚拟列（如果存在）

USE xapiaihaocai;

-- 检查并移除total_price列
ALTER TABLE consumables DROP COLUMN IF EXISTS total_price;

-- 验证表结构
DESCRIBE consumables;

SELECT '✓ total_price虚拟列已成功移除' AS message;
