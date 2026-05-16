const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateProductCode } = require('../utils/codeGenerator');

const router = express.Router();
router.use(authenticate);

// 配置文件上传 - 使用process.cwd()获取当前工作目录
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式(.xlsx, .xls)'));
    }
  }
});

/**
 * 获取耗材列表
 * GET /api/consumables
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const offset = (page - 1) * limit;

    // 使用别名明确指定需要的字段，避免total_price自动生成列干扰
    let sql = `SELECT 
      id, 
      product_code, 
      name, 
      spec_model, 
      quantity, 
      unit, 
      unit_price,
      reporter, 
      created_at, 
      updated_at 
    FROM consumables`;
    let countSql = 'SELECT COUNT(*) as total FROM consumables';
    const params = [];

    if (keyword) {
      sql += ' WHERE name LIKE ? OR product_code LIKE ?';
      countSql += ' WHERE name LIKE ? OR product_code LIKE ?';
      const searchParam = `%${keyword}%`;
      params.push(searchParam, searchParam);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [results, countResults] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, params.slice(0, -2))
    ]);

    // 确保返回的数据不包含total_price字段
    const cleanResults = results.map(row => ({
      id: row.id,
      product_code: row.product_code,
      name: row.name,
      spec_model: row.spec_model,
      quantity: row.quantity,
      unit: row.unit,
      unit_price: row.unit_price,
      reporter: row.reporter,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      data: cleanResults,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取耗材列表失败:', error);
    res.status(500).json({ message: '获取耗材列表失败', error: error.message });
  }
});

/**
 * 获取耗材详情
 * GET /api/consumables/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const sql = 'SELECT * FROM consumables WHERE id = ?';
    const results = await db.query(sql, [req.params.id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: '耗材不存在' });
    }

    res.json({ data: results[0] });
  } catch (error) {
    console.error('获取耗材详情失败:', error);
    res.status(500).json({ message: '获取耗材详情失败', error: error.message });
  }
});

/**
 * 创建耗材
 * POST /api/consumables
 */
router.post('/', async (req, res) => {
  const { name, spec_model, quantity, unit, unit_price, reporter } = req.body;

  if (!name || !quantity || !unit || !unit_price || !reporter) {
    return res.status(400).json({ message: '请填写完整的耗材信息' });
  }

  try {
    // 生成产品编号
    const productCode = await generateProductCode();

    const sql = `
      INSERT INTO consumables (product_code, name, spec_model, quantity, unit, unit_price, reporter)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(sql, [
      productCode,
      name,
      spec_model || '',
      parseInt(quantity),
      unit,
      parseFloat(unit_price),
      reporter
    ]);

    res.json({
      message: '创建成功',
      data: {
        id: result.insertId,
        product_code: productCode,
        total_price: quantity * unit_price
      }
    });
  } catch (error) {
    console.error('创建耗材失败:', error);
    res.status(500).json({ message: '创建耗材失败', error: error.message });
  }
});

/**
 * 批量导入耗材
 * POST /api/consumables/batch
 */
router.post('/batch', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传Excel文件' });
  }

  try {
    const { reporter: defaultReporter } = req.body;

    // 读取Excel文件
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Excel文件为空' });
    }

    // 顺序批量插入耗材（避免并发导致product_code重复）
    let successCount = 0;
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // 优先使用Excel中的提报人，如果没有则使用默认提报人
        const rowReporter = row['提报人'] || row['reporter'] || defaultReporter;
        
        if (!rowReporter || rowReporter === 'undefined') {
          throw new Error('提报人不能为空');
        }
        
        const productCode = await generateProductCode();
        
        const sql = `
          INSERT INTO consumables (product_code, name, spec_model, quantity, unit, unit_price, reporter)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
          productCode,
          row['名称'] || row['name'] || '',
          row['规格型号'] || row['spec_model'] || '',
          parseInt(row['数量'] || row['quantity'] || 0),
          row['单位'] || row['unit'] || '个',
          parseFloat(row['单价'] || row['unit_price'] || 0),
          rowReporter
        ]);
        successCount++;
      } catch (error) {
        const errorMsg = `第${i + 1}行导入失败: ${error.message}`;
        console.error(errorMsg);
        errors.push({ row: i + 1, error: error.message });
        // 继续导入下一条
      }
    }

    // 删除上传的文件
    fs.unlinkSync(req.file.path);

    // 返回导入结果
    if (errors.length > 0) {
      res.json({
        message: `批量导入完成，成功 ${successCount} 条，失败 ${errors.length} 条`,
        count: successCount,
        errors: errors
      });
    } else {
      res.json({
        message: `批量导入成功，共导入 ${successCount} 条记录`,
        count: successCount
      });
    }
  } catch (error) {
    console.error('批量导入耗材失败:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: '批量导入失败', error: error.message });
  }
});

/**
 * 更新耗材
 * PUT /api/consumables/:id
 */
router.put('/:id', async (req, res) => {
  const { name, spec_model, quantity, unit, unit_price, reporter } = req.body;

  if (!name || !quantity || !unit || !unit_price || !reporter) {
    return res.status(400).json({ message: '请填写完整的耗材信息' });
  }

  try {
    const sql = `
      UPDATE consumables 
      SET name = ?, spec_model = ?, quantity = ?, unit = ?, unit_price = ?, reporter = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      name,
      spec_model || '',
      parseInt(quantity),
      unit,
      parseFloat(unit_price),
      reporter,
      req.params.id
    ]);

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新耗材失败:', error);
    res.status(500).json({ message: '更新耗材失败', error: error.message });
  }
});

/**
 * 删除耗材
 * DELETE /api/consumables/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const sql = 'DELETE FROM consumables WHERE id = ?';
    const result = await db.query(sql, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '耗材不存在' });
    }

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除耗材失败:', error);
    res.status(500).json({ message: '删除耗材失败', error: error.message });
  }
});

/**
 * 获取库存数据（包含当前库存、累计入库、累计出库）
 * GET /api/stock/inventory
 */
router.get('/stock/inventory', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const offset = (page - 1) * limit;

    // 查询每个耗材的当前库存、累计入库和累计出库
    let sql = `
      SELECT 
        c.*,
        COALESCE(si.total_stock_in, 0) as total_stock_in,
        COALESCE(so.total_stock_out, 0) as total_stock_out,
        (c.quantity + COALESCE(si.total_stock_in, 0) - COALESCE(so.total_stock_out, 0)) as current_stock
      FROM consumables c
      LEFT JOIN (
        SELECT 
          si.consumable_id,
          SUM(si.quantity) as total_stock_in
        FROM stock_in_items si
        GROUP BY si.consumable_id
      ) si ON c.id = si.consumable_id
      LEFT JOIN (
        SELECT 
          so.consumable_id,
          SUM(so.quantity) as total_stock_out
        FROM stock_out_items so
        GROUP BY so.consumable_id
      ) so ON c.id = so.consumable_id
    `;

    let countSql = 'SELECT COUNT(*) as total FROM consumables';
    const params = [];

    if (keyword) {
      sql += ' WHERE c.name LIKE ? OR c.product_code LIKE ?';
      countSql += ' WHERE name LIKE ? OR product_code LIKE ?';
      const searchParam = `%${keyword}%`;
      params.push(searchParam, searchParam);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [results, countResults] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, params.slice(0, -2))
    ]);

    res.json({
      data: results,
      total: countResults[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取库存数据失败:', error);
    res.status(500).json({ message: '获取库存数据失败', error: error.message });
  }
});

/**
 * 获取库存统计数据
 * GET /api/stock/stats
 */
router.get('/stock/stats', async (req, res) => {
  try {
    // 获取耗材种类数
    const typesResult = await db.query('SELECT COUNT(*) as count FROM consumables');
    
    // 获取总库存数量
    const quantityResult = await db.query('SELECT SUM(quantity) as total FROM consumables');
    
    // 获取累计入库数量
    const stockInResult = await db.query('SELECT SUM(quantity) as total FROM stock_in_items');
    
    // 获取累计出库数量
    const stockOutResult = await db.query('SELECT SUM(quantity) as total FROM stock_out_items');

    res.json({
      totalTypes: typesResult[0].count || 0,
      totalQuantity: quantityResult[0].total || 0,
      totalStockIn: stockInResult[0].total || 0,
      totalStockOut: stockOutResult[0].total || 0
    });
  } catch (error) {
    console.error('获取库存统计失败:', error);
    res.status(500).json({ message: '获取库存统计失败', error: error.message });
  }
});

module.exports = router;
