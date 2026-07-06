const { body, param, query } = require('express-validator')

// 用户校验
const createUser = [
  body('username').trim().isLength({ min: 2, max: 50 }).withMessage('用户名长度2-50位'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('密码长度6-100位'),
  body('role').isIn(['admin', 'operator', 'viewer']).withMessage('角色无效')
]

const updateUser = [
  body('username').trim().isLength({ min: 2, max: 50 }).withMessage('用户名长度2-50位'),
  body('role').isIn(['admin', 'operator', 'viewer']).withMessage('角色无效')
]

// 耗材校验
const createConsumable = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('耗材名称1-100位'),
  body('quantity').isInt({ min: 0 }).withMessage('数量必须为非负整数'),
  body('unit').trim().isLength({ min: 1, max: 20 }).withMessage('单位1-20位'),
  body('unit_price').isFloat({ min: 0 }).withMessage('单价必须为非负数'),
  body('reporter').trim().isLength({ min: 1, max: 50 }).withMessage('提报人1-50位')
]

// 入库单校验
const createStockIn = [
  body('supplier_name').trim().isLength({ min: 1, max: 200 }).withMessage('供货商名称1-200位'),
  body('items').isArray({ min: 1 }).withMessage('请选择至少一个耗材'),
  body('items.*.consumable_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('耗材ID无效'),
  body('items.*.consumable_name').trim().isLength({ min: 1, max: 100 }).withMessage('耗材名称1-100位'),
  body('items.*.spec_model').optional().trim().isLength({ max: 200 }).withMessage('规格型号不超过200位'),
  body('items.*.unit').optional().trim().isLength({ min: 1, max: 20 }).withMessage('单位1-20位'),
  body('items.*.reporter').optional().trim().isLength({ max: 50 }).withMessage('提报人不超过50位'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('单价必须为非负数')
]

// 出库单校验
const createStockOut = [
  body('recipient').trim().isLength({ min: 1, max: 50 }).withMessage('领用人1-50位'),
  body('items').isArray({ min: 1 }).withMessage('请选择至少一个耗材'),
  body('items.*.consumable_id').isInt({ min: 1 }).withMessage('耗材ID无效'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('单价必须为非负数')
]

// 登录校验
const login = [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
]

module.exports = {
  createUser, updateUser, createConsumable,
  createStockIn, createStockOut, login
}
