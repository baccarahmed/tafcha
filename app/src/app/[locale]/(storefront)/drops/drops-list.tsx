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

export type DropStatus = 'live' | 'upcoming' | 'ended';

export interface DropRow {
  slug: string;
  name: string;
  date: string;
  quantity: number;
  status: DropStatus;
}

interface DropsListProps {
  featured: { product: CatalogProduct; status: DropStatus; countdownMs: number | null } | null;
  calendar: DropRow[];
  archives: CatalogProduct[];
}

const STATUS_TONES: Record<DropStatus, { background: string; color: string }> = {
  live: { background: 'var(--q2m-status-open-bg)', color: 'var(--q2m-status-open)' },
  upcoming: { background: 'var(--q2m-status-soon-bg)', color: 'var(--q2m-status-soon)' },
  ended: { background: 'var(--q2m-status-neutral-bg)', color: 'var(--q2m-status-neutral)' },
};

const STATUS_KEYS: Record<DropStatus, 'statusOpen' | 'statusUpcoming' | 'statusEnded'> = {
  live: 'statusOpen',
  upcoming: 'statusUpcoming',
  ended: 'statusEnded',
};

function splitDuration(ms: number) {
  const clamped = Math.max(0, ms);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
  };
}

export default function DropsList({
  featured,
  calendar = [],
  archives = [],
}: DropsListProps) {
  const t = useTranslations('drops');
  const locale = useLocale();
  // Valeur initiale neutre : l'horloge se synchronise dans l'effet pour
  // rester pur pendant le rendu.
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // « 12 oct. » en français, « 12 Oct » en anglais, « 12 أكتوبر » en arabe :
  // le mois du calendrier ne peut pas rester fige en OCT.
  const dayFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
  // Les bornes de drop sont stockees en `YYYY-MM-DD` : il faut completer
  // l'heure pour un parsing UTC fiable (`new Date('2026-10-06Z')` est invalide).
  const formatDate = (iso: string) => {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? `${iso}T00:00:00Z`
      : iso;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? '—' : dayFormatter.format(date);
  };

  const countdown =
    featured?.countdownMs && now ? splitDuration(featured.countdownMs - now) : null;
  const countdownLabel = featured?.status === 'live' ? t('endsIn') : t('releasesIn');

  return (
    <div style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      {/* Introduction — bandeau sombre */}
      <header style={{ background: '#151515' }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-5 pt-10.5 pb-9.5 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: Q2M.accent }}
            >
              {t('route')}
            </span>
            <Link
              href={{ pathname: '/', hash: 'newsletter' }}
              className="group q2m-btn-primary q2m-btn-sm shrink-0"
            >
              {t('enableAlerts')}
              <ArrowUpRight
                size={13}
                strokeWidth={1.5}
                className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
              />
            </Link>
          </div>
          <h1
            className="text-[clamp(34px,5vw,68px)] font-black uppercase leading-[0.95] tracking-[-0.01em]"
            style={{ color: '#FFFFFF', maxWidth: 920 }}
          >
            {t('heroTitle')}
          </h1>
          <p className="text-base leading-[1.55]" style={{ color: '#AAA59C', maxWidth: 700 }}>
            {t('heroLead')}
          </p>
        </div>
      </header>

      {featured ? (
        <section>
          <div className="mx-auto max-w-[1440px] px-5 pb-10.5 sm:px-10 lg:px-14">
            <div
              className="relative flex flex-col gap-6 overflow-hidden lg:flex-row lg:items-end lg:gap-10"
              style={{
                background: Q2M.bgDark,
                borderRadius: 12,
                padding: 'clamp(24px,4.5vw,54px)',
              }}
            >
              <div className="flex flex-1 flex-col gap-4">
                <span
                  className="w-fit px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ ...STATUS_TONES[featured.status], borderRadius: 999 }}
                >
                  {t(STATUS_KEYS[featured.status])}
                </span>
                <h2
                  className="text-[clamp(28px,3.4vw,46px)] font-black uppercase leading-[0.94] tracking-[-0.02em]"
                  style={{ color: '#FFFFFF' }}
                >
                  {featured.product.name}
                </h2>
                <p className="text-sm leading-[1.6]" style={{ color: '#AAA59C', maxWidth: 460 }}>
                  {t('featuredLead')}
                </p>
                <div className="flex items-center gap-6 pt-1">
                  <span className="text-xl font-black tabular-nums" style={{ color: '#FFFFFF' }}>
                    {formatCurrency(featured.product.price, locale)}
                  </span>
                  <Link
                    href={
                      featured.status === 'live'
                        ? `/product/${featured.product.slug}`
                        : { pathname: '/', hash: 'newsletter' }
                    }
                    className="group q2m-btn-primary shrink-0"
                  >
                    {featured.status === 'live' ? t('details') : t('notifyMe')}
                    <ArrowUpRight
                      size={14}
                      strokeWidth={1.5}
                      className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
                    />
                  </Link>
                </div>
              </div>

              {featured.product.images[0] ? (
                <div className="relative min-h-[220px] w-full flex-1 lg:min-h-[320px]">
                  <Image
                    src={featured.product.images[0]}
                    alt={featured.product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative min-h-[220px] w-full flex-1 lg:min-h-[320px]">
                  <Image
                    src={Q2M_BRAND_IMAGES.dropClassic}
                    alt="Q2M"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            {/* Compte à rebours réel (fin de vente ou lancement) */}
            {countdown && (
              <div className="flex gap-2 pt-3">
                <span
                  className="mr-3 self-center text-[10px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ color: Q2M.inkMute }}
                >
                  {countdownLabel}
                </span>
                {[
                  [countdown.days, t('daysLong')],
                  [countdown.hours, t('hoursLong')],
                  [countdown.minutes, t('minutesLong')],
                  [countdown.seconds, t('secondsLong')],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="flex h-16 flex-1 max-w-[120px] flex-col items-center justify-center gap-1"
                    style={{ background: Q2M.bgElevated, borderRadius: 8 }}
                  >
                    <span className="text-xl font-black tabular-nums" style={{ color: Q2M.ink }}>
                      {String(value).padStart(2, '0')}
                    </span>
                    <span className="text-xs" style={{ color: Q2M.inkMute }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section style={{ background: '#151515' }}>
          <div className="mx-auto max-w-[1440px] px-5 pb-10.5 sm:px-10 lg:px-14">
            <div
              className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between"
              style={{ background: Q2M.bgDark, borderRadius: 12, padding: 'clamp(24px,4vw,48px)' }}
            >
              <p className="text-sm leading-[1.6]" style={{ color: '#AAA59C', maxWidth: 520 }}>
                {t('calendarEmpty')}
              </p>
              <Link
                href={{ pathname: '/', hash: 'newsletter' }}
                className="q2m-btn-primary shrink-0"
              >
                {t('enableAlerts')}
                <ArrowUpRight size={14} strokeWidth={1.5} className="rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Calendrier — lignes empilées, fond blanc, bordure 1px */}
      <section>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 sm:px-10 lg:px-14">
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
            {calendar.map((row) => (
              <motion.div
                key={row.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45 }}
                className="flex flex-col gap-4 px-4.5 py-5 lg:flex-row lg:items-center lg:gap-6"
                style={{ background: Q2M.bgElevated, border: `1px solid ${Q2M.line}` }}
              >
                <span
                  className="w-[110px] shrink-0 text-xs font-black tabular-nums"
                  style={{ color: Q2M.ink }}
                >
                  {row.date ? formatDate(row.date) : '—'}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-base font-bold" style={{ color: Q2M.ink }}>
                    {row.name}
                  </span>
                  <span className="w-[130px] text-xs" style={{ color: Q2M.inkMute }}>
                    {t('pairs', { count: row.quantity })}
                  </span>
                </div>
                <span
                  className="w-fit px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ ...STATUS_TONES[row.status], borderRadius: 999 }}
                >
                  {t(STATUS_KEYS[row.status])}
                </span>
                <Link
                  href={`/product/${row.slug}`}
                  className="q2m-btn-ghost q2m-btn-sm shrink-0 self-start lg:self-auto"
                >
                  {t('details')}
                  <ArrowUpRight size={13} strokeWidth={1.5} className="rtl:-scale-x-100" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Archives — fond beige */}
      {archives.length > 0 && (
        <section style={{ background: Q2M.bone }}>
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6.5 px-5 py-12.5 sm:px-10 lg:px-14">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-col gap-2">
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
                className="group inline-flex shrink-0 items-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-[var(--q2m-accent-text)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
                style={{ color: Q2M.ink }}
              >
                {t('viewAllDrops')}
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.5}
                  className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
                />
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