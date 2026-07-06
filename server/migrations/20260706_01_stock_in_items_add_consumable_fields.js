/**
 * 给 stock_in_items 表增加耗材信息快照字段
 * 支持在入库单中直接录入耗材信息，不再完全依赖 consumables 表
 */
exports.up = function(knex) {
  return knex.schema.alterTable('stock_in_items', table => {
    table.string('consumable_name', 100).comment('耗材名称')
    table.string('spec_model', 200).defaultTo('').comment('规格型号')
    table.string('unit', 20).defaultTo('个').comment('单位')
    table.string('reporter', 50).defaultTo('').comment('提报人')
  })
}

exports.down = function(knex) {
  return knex.schema.alterTable('stock_in_items', table => {
    table.dropColumn('consumable_name')
    table.dropColumn('spec_model')
    table.dropColumn('unit')
    table.dropColumn('reporter')
  })
}
