const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateStockInCode } = require('../utils/codeGenerator');

const router = express.Router();
router.use(authenticate);

/**
 * 创建入库单
 * POST /api/stock-in
 */
router.post('/', async (req, res) => {
  try {
    const { 
      supplier_name, 
      supplier_address, 
      contact_phone, 
      contact_person,
      delivery_person, 
      warehouse_manager,
      items // [{consumable_id, quantity, unit_price}]
    } = req.body;

    if (!supplier_name || !delivery_person || !warehouse_manager || !items || items.length === 0) {
      return res.status(400).json({ message: '请填写完整的入库单信息' });
    }

    // 生成入库单号
    const recordCode = await generateStockInCode();
    const stockInDate = new Date().toISOString().split('T')[0];
    const userId = req.user.id;

    // 计算总金额
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price;
    });

    // 开启事务
    const connection = await db.pool.promise().getConnection();
    
    try {
      await connection.beginTransaction();

      // 插入入库单
      const recordSql = `
        INSERT INTO stock_in_records 
        (record_code, supplier_name, supplier_address, contact_phone, contact_person, 
         delivery_person, warehouse_manager, stock_in_date, total_amount, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const recordResult = await connection.execute(recordSql, [
        recordCode,
        supplier_name,
        supplier_address || '',
        contact_phone || '',
        contact_person || '',
        delivery_person,
        warehouse_manager,
        stockInDate,
        totalAmount,
        userId
      ]);

      const stockInId = recordResult[0].insertId;

      // 插入入库单明细并更新耗材库存
      for (const item of items) {
        // 插入明细
        const itemSql = `
          INSERT INTO stock_in_items (stock_in_id, consumable_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `;
        await connection.execute(itemSql, [
          stockInId,
          item.consumable_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price
        ]);

        // 更新耗材库存
        const updateSql = `
          UPDATE consumables 
          SET quantity = quantity + ? 
          WHERE id = ?
        `;
        await connection.execute(updateSql, [item.quantity, item.consumable_id]);
      }

      await connection.commit();

      res.json({
        message: '入库单创建成功',
        data: {
          id: stockInId,
          record_code: recordCode,
          total_amount: totalAmount
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建入库单失败:', error);
    res.status(500).json({ message: '创建入库单失败', error: error.message });
  }
});

/**
 * 获取入库单列表
 * GET /api/stock-in
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_in_records sr 
      LEFT JOIN users u ON sr.created_by = u.id
    `;
    let countSql = `
      SELECT COUNT(*) as total 
      FROM stock_in_records sr
    `;
    const params = [];

    if (keyword) {
      sql += ' WHERE sr.record_code LIKE ? OR sr.supplier_name LIKE ?';
      countSql += ' WHERE sr.record_code LIKE ? OR sr.supplier_name LIKE ?';
      const searchParam = `%${keyword}%`;
      params.push(searchParam, searchParam);
    }

    sql += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
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
    console.error('获取入库单列表失败:', error);
    res.status(500).json({ message: '获取入库单列表失败', error: error.message });
  }
});

/**
 * 获取入库单详情
 * GET /api/stock-in/:id
 */
router.get('/:id', async (req, res) => {
  try {
    // 获取入库单基本信息
    const recordSql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_in_records sr 
      LEFT JOIN users u ON sr.created_by = u.id 
      WHERE sr.id = ?
    `;
    const recordResults = await db.query(recordSql, [req.params.id]);
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '入库单不存在' });
    }

    // 获取入库单明细
    const itemsSql = `
      SELECT si.*, c.product_code, c.name, c.spec_model, c.unit 
      FROM stock_in_items si 
      LEFT JOIN consumables c ON si.consumable_id = c.id 
      WHERE si.stock_in_id = ?
      ORDER BY si.id ASC
    `;
    const items = await db.query(itemsSql, [req.params.id]);

    res.json({
      data: {
        ...recordResults[0],
        items
      }
    });
  } catch (error) {
    console.error('获取入库单详情失败:', error);
    res.status(500).json({ message: '获取入库单详情失败', error: error.message });
  }
});

/**
 * 删除入库单
 * DELETE /api/stock-in/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // 获取入库单信息
    const recordSql = 'SELECT * FROM stock_in_records WHERE id = ?';
    const recordResults = await db.query(recordSql, [req.params.id]);
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '入库单不存在' });
    }

    // 开启事务
    const connection = await db.pool.promise().getConnection();
    
    try {
      await connection.beginTransaction();

      // 获取入库单明细
      const itemsSql = 'SELECT * FROM stock_in_items WHERE stock_in_id = ?';
      const items = await connection.execute(itemsSql, [req.params.id]);

      // 恢复耗材库存
      for (const item of items[0]) {
        const updateSql = `
          UPDATE consumables 
          SET quantity = quantity - ? 
          WHERE id = ?
        `;
        await connection.execute(updateSql, [item.quantity, item.consumable_id]);
      }

      // 删除入库单(级联删除明细)
      const deleteSql = 'DELETE FROM stock_in_records WHERE id = ?';
      await connection.execute(deleteSql, [req.params.id]);

      await connection.commit();

      res.json({ message: '删除成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('删除入库单失败:', error);
    res.status(500).json({ message: '删除入库单失败', error: error.message });
  }
});

module.exports = router;
