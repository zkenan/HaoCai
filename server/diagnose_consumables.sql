-- 诊断脚本：检查consumables表结构
USE xapiaihaocai;

-- 1. 查看表结构
DESC consumables;

-- 2. 查看建表语句
SHOW CREATE TABLE consumables;

-- 3. 查看实际数据（前3条）
SELECT * FROM consumables LIMIT 3;

-- 4. 检查是否有total_price列
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, EXTRA 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'xapiaihaocai' 
  AND TABLE_NAME = 'consumables' 
ORDER BY ORDINAL_POSITION;
