import request from 'supertest'
import app from '../index.js'

async function loginAsAdmin() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@tafchaa.com',
    password: 'admin123',
  })
  return res.body.token
}

describe('Settings API', () => {
  it('updates and reads back site settings', async () => {
    const token = await loginAsAdmin()

    // fetch categories to pick featured ids
    const catsRes = await request(app).get('/api/products/categories/all')
    expect(catsRes.status).toBe(200)
    const cats = catsRes.body.categories || []
    const ids = cats.slice(0, 2).map((c) => c.id)

    const payload = {
      heroTitle: 'New Title',
      heroSubtitle: 'New Subtitle',
      heroVideo: '/uploads/test-video.mp4',
      siteBgColor: '#112233',
      sitePanelColor: '#223344',
      featuredCategories: ids,
      featuredLimit: 2,
    }

    const putRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveProperty('settings')

    const getRes = await request(app).get('/api/settings')
    expect(getRes.status).toBe(200)
    const s = getRes.body.settings
    expect(s.heroTitle).toBe(payload.heroTitle)
    expect(s.heroSubtitle).toBe(payload.heroSubtitle)
    expect(s.heroVideo).toBe(payload.heroVideo)
    expect(s.siteBgColor).toBe(payload.siteBgColor)
    expect(s.sitePanelColor).toBe(payload.sitePanelColor)
    // featuredCategories stored as JSON text; better to parse in client.
    // We just assert that it contains the first id when stringified.
    const arr = (() => {
      try { return JSON.parse(s.featuredCategories || '[]') } catch { return [] }
    })()
    expect(Array.isArray(arr)).toBe(true)
    if (ids.length > 0) {
      expect(arr).toContain(ids[0])
    }
    expect(s.featuredLimit).toBe(payload.featuredLimit)
  })
})
