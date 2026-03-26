import request from 'supertest'
import app from '../index.js'

const tinyMp4 = 'data:video/mp4;base64,AAAA'

async function loginAsAdmin() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@tafchaa.com',
    password: 'admin123',
  })
  return res.body.token
}

describe('Uploads API (video)', () => {
  it('accepts small mp4 when authorized as admin', async () => {
    const token = await loginAsAdmin()
    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: tinyMp4 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('url')
    expect(res.body.url).toMatch(/\.mp4$/)
  })
})
