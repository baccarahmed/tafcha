'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Drawer } from 'vaul';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  ArrowRight,
  Check,
  Truck,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import SneakerVisual from '@/components/storefront/SneakerVisual';
import { useLocale, useTranslations } from 'next-intl';
import { isRtl, type Locale } from '@/i18n/routing';
import { formatCurrency } from '@/lib/utils';

const springTransition = { type: 'spring', stiffness: 300, damping: 30 } as const;

export function CartDrawer({
  freeShippingThreshold,
  shippingCost,
}: {
  freeShippingThreshold: number;
  shippingCost: number;
}) {
  const t = useTranslations('cart');
  const locale = useLocale() as Locale;
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore((state) => state.totalItems);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const closeCart = useCartStore((state) => state.closeCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const shipping =
    totalItems > 0 && totalPrice < freeShippingThreshold ? shippingCost : 0;
  const grandTotal = totalPrice + shipping;
  const freeShippingGap = freeShippingThreshold - totalPrice;
  const freeShippingProgress =
    freeShippingThreshold > 0
      ? Math.min(100, Math.round((totalPrice / freeShippingThreshold) * 100))
      : 100;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeCart();
    }
  };

  const rtl = isRtl(locale);
  const slideOffset = rtl ? -300 : 300;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      direction={rtl ? 'left' : 'right'}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed end-0 top-0 z-50 flex h-screen w-full flex-col border-s border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] text-[var(--q2m-ink)] outline-none md:w-[440px]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="cart-content"
              initial={{ x: slideOffset, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideOffset, opacity: 0 }}
              transition={springTransition}
              className="flex h-full flex-col"
            >
              {/* Header du drawer : même chrome noir que la navbar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-black px-6 py-5">
                <div className="flex items-center gap-3">
                  <Drawer.Title className="text-xl font-extrabold tracking-tight text-[#f6f4ef]">
                    {t('title')}
                  </Drawer.Title>
                  {totalItems > 0 && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--q2m-accent)] px-2 text-xs font-bold text-[var(--q2m-on-accent)]">
                      {totalItems}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t('close')}
                  onClick={closeCart}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--q2m-on-dark-soft)] transition-colors hover:bg-white/10 hover:text-[var(--q2m-accent)]"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, ...springTransition }}
                  className="flex flex-1 flex-col items-center justify-center px-8 text-center"
                >
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--q2m-bone)] ring-1 ring-[var(--q2m-line-soft)]">
                    <ShoppingBag className="h-12 w-12 text-[var(--q2m-ink-stone)]" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[var(--q2m-ink)]">
                    {t('empty')}
                  </h3>
                  <p className="mb-8 max-w-xs text-sm text-[var(--q2m-ink-stone)]">
                    {t('emptyBody')}
                  </p>
                  <Link
                    href="/shop"
                    onClick={closeCart}
                    className="q2m-btn-primary"
                  >
                    <span>{t('shopNow')}</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </motion.div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <ul className="space-y-4">
                      {items.map((item, index) => (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * index, ...springTransition }}
                          className="group flex gap-4 rounded-lg border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg)] p-3 transition-colors hover:border-[var(--q2m-accent-text)]"
                        >
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={closeCart}
                            className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-[var(--q2m-bone)]"
                          >
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <SneakerVisual variant={item.palette} />
                            )}
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/product/${item.slug}`}
                                  onClick={closeCart}
                                  className="block truncate text-sm font-semibold text-[var(--q2m-ink)] transition-colors hover:text-[var(--q2m-accent-text)]"
                                >
                                  {item.name}
                                </Link>
                                {item.size && (
                                  <span className="mt-1 block text-xs text-[var(--q2m-ink-stone)]">
                                    {t('sizeLabel', { size: item.size })}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                aria-label={t('removeItem', { name: item.name })}
                                onClick={() => removeItem(item.productId, item.size)}
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--q2m-ink-stone)] transition-colors hover:bg-[var(--q2m-alert)]/10 hover:text-[var(--q2m-alert)]"
                              >
                                <X className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                            </div>

                            <div className="mt-auto flex items-end justify-between pt-3">
                              <div className="flex items-center gap-1.5 rounded-md border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-1">
                                <button
                                  type="button"
                                  aria-label={t('decreaseQty')}
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                      item.size
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--q2m-ink-stone)] transition-colors hover:bg-[var(--q2m-bone)] hover:text-[var(--q2m-accent-text)]"
                                >
                                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                                </button>
                                <span className="w-7 text-center text-xs font-semibold text-[var(--q2m-ink)]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label={t('increaseQty')}
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                      item.size
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--q2m-ink-stone)] transition-colors hover:bg-[var(--q2m-bone)] hover:text-[var(--q2m-accent-text)]"
                                >
                                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                </button>
                              </div>

                              <div className="text-end">
                                <p className="text-sm font-bold text-[var(--q2m-ink)]">
                                  {formatCurrency(item.price * item.quantity, locale)}
                                </p>
                                {item.quantity > 1 && (
                                  <p className="text-[10px] text-[var(--q2m-ink-stone)]">
                                    {t('each', { price: formatCurrency(item.price, locale) })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-[var(--q2m-line-soft)] bg-[var(--q2m-bg)] px-6 py-5">
                    {/* Progression vers la livraison gratuite */}
                    <div className="mb-4 rounded-md border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--q2m-ink)]">
                          <Truck className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {shipping === 0
                              ? t('shippingFree')
                              : t('freeShippingHint', {
                                  amount: formatCurrency(freeShippingGap, locale),
                                })}
                          </span>
                        </span>
                        {shipping === 0 && (
                          <Check
                            className="h-4 w-4 shrink-0 text-[var(--q2m-status-open)]"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--q2m-bone)]"
                        role="progressbar"
                        aria-valuenow={freeShippingProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--q2m-accent)] transition-all duration-500"
                          style={{ width: `${freeShippingProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--q2m-ink-stone)]">{t('subtotal')}</span>
                        <span className="font-medium text-[var(--q2m-ink)]">
                          {formatCurrency(totalPrice, locale)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[var(--q2m-ink-stone)]">
                          <Truck className="h-3.5 w-3.5" />
                          <span>{t('shipping')}</span>
                        </div>
                        <span className="font-medium text-[var(--q2m-ink)]">
                          {shipping === 0 ? (
                            <span className="text-[var(--q2m-status-open)]">{t('shippingFree')}</span>
                          ) : (
                            formatCurrency(shipping, locale)
                          )}
                        </span>
                      </div>

                      <div className="my-4 h-px bg-[var(--q2m-line-soft)]" />

                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--q2m-ink-stone)]">
                          {t('total')}
                        </span>
                        <span className="text-2xl font-extrabold tracking-tight text-[var(--q2m-ink)]">
                          {formatCurrency(grandTotal, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <Link
                        href="/checkout"
                        onClick={closeCart}
                        className="q2m-btn-primary w-full"
                      >
                        {t('checkout')}
                      </Link>
                      <Link
                        href="/shop"
                        onClick={closeCart}
                        className="q2m-btn-secondary w-full"
                      >
                        {t('continueShopping')}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}