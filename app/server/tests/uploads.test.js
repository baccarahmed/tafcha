import request from 'supertest'
import app from '../index.js'

const pngData =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHnQLFq8q0VQAAAABJRU5ErkJggg=='

describe('Uploads API', () => {
  it('rejects unauthorized upload', async () => {
    const res = await request(app).post('/api/uploads').send({ data: pngData })
    expect(res.status).toBe(401)
  })
})
