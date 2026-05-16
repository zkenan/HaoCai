const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateStockOutCode } = require('../utils/codeGenerator');

const router = express.Router();
router.use(authenticate);

/**
 * 创建出库单
 * POST /api/stock-out
 */
router.post('/', async (req, res) => {
  try {
    const { 
      recipient, 
      purpose,
      items // [{consumable_id, quantity, unit_price}]
    } = req.body;

    if (!recipient || !items || items.length === 0) {
      return res.status(400).json({ message: '请填写完整的出库单信息' });
    }

    // 验证库存是否足够
    for (const item of items) {
      const stockSql = 'SELECT quantity FROM consumables WHERE id = ?';
      const stockResults = await db.query(stockSql, [item.consumable_id]);
      
      if (stockResults.length === 0) {
        return res.status(400).json({ message: `耗材ID ${item.consumable_id} 不存在` });
      }

      if (stockResults[0].quantity < item.quantity) {
        return res.status(400).json({ 
          message: `耗材库存不足，当前库存: ${stockResults[0].quantity}，申请出库: ${item.quantity}` 
        });
      }
    }

    // 生成出库单号
    const recordCode = await generateStockOutCode();
    const stockOutDate = new Date().toISOString().split('T')[0];
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

      // 插入出库单
      const recordSql = `
        INSERT INTO stock_out_records 
        (record_code, stock_out_date, recipient, purpose, total_amount, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const recordResult = await connection.execute(recordSql, [
        recordCode,
        stockOutDate,
        recipient,
        purpose || '',
        totalAmount,
        userId
      ]);

      const stockOutId = recordResult[0].insertId;

      // 插入出库单明细并减少耗材库存
      for (const item of items) {
        // 插入明细
        const itemSql = `
          INSERT INTO stock_out_items (stock_out_id, consumable_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `;
        await connection.execute(itemSql, [
          stockOutId,
          item.consumable_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price
        ]);

        // 减少耗材库存
        const updateSql = `
          UPDATE consumables 
          SET quantity = quantity - ? 
          WHERE id = ?
        `;
        await connection.execute(updateSql, [item.quantity, item.consumable_id]);
      }

      await connection.commit();

      res.json({
        message: '出库单创建成功',
        data: {
          id: stockOutId,
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
    console.error('创建出库单失败:', error);
    res.status(500).json({ message: '创建出库单失败', error: error.message });
  }
});

/**
 * 获取出库单列表
 * GET /api/stock-out
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_out_records sr 
      LEFT JOIN users u ON sr.created_by = u.id
    `;
    let countSql = `
      SELECT COUNT(*) as total 
      FROM stock_out_records sr
    `;
    const params = [];

    if (keyword) {
      sql += ' WHERE sr.record_code LIKE ? OR sr.recipient LIKE ?';
      countSql += ' WHERE sr.record_code LIKE ? OR sr.recipient LIKE ?';
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
    console.error('获取出库单列表失败:', error);
    res.status(500).json({ message: '获取出库单列表失败', error: error.message });
  }
});

/**
 * 获取出库单详情
 * GET /api/stock-out/:id
 */
router.get('/:id', async (req, res) => {
  try {
    // 获取出库单基本信息
    const recordSql = `
      SELECT sr.*, u.username as created_by_name 
      FROM stock_out_records sr 
      LEFT JOIN users u ON sr.created_by = u.id 
      WHERE sr.id = ?
    `;
    const recordResults = await db.query(recordSql, [req.params.id]);
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '出库单不存在' });
    }

    // 获取出库单明细
    const itemsSql = `
      SELECT si.*, c.product_code, c.name, c.spec_model, c.unit 
      FROM stock_out_items si 
      LEFT JOIN consumables c ON si.consumable_id = c.id 
      WHERE si.stock_out_id = ?
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
    console.error('获取出库单详情失败:', error);
    res.status(500).json({ message: '获取出库单详情失败', error: error.message });
  }
});

/**
 * 删除出库单
 * DELETE /api/stock-out/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // 获取出库单信息
    const recordSql = 'SELECT * FROM stock_out_records WHERE id = ?';
    const recordResults = await db.query(recordSql, [req.params.id]);
    
    if (recordResults.length === 0) {
      return res.status(404).json({ message: '出库单不存在' });
    }

    // 开启事务
    const connection = await db.pool.promise().getConnection();
    
    try {
      await connection.beginTransaction();

      // 获取出库单明细
      const itemsSql = 'SELECT * FROM stock_out_items WHERE stock_out_id = ?';
      const items = await connection.execute(itemsSql, [req.params.id]);

      // 恢复耗材库存
      for (const item of items[0]) {
        const updateSql = `
          UPDATE consumables 
          SET quantity = quantity + ? 
          WHERE id = ?
        `;
        await connection.execute(updateSql, [item.quantity, item.consumable_id]);
      }

      // 删除出库单(级联删除明细)
      const deleteSql = 'DELETE FROM stock_out_records WHERE id = ?';
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
    console.error('删除出库单失败:', error);
    res.status(500).json({ message: '删除出库单失败', error: error.message });
  }
});

module.exports = router;
