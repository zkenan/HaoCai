/**
 * 归属字典表：让耗材的归属范围可自定义（增删改），而非前端写死
 */
exports.up = async function (knex) {
  await knex.schema.createTable('ownership_options', (table) => {
    table.increments('id').primary()
    table.string('name', 50).notNullable()
    table.integer('sort').defaultTo(0)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  // 预置默认归属
  await knex('ownership_options').insert([
    { name: '部门公用', sort: 1 },
    { name: '办公室', sort: 2 },
    { name: '教学实验', sort: 3 },
    { name: '项目专用', sort: 4 }
  ])
}

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ownership_options')
}
