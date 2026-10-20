import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  getSessionUser: vi.fn(),
  getActivePromotions: vi.fn(),
  ipSeq: 0,
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': `10.0.0.${h.ipSeq++}` }),
}))

vi.mock('@/lib/session', () => ({ getSessionUser: h.getSessionUser }))

vi.mock('@/lib/insforge-admin', () => ({
  insforgeAdmin: () => ({ database: { from: h.from, rpc: h.rpc } }),
}))

vi.mock('@/lib/promotions', () => ({
  getActivePromotions: h.getActivePromotions,
  applyPercentage: (value: number) => value,
  resolveDiscountPercentage: () => 0,
}))

import { createOrderAction, type CreateOrderInput } from '@/app/actions/orders'

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111'

/** Chaine PostgREST factice : configurable, chainable et awaitable. */
function chain(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: () => query,
    in: () => query,
    eq: () => query,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }

  return query
}

function input(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    address: {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0612345678',
      line1: '12 rue des Lilas',
      city: 'Paris',
      postalCode: '75011',
      country: 'FR',
    },
    items: [{ productId: PRODUCT_ID, quantity: 1 }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  h.getSessionUser.mockResolvedValue(null)
  h.getActivePromotions.mockResolvedValue([])
  h.rpc.mockImplementation(async (fn: string) => {
    // Le compteur partage (VULN-002) passe aussi par .rpc() : on repond
    // « autorise » sans toucher au compteur reel. Les assertions des tests
    // portent sur create_order_with_stock, pas sur le rate-limit.
    if (fn === 'rate_limit_hit') {
      return { data: { ok: true, remaining: 99, retryAfter: 0 }, error: null }
    }
    return { data: 'order-1', error: null }
  })

  h.from.mockImplementation((table: string) => {
    if (table === 'products') {
      return chain({
        data: [{ id: PRODUCT_ID, price: 100, category_id: null, active: true }],
        error: null,
      })
    }

    if (table === 'site_settings') {
      return chain({ data: { free_shipping_threshold_dnt: 200, shipping_cost_dnt: 10 } })
    }

    return chain({ data: null, error: null })
  })
})

describe('createOrderAction', () => {
  it('refuse une adresse invalide', async () => {
    expect(await createOrderAction(input({ address: {} as CreateOrderInput['address'] }))).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('refuse un panier vide', async () => {
    expect(await createOrderAction(input({ items: [] }))).toEqual({ ok: false, error: 'empty' })
  })

  it('refuse un identifiant produit non-UUID', async () => {
    expect(await createOrderAction(input({ items: [{ productId: 'nope', quantity: 1 }] }))).toEqual({
      ok: false,
      error: 'invalid',
    })
  })

  it('calcule les totaux cote serveur et les passe a la RPC', async () => {
    const result = await createOrderAction(input())

    expect(result).toEqual({ ok: true, orderId: 'order-1' })
    expect(h.rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_subtotal: 100,
        p_shipping: 10,
        p_total: 110,
        p_items: [
          { product_id: PRODUCT_ID, quantity: 1, price: 100, size: null },
        ],
      }),
    )
  })

  it('offre la livraison au-dessus du seuil', async () => {
    await createOrderAction(input({ items: [{ productId: PRODUCT_ID, quantity: 2 }] }))

    expect(h.rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({ p_subtotal: 200, p_shipping: 0, p_total: 200 }),
    )
  })

  it('refuse un produit indisponible avant d appeler la fonction', async () => {
    h.from.mockImplementation((table: string) =>
      table === 'products'
        ? chain({ data: [{ id: PRODUCT_ID, price: 100, category_id: null, active: false }], error: null })
        : chain({ data: null, error: null }),
    )

    expect(await createOrderAction(input())).toEqual({ ok: false, error: 'unavailable' })
    expect(h.rpc).not.toHaveBeenCalledWith('create_order_with_stock', expect.anything())
  })

  it('retraduit une rupture de stock renvoyee par la fonction', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: 'outOfStock' } })

    expect(await createOrderAction(input())).toEqual({ ok: false, error: 'outOfStock' })
  })

  it('retraduit un produit indisponible renvoye par la fonction', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } })

    expect(await createOrderAction(input())).toEqual({ ok: false, error: 'unavailable' })
  })

  it('convertit une erreur inattendue en failed', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await createOrderAction(input())).toEqual({ ok: false, error: 'failed' })
  })
})
