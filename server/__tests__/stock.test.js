process.env.JWT_SECRET = 'test_secret_key_for_api_tests'
process.env.JWT_EXPIRES_IN = '24h'
process.env.DB_HOST = '192.168.20.17'
process.env.DB_PORT = '3306'
process.env.DB_USER = 'AiHaoCai_test'
process.env.DB_PASSWORD = 'AiHaoCai'
process.env.DB_DATABASE = 'AiHaoCai_test'

const request = require('supertest')
const express = require('express')
const authRoutes = require('../routes/auth')
const consumableRoutes = require('../routes/consumables')
const stockInRoutes = require('../routes/stock-in')
const stockOutRoutes = require('../routes/stock-out')

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/consumables', consumableRoutes)
app.use('/api/stock-in', stockInRoutes)
app.use('/api/stock-out', stockOutRoutes)

let token
let consumableId

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = loginRes.body.token

  const createRes = await request(app)
    .post('/api/consumables')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: '出入库测试耗材',
      spec_model: 'STOCK-TEST-001',
      quantity: 50,
      unit: '个',
      unit_price: 20,
      reporter: '测试员'
    })
  consumableId = createRes.body.data.id
})

afterAll(async () => {
  if (consumableId) {
    await request(app)
      .delete(`/api/consumables/${consumableId}`)
      .set('Authorization', `Bearer ${token}`)
  }
})

describe('出入库接口', () => {
  test('创建入库单成功', async () => {
    const res = await request(app)
      .post('/api/stock-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier_name: '测试供应商',
        delivery_person: '送货人',
        warehouse_manager: '管理员',
        items: [{ consumable_id: consumableId, quantity: 30, unit_price: 20 }]
      })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('入库单创建成功')
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.record_code).toBeDefined()
  })

  test('创建出库单成功', async () => {
    const res = await request(app)
      .post('/api/stock-out')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipient: '领用人',
        purpose: '教学实验',
        items: [{ consumable_id: consumableId, quantity: 10, unit_price: 20 }]
      })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('出库单创建成功')
    expect(res.body.data.id).toBeDefined()
  })

  test('库存不足时出库失败', async () => {
    const res = await request(app)
      .post('/api/stock-out')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipient: '领用人',
        purpose: '测试库存不足',
        items: [{ consumable_id: consumableId, quantity: 99999, unit_price: 20 }]
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/库存不足/)
  })
})
