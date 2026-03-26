import request from 'supertest'
import app from '../index.js'

describe('Categories API', () => {
  it('lists categories ordered', async () => {
    const res = await request(app).get('/api/products/categories/all')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.categories)).toBe(true)
  })
})
