exports.up = function(knex) {
  return knex.schema
    .raw('CREATE INDEX IF NOT EXISTS idx_consumables_reporter ON consumables(reporter)')
    .raw('CREATE INDEX IF NOT EXISTS idx_consumables_is_deleted ON consumables(is_deleted)')
    .raw('CREATE INDEX IF NOT EXISTS idx_stock_in_items_consumable ON stock_in_items(consumable_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_stock_out_items_consumable ON stock_out_items(consumable_id)')
}

exports.down = function(knex) {
  return knex.schema
    .raw('DROP INDEX IF EXISTS idx_consumables_reporter ON consumables')
    .raw('DROP INDEX IF EXISTS idx_consumables_is_deleted ON consumables')
    .raw('DROP INDEX IF EXISTS idx_stock_in_items_consumable ON stock_in_items')
    .raw('DROP INDEX IF EXISTS idx_stock_out_items_consumable ON stock_out_items')
}
