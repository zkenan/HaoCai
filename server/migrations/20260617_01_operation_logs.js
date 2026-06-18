exports.up = function(knex) {
  return knex.schema.createTable('operation_logs', table => {
    table.increments('id').primary()
    table.integer('user_id').unsigned().comment('操作用户ID')
    table.string('username', 50).comment('操作用户名')
    table.string('action', 50).notNullable().comment('操作类型: login/create/update/delete/import/export')
    table.string('module', 50).notNullable().comment('操作模块: auth/consumables/stock-in/stock-out/backup/users')
    table.string('detail', 500).defaultTo('').comment('操作详情')
    table.string('ip', 50).defaultTo('').comment('操作IP')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.index('user_id', 'idx_log_user_id')
    table.index('action', 'idx_log_action')
    table.index('created_at', 'idx_log_created_at')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('operation_logs')
}
