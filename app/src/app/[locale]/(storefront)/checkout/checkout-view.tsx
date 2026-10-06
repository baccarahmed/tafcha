"use client";

import { Link } from "@/i18n/navigation";
import { useTransition, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Banknote, Check, ShoppingBag, Truck } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import SneakerVisual from "@/components/storefront/SneakerVisual";
import { formatCurrency } from "@/lib/utils";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";
import { createOrderAction, type CreateOrderErrorCode } from "@/app/actions/orders";

const EASE = [0.16, 1, 0.3, 1] as const;

interface CheckoutViewProps {
  initial: { fullName: string; email: string };
  freeShippingThreshold: number;
  shippingCost: number;
}

interface AddressFields {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: keyof AddressFields;
  value: string;
  onChange: (name: keyof AddressFields, value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className="q2m-input"
        style={{ background: Q2M.bgElevated }}
      />
    </label>
  );
}

export default function CheckoutView({
  initial,
  freeShippingThreshold,
  shippingCost,
}: CheckoutViewProps) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore((state) => state.totalItems);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const openCart = useCartStore((state) => state.openCart);

  const [form, setForm] = useState<AddressFields>({
    fullName: initial.fullName,
    email: initial.email,
    phone: "",
    line1: "",
    city: "",
    postalCode: "",
    country: "Tunisie",
    notes: "",
  });
  const [error, setError] = useState<CreateOrderErrorCode | null>(null);
  const [placedRef, setPlacedRef] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shipping =
    totalItems > 0 && totalPrice < freeShippingThreshold ? shippingCost : 0;
  const grandTotal = totalPrice + shipping;
  const freeShippingGap = freeShippingThreshold - totalPrice;

  const updateField = (name: keyof AddressFields, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || items.length === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await createOrderAction({
        address: form,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
        })),
      });

      if (result.ok) {
        clearCart();
        setPlacedRef(result.orderId);
      } else {
        setError(result.error);
      }
    });
  };

  if (placedRef) {
    return (
      <main
        className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-center justify-center px-6 py-24 text-center"
        style={{ fontFamily: Q2M_FONT }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: Q2M.accent, color: Q2M.onAccent ?? "#0a0a0a" }}
        >
          <Check size={30} strokeWidth={2.5} />
        </motion.div>

        <p className="mb-3 text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t("successKicker")}
        </p>
        <h1 className="mb-4 text-4xl font-black leading-none tracking-[-0.02em] md:text-5xl">
          {t("successTitle")}
        </h1>
        <p className="mb-2 max-w-md leading-relaxed text-ink-soft">
          {t("successBody")}
        </p>
        <p className="mb-8 text-xs font-semibold text-ink-mute">
          {t("orderRef", { ref: placedRef.slice(0, 8).toUpperCase() })}
        </p>

        <Link href="/shop" className="q2m-btn-primary">
          <span>{t("continueShopping")}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main
        className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-center justify-center px-6 py-24 text-center"
        style={{ fontFamily: Q2M_FONT }}
      >
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
          style={{ background: Q2M.bgElevated }}
        >
          <ShoppingBag size={40} strokeWidth={1.5} className="text-ink-mute" />
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-[-0.02em]">
          {t("empty")}
        </h1>
        <p className="mb-8 max-w-sm leading-relaxed text-ink-soft">
          {t("emptyBody")}
        </p>
        <Link href="/shop" className="q2m-btn-primary">
          <span>{t("shopNow")}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-6 pt-16 pb-8 lg:px-12">
        <p className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t("kicker")}
        </p>
        <h1 className="text-4xl font-black leading-none tracking-[-0.03em] md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
          {t("subtitle")}
        </p>
      </section>

      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 pb-24 lg:grid-cols-[1.2fr_1fr] lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <h2 className="text-[10px] font-black tracking-[0.16em] uppercase text-ink-mute">
              {t("deliveryTitle")}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t("fullName")}
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                required
                autoComplete="name"
              />
              <Field
                label={t("email")}
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                required
                autoComplete="email"
              />
              <Field
                label={t("phone")}
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                required
                autoComplete="tel"
                placeholder="+216 ..."
              />
              <Field
                label={t("postalCode")}
                name="postalCode"
                value={form.postalCode}
                onChange={updateField}
                required
                autoComplete="postal-code"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field
                label={t("address")}
                name="line1"
                value={form.line1}
                onChange={updateField}
                required
                autoComplete="street-address"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label={t("city")}
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  required
                  autoComplete="address-level2"
                />
                <Field
                  label={t("country")}
                  name="country"
                  value={form.country}
                  onChange={updateField}
                  required
                  autoComplete="country-name"
                />
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
                  {t("notes")}
                </span>
                <textarea
                  name="notes"
                  value={form.notes}
                  rows={3}
                  placeholder={t("notesPlaceholder")}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="q2m-input resize-none"
                  style={{ background: Q2M.bgElevated }}
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-2 border px-4 py-3 text-xs font-semibold"
                style={{ borderColor: Q2M.alert, color: Q2M.alert }}
              >
                <span>
                  {error === "unauthenticated"
                    ? t("errors.unauthenticated")
                    : t(`errors.${error}`)}
                </span>
                {error === "unauthenticated" && (
                  <Link
                    href="/login?next=/checkout"
                    className="font-bold underline underline-offset-2"
                  >
                    {t("login")}
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={pending}
                className="q2m-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{pending ? t("placing") : t("placeOrder")}</span>
                {!pending && (
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                )}
              </button>

              <p className="flex items-center justify-center gap-2 text-[11px] text-ink-mute">
                <Banknote size={14} />
                {t("paymentNote")}
              </p>
            </div>
          </form>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="h-fit lg:sticky lg:top-28"
        >
          <div
            className="border p-6"
            style={{ borderColor: Q2M.lineStrong, background: Q2M.bgElevated }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[10px] font-black tracking-[0.16em] uppercase text-ink-mute">
                {t("summary")}
              </h2>
              <button
                type="button"
                onClick={openCart}
                className="text-[10px] font-bold tracking-[0.16em] uppercase text-accent underline underline-offset-4"
              >
                {t("editCart")}
              </button>
            </div>

            <ul className="mb-5 flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Link
                    href={`/product/${item.slug}`}
                    className="h-16 w-16 shrink-0 overflow-hidden"
                    style={{ background: Q2M.bg }}
                  >
                    <SneakerVisual variant={item.palette} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-mute">
                      {item.size
                        ? t("lineMetaQtySize", { qty: item.quantity, size: item.size })
                        : t("lineMetaQty", { qty: item.quantity })}
                    </p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity, locale)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t pt-4 text-sm" style={{ borderColor: Q2M.lineStrong }}>
              <div className="flex items-center justify-between">
                <span className="text-ink-mute">{t("subtotal")}</span>
                <span className="font-medium">
                  {formatCurrency(totalPrice, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-mute">
                  <Truck size={14} />
                  {t("shipping")}
                </span>
                <span className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-[var(--q2m-status-open)]">
                      {t("shippingFree")}
                    </span>
                  ) : (
                    formatCurrency(shipping, locale)
                  )}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-ink-mute">
                  {t("freeShippingHint", {
                    amount: formatCurrency(freeShippingGap, locale),
                  })}
                </p>
              )}
            </div>

            <div
              className="mt-4 flex items-baseline justify-between border-t pt-4"
              style={{ borderColor: Q2M.lineStrong }}
            >
              <span className="text-xs font-bold tracking-[0.08em] uppercase text-ink-mute">
                {t("total")}
              </span>
              <span className="text-2xl font-extrabold tracking-tight">
                {formatCurrency(grandTotal, locale)}
              </span>
            </div>
          </div>
        </motion.aside>
      </section>
    </main>
  );
}
