import request from 'supertest'
import app from '../index.js'

describe('Auth API', () => {
  it('logs in as default admin and returns token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@tafchaa.com',
      password: 'admin123',
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user.role).toBe('admin')
  })
})
