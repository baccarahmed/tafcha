'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Q2MProductCard } from '@/components/storefront/Q2MProductCard';
import { Q2M, Q2M_FONT, Q2M_BRAND_IMAGES } from '@/lib/q2m-tokens';
import { formatCurrency, intlLocale } from '@/lib/utils';
import type { CatalogProduct } from '@/types/catalog';

interface DropsListProps {
  featured?: CatalogProduct | null;
  archives?: CatalogProduct[];
}

/** Drop vedette : 1er décembre 2026 à 20h00 UTC. */
const DROP_TARGET = Date.UTC(2026, 11, 1, 20, 0, 0);

/**
 * Calendrier de demonstration.
 *
 * `quantity` est un nombre et `statusKey` une cle : « 120 paires » et
 * « Inscriptions ouvertes » se traduisent, « Nike Air Max DN » non. La date est
 * une vraie date ISO : le jour et le mois abrégé sont rendus via `Intl` pour
 * suivre la langue active, « 12 oct. » en francais, « 12 Oct » en anglais.
 */
const CALENDAR = [
  {
    date: '2026-10-12',
    model: 'Nike Air Max DN — Black / Gold',
    quantity: 120,
    status: 'open',
    statusKey: 'statusOpen',
  },
  {
    date: '2026-10-24',
    model: 'Crocs Echo Clog — Triple Black',
    quantity: 90,
    status: 'soon',
    statusKey: 'statusUpcoming',
  },
  {
    date: '2026-11-08',
    model: 'Adidas Ultraboost 5 — Q2M Edition',
    quantity: 60,
    status: 'soon',
    statusKey: 'statusUpcoming',
  },
  {
    date: '2026-11-21',
    model: 'Nike Air Force 1 — Tunis Nights',
    quantity: 100,
    status: 'soon',
    statusKey: 'statusSoon',
  },
] as const;

const STATUS_TONES = {
  open: { background: 'var(--q2m-status-open-bg)', color: 'var(--q2m-status-open)' },
  soon: { background: 'var(--q2m-status-soon-bg)', color: 'var(--q2m-status-soon)' },
  neutral: { background: 'var(--q2m-status-neutral-bg)', color: 'var(--q2m-status-neutral)' },
} as const;

function splitDuration(ms: number) {
  const clamped = Math.max(0, ms);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
  };
}

export default function DropsList({ featured, archives = [] }: DropsListProps) {
  const t = useTranslations('drops');
  const locale = useLocale();
  const [now, setNow] = useState<number>(DROP_TARGET);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = splitDuration(DROP_TARGET - now);
  const units = [
    [countdown.days, t('daysLong')],
    [countdown.hours, t('hoursLong')],
    [countdown.minutes, t('minutesLong')],
    [countdown.seconds, t('secondsLong')],
  ] as const;

  // « 12 oct. » en français, « 12 Oct » en anglais, « 12 أكتوبر » en arabe :
  // le mois du calendrier ne peut pas rester fige en OCT.
  const dayFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
  const formatDate = (iso: string) => dayFormatter.format(new Date(`${iso}T00:00:00Z`));

  return (
    <div style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      {/* Introduction — bandeau sombre */}
      <header style={{ background: '#151515' }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-12 pt-10.5 pb-9.5 lg:px-14">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: Q2M.accent }}
            >
              {t('route')}
            </span>
            <Link
              href="/drops"
              className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
              style={{ background: Q2M.accent, color: Q2M.onAccent, borderRadius: 4 }}
            >
              {t('enableAlerts')}
              <ArrowUpRight size={13} strokeWidth={1.5} />
            </Link>
          </div>
          <h1
            className="text-[clamp(40px,5vw,68px)] font-black uppercase leading-[0.95] tracking-[-0.01em]"
            style={{ color: '#FFFFFF', maxWidth: 920 }}
          >
            {t('heroTitle')}
          </h1>
          <p className="text-base leading-[1.55]" style={{ color: '#AAA59C', maxWidth: 700 }}>
            {t('heroLead')}
          </p>
        </div>
      </header>

      {/* Drop principal — panneau #151515, 2 colonnes */}
      <section style={{ background: '#151515' }}>
        <div className="mx-auto max-w-[1440px] px-12 pb-10.5 lg:px-14">
          <div
            className="flex flex-col overflow-hidden lg:flex-row"
            style={{ background: '#151515' }}
          >
            {/* Informations — padding 54 */}
            <div
              className="flex flex-1 flex-col justify-between gap-12 p-8 lg:p-13.5"
              style={{ minHeight: 480 }}
            >
              <div className="flex flex-col gap-4">
                <span
                  className="w-fit px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ ...STATUS_TONES.soon, borderRadius: 999 }}
                >
                  {t('statusUpcoming')}
                </span>
                <h2
                  className="text-[clamp(36px,3.6vw,52px)] font-black uppercase leading-[0.92] tracking-[-0.02em]"
                  style={{ color: '#FFFFFF' }}
                >
                  {featured?.name ?? t('featuredTitle')}
                </h2>
                <p className="text-sm leading-[1.6]" style={{ color: '#AAA59C', maxWidth: 460 }}>
                  {t('featuredLead')}
                </p>
              </div>

              {/* Compte à rebours — 4 cellules h68 */}
              <div className="flex gap-2">
                {units.map(([value, label]) => (
                  <div
                    key={label}
                    className="flex h-17 flex-1 flex-col items-center justify-center gap-1"
                    style={{ background: Q2M.bgDark }}
                  >
                    <span
                      className="text-xl font-black tabular-nums"
                      style={{ color: '#FFFFFF' }}
                    >
                      {String(value).padStart(2, '0')}
                    </span>
                    <span className="text-[12px] leading-[1.5]" style={{ color: '#FFFFFF' }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Prix + action */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xl font-black tabular-nums" style={{ color: '#FFFFFF' }}>
                  {featured ? formatCurrency(featured.price, locale) : t('priceOnReveal')}
                </span>
                <Link
                  href={featured ? `/product/${featured.slug}` : '/shop'}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
                  style={{ background: Q2M.accent, color: Q2M.onAccent, borderRadius: 4 }}
                >
                  {t('notifyMe')}
                  <ArrowUpRight size={14} strokeWidth={1.5} />
                </Link>
              </div>
            </div>

            {/* Visuel du drop */}
            <div className="relative min-h-[320px] flex-1 lg:min-h-[480px]">
              {featured?.images[0] ? (
                <Image
                  src={featured.images[0]}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <Image
                  src={Q2M_BRAND_IMAGES.dropClassic}
                  alt="Q2M drop à venir"
                  fill
                  unoptimized
                  className="object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Calendrier — lignes empilées, fond blanc, bordure 1px */}
      <section>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-12 py-14 lg:px-14">
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: Q2M.accent }}
            >
              {t('calendarEyebrow')}
            </span>
            <h2
              className="text-[clamp(32px,2.8vw,42px)] font-black uppercase leading-[1.21]"
              style={{ color: Q2M.ink }}
            >
              {t('calendarTitle')}
            </h2>
          </div>

          <div className="flex flex-col gap-7">
            {CALENDAR.map((row) => (
              <motion.div
                key={row.date}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45 }}
                className="flex flex-col gap-4 px-4.5 py-5 lg:flex-row lg:items-center lg:gap-6"
                style={{ background: Q2M.bgElevated, border: `1px solid ${Q2M.line}` }}
              >
                <span
                  className="w-[100px] shrink-0 text-xs font-black tabular-nums"
                  style={{ color: Q2M.ink }}
                >
                  {formatDate(row.date)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-base font-bold" style={{ color: Q2M.ink }}>
                    {row.model}
                  </span>
                  <span className="w-[130px] text-xs" style={{ color: Q2M.inkMute }}>
                    {t('pairs', { count: row.quantity })}
                  </span>
                </div>
                <span
                  className="w-fit px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ ...STATUS_TONES[row.status], borderRadius: 999 }}
                >
                  {t(row.statusKey)}
                </span>
                <Link
                  href="/shop"
                  className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:bg-accent hover:text-on-accent"
                  style={{ border: `1px solid ${Q2M.lineStrong}`, borderRadius: 4, color: Q2M.ink }}
                >
                  {t('details')}
                  <ArrowUpRight size={13} strokeWidth={1.5} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Archives — fond beige */}
      {archives.length > 0 && (
        <section style={{ background: Q2M.bone }}>
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6.5 px-12 py-12.5 lg:px-14">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: Q2M.accent }}
                >
                  {t('archivesEyebrow')}
                </span>
                <h2
                  className="text-[clamp(32px,2.8vw,42px)] font-black uppercase leading-[1.21]"
                  style={{ color: Q2M.ink }}
                >
                  {t('archivesTitle')}
                </h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-60"
                style={{ color: Q2M.ink }}
              >
                {t('viewAllDrops')}
                <ArrowUpRight size={13} strokeWidth={1.5} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-4 md:gap-x-[18px]">
              {archives.map((product) => (
                <Q2MProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}