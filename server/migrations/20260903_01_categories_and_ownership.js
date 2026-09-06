/**
 * 新增耗材分类功能 + 耗材归属 + 安全库存字段
 * 迁移日期: 20260903
 */
exports.up = function (knex) {
  return knex.schema
    // 1. 创建耗材分类表（支持两级：parent_id=0 为大类，其他为小类）
    .createTable('categories', table => {
      table.increments('id').primary()
      table.string('name', 50).notNullable().comment('分类名称')
      table.integer('parent_id').unsigned().notNullable().defaultTo(0).comment('父分类ID，0表示大类')
      table.integer('sort').notNullable().defaultTo(0).comment('排序号，越小越靠前')
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      table.index('parent_id', 'idx_categories_parent')
    })
    // 2. consumables 增加分类、归属、安全库存字段
    .alterTable('consumables', table => {
      table.integer('category_id').unsigned().nullable().comment('所属小类ID')
      table.string('ownership', 20).defaultTo('部门公用').comment('归属: 办公室/部门公用/教学实验/项目专用')
      table.integer('safety_stock').notNullable().defaultTo(5).comment('安全库存阈值')
    })
}

exports.down = function (knex) {
  return knex.schema
    .alterTable('consumables', table => {
      table.dropColumn('category_id')
      table.dropColumn('ownership')
      table.dropColumn('safety_stock')
    })
    .dropTableIfExists('categories')
}
