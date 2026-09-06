/**
 * 归属外键化 + 补货建议开关
 * 迁移日期: 20260903
 *
 * 1. ownership_options 新增 need_replenish（该归属是否参与补货建议）
 * 2. consumables 新增 ownership_id（外键关联 ownership_options.id）
 * 3. 回填 ownership_id（按 name 匹配），并将残留的旧名「办公室」直接归到「401」
 */
exports.up = async function (knex) {
  // 1. ownership_options 加开关字段
  await knex.schema.alterTable('ownership_options', (table) => {
    table.boolean('need_replenish').notNullable().defaultTo(false).comment('是否参与补货建议')
  })

  // 2. consumables 加外键字段
  await knex.schema.alterTable('consumables', (table) => {
    table.integer('ownership_id').unsigned().nullable().comment('归属字典ID')
  })

  // 3. 按 name 回填 ownership_id
  const opts = await knex('ownership_options').select('id', 'name')
  for (const o of opts) {
    await knex('consumables')
      .where('ownership', o.name)
      .update({ ownership_id: o.id })
  }

  // 4. 决策：旧名「办公室」已改名「401」，残留的「办公室」直接归到「401」
  const target401 = opts.find((o) => o.name === '401')
  if (target401) {
    await knex('consumables')
      .where('ownership', '办公室')
      .update({ ownership: '401', ownership_id: target401.id })
  }
}

exports.down = async function (knex) {
  await knex.schema.alterTable('consumables', (table) => {
    table.dropColumn('ownership_id')
  })
  await knex.schema.alterTable('ownership_options', (table) => {
    table.dropColumn('need_replenish')
  })
}
