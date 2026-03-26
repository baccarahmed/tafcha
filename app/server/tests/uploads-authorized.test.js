import request from 'supertest'
import app from '../index.js'

const pngData =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHnQLFq8q0VQAAAABJRU5ErkJggg=='

async function loginAsAdmin() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@tafchaa.com',
    password: 'admin123',
  })
  return res.body.token
}

describe('Uploads API (authorized)', () => {
  it('accepts upload when authorized as admin', async () => {
    const token = await loginAsAdmin()
    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: pngData })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('url')
    expect(typeof res.body.url).toBe('string')
    expect(res.body.url).toMatch(/\.webp$/)
  })
})
