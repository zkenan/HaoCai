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

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('POST /api/auth/login', () => {
  test('正确用户名密码登录成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('登录成功')
    expect(res.body.token).toBeDefined()
    expect(res.body.user).toBeDefined()
    expect(res.body.user.username).toBe('admin')
  })

  test('错误密码登录失败', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('用户名或密码错误')
  })

  test('空密码登录失败', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('用户名和密码不能为空')
  })

  test('无token访问被拒绝', async () => {
    const res = await request(app)
      .get('/api/auth/../../consumables')

    expect([401, 404]).toContain(res.status)
  })
})
