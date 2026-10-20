'use server'

import { revalidateCatalog } from '@/lib/revalidate-catalog'
import { requireAdmin } from '@/lib/admin-guard'
import {
  deleteProduct,
  duplicateProduct,
  ProductValidationError,
  updateProduct,
  type DuplicateOptions,
  type ProductPatch,
} from '@/lib/admin-products'
import {
  isOrderStatus,
  isPaymentStatus,
  OrderValidationError,
  updateOrder,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/admin-orders'
import { demoteUser, setUserRole, UserValidationError } from '@/lib/admin-users'
import { notifyOrderStatusChange } from '@/lib/notify-channels'
import {
  createPromotion,
  deletePromotion,
  PromotionValidationError,
  setPromotionActive,
  updatePromotion,
  type PromotionInput,
} from '@/lib/admin-promotions'

/**
 * Point d'ecriture unique du back-office.
 *
 * Toutes les actions passent par `requireAdmin` : session InsForge valide,
 * role ADMIN relu en base ET preuve MFA (VULN-001) quand le compte y est
 * inscrit. Le layout du dashboard n'est qu'un garde de rendu, la vraie
 * autorisation doit tenir sur le chemin d'ecriture, sinon un appel direct a
 * l'action suffirait a contourner l'interface.
 *
 * Aucune de ces actions ne leve pour un cas d'exploitation normal : elles
 * renvoient `{ ok: false, field }` afin que le composant affiche un message
 * traduit a cote du controle concerne.
 */

export type ActionResult = { ok: true } | { ok: false; field: string }

/** Revalide le dashboard et la vitrine : les deux lisent les memes tables. */
function refresh(): void {
  revalidateCatalog()
}

export async function updateProductAction(
  id: string,
  patch: ProductPatch
): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    await updateProduct(id, patch)
    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof ProductValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    await deleteProduct(id)
    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof ProductValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export type DuplicateProductResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; field: string }

/**
 * Cree un coloris a partir d'une fiche existante. Meme garde que les autres
 * ecritures produit : le role est relu en base avant toute chose.
 */
export async function duplicateProductAction(
  sourceId: string,
  options: DuplicateOptions = {}
): Promise<DuplicateProductResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    const created = await duplicateProduct(sourceId, options)
    refresh()

    return { ok: true, id: created.id, slug: created.slug }
  } catch (error) {
    if (error instanceof ProductValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function updateOrderAction(
  id: string,
  patch: {
    status?: string
    paymentStatus?: string
    notes?: string | null
    deliveryWindowStart?: string | null
    deliveryWindowEnd?: string | null
  }
): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    // Les valeurs viennent d'une liste deroulante, mais une action est
    // appelable directement : le CHECK du schema ne doit pas etre le seul garde.
    if (patch.status !== undefined && !isOrderStatus(patch.status))
      throw new OrderValidationError('status')
    if (patch.paymentStatus !== undefined && !isPaymentStatus(patch.paymentStatus))
      throw new OrderValidationError('paymentStatus')

    await updateOrder(id, {
      status: patch.status as OrderStatus | undefined,
      paymentStatus: patch.paymentStatus as PaymentStatus | undefined,
      notes: patch.notes,
      deliveryWindowStart: patch.deliveryWindowStart,
      deliveryWindowEnd: patch.deliveryWindowEnd,
    })

    // Canaux externes : best-effort, desactives par defaut.
    if (patch.status) {
      void notifyOrderStatusChange({ orderId: id, status: patch.status }).catch(() => {})
    }

    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof OrderValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function setUserRoleAction(
  userId: string,
  role: 'CUSTOMER' | 'ADMIN'
): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  // Un admin ne se retire pas ses propres droits : sinon le dernier clic sur
  // « retrograder » rend le back-office inaccessible a tous.
  if (user.id === userId && role !== 'ADMIN') return { ok: false, field: 'selfDemote' }

  try {
    if (role === 'CUSTOMER') {
      const result = await demoteUser(userId)

      if (!result.ok) return { ok: false, field: result.reason }
    } else {
      await setUserRole(userId, role)
    }

    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof UserValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function savePromotionAction(
  id: string | null,
  input: PromotionInput
): Promise<ActionResult & { id?: string }> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    const saved = id ? await updatePromotion(id, input) : await createPromotion(input)

    refresh()

    return { ok: true, id: saved.id }
  } catch (error) {
    if (error instanceof PromotionValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function setPromotionActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    await setPromotionActive(id, active)
    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof PromotionValidationError) return { ok: false, field: error.field }

    throw error
  }
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, field: 'forbidden' }

  try {
    await deletePromotion(id)
    refresh()

    return { ok: true }
  } catch (error) {
    if (error instanceof PromotionValidationError) return { ok: false, field: error.field }

    throw error
  }
}