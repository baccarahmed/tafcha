import request from 'supertest'
import app from '../index.js'

async function loginAsAdmin() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@tafchaa.com',
    password: 'admin123',
  })
  return res.body.token
}

describe('Products API', () => {
  it('lists products (may be empty)', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.products)).toBe(true)
  })

  it('creates, fetches and deletes a product (admin)', async () => {
    const token = await loginAsAdmin()
    const name = `Test Product ${Date.now()}`
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        price: 19.99,
        stock: 5,
        featured: false,
      })
    expect(createRes.status).toBe(201)
    const { product } = createRes.body
    expect(product).toBeTruthy()
    expect(product.name).toBe(name)

    const slug = product.slug
    const getRes = await request(app).get(`/api/products/${slug}`)
    expect(getRes.status).toBe(200)
    expect(getRes.body.product.slug).toBe(slug)

    const delRes = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(delRes.status).toBe(200)
  })
})
