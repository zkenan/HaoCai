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

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/consumables', consumableRoutes)

let token
let createdId

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = res.body.token
})

describe('CRUD /api/consumables', () => {
  test('创建耗材成功', async () => {
    const res = await request(app)
      .post('/api/consumables')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '测试耗材',
        spec_model: 'TEST-001',
        quantity: 100,
        unit: '个',
        unit_price: 10.5,
        reporter: '测试员'
      })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('创建成功')
    expect(res.body.data.id).toBeDefined()
    createdId = res.body.data.id
  })

  test('获取列表成功', async () => {
    const res = await request(app)
      .get('/api/consumables')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('获取成功')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  test('获取详情成功', async () => {
    const res = await request(app)
      .get(`/api/consumables/${createdId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('获取成功')
    expect(res.body.data.id).toBe(createdId)
    expect(res.body.data.name).toBe('测试耗材')
  })

  test('更新耗材成功', async () => {
    const res = await request(app)
      .put(`/api/consumables/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '测试耗材更新',
        spec_model: 'TEST-002',
        quantity: 200,
        unit: '个',
        unit_price: 15.0,
        reporter: '测试员'
      })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('更新成功')
  })

  test('删除耗材成功', async () => {
    const res = await request(app)
      .delete(`/api/consumables/${createdId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('删除成功')
  })
})
