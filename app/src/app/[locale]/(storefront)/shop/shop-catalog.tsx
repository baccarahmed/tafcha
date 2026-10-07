'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Q2MProductCard } from '@/components/storefront/Q2MProductCard';
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens';
import { formatCurrency } from '@/lib/utils';
import type { CatalogProduct } from '@/types/catalog';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'featured';

const PAGE_SIZE = 9;

/** Gender values stored on `products.gender`. */
const GENDERS = ['homme', 'femme', 'enfant', 'unisexe'] as const;

/** Colour keys are stable slugs; labels come from translations. */
const COLORS = ['noir', 'blanc', 'beige', 'rouge', 'bleu', 'vert', 'gris'] as const;

/**
 * Each colour maps to the words that appear in a `colorway`. `colorway` is free
 * text ("Black / Safety Orange"), so the match stays a keyword lookup.
 */
const COLOR_KEYWORDS: Record<string, string[]> = {
  noir: ['black', 'noir', 'obsidian', 'shadow'],
  blanc: ['white', 'blanc', 'bone', 'chalk', 'ecru', 'off white'],
  beige: ['beige', 'sable', 'sand', 'taupe', 'khaki', 'stone', 'gum'],
  rouge: ['red', 'rouge', 'burgundy', 'bordeaux', 'crimson', 'rust'],
  bleu: ['blue', 'bleu', 'navy', 'cyan', 'teal'],
  vert: ['green', 'vert', 'volt', 'olive', 'sage', 'emerald'],
  gris: ['grey', 'gris', 'silver', 'cement', 'graphite', 'gunmetal', 'concrete'],
};

interface FilterState {
  brands: string[];
  sizes: string[];
  genders: string[];
  colors: string[];
  categories: string[];
  stockOnly: boolean;
  maxPrice: number;
}

const PRICE_STEP = 50;

const EMPTY_FILTERS: FilterState = {
  brands: [],
  sizes: [],
  genders: [],
  colors: [],
  categories: [],
  stockOnly: false,
  maxPrice: Infinity,
};

/** Case/diacritic-insensitive comparison, so "Chaîne" matches "chaine". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/** True when the product's colorway or name mentions the given colour. */
function matchesColor(product: CatalogProduct, color: string): boolean {
  const keywords = COLOR_KEYWORDS[color];
  if (!keywords) return false;
  const haystack = normalize(`${product.name} ${product.colorway}`);
  return keywords.some((word) => haystack.includes(word));
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 border-b pb-[18px]"
      style={{ borderColor: Q2M.line }}
    >
      <h3
        className="text-[10px] font-extrabold uppercase leading-[1.21]"
        style={{ color: Q2M.ink }}
      >
        {title}
      </h3>
      <div className="flex flex-col items-start gap-1">{children}</div>
    </div>
  );
}

export default function ShopCatalog({ products }: { products: CatalogProduct[] }) {
  const t = useTranslations('shop');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);

  const priceBounds = useMemo(() => {
    const prices = products.map((p) => p.price);
    const min = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
    const max = prices.length > 0 ? Math.ceil(Math.max(...prices)) : PRICE_STEP;
    return { floor: Math.floor(min / PRICE_STEP) * PRICE_STEP, ceiling: Math.ceil(max / PRICE_STEP) * PRICE_STEP };
  }, [products]);

  /**
   * Facets come from the catalogue, not from hardcoded lists: a size, colour or
   * category that no product carries is never offered, so no filter can dead-end.
   */
  const brands = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [products],
  );

  const sizes = useMemo(() => {
    const all = products.flatMap((p) => p.sizes.map((s) => Number(s.size)));
    const valid = all.filter((n) => Number.isFinite(n));
    return Array.from(new Set(valid)).sort((a, b) => a - b).map(String);
  }, [products]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      const slug = p.categorySlug;
      if (slug) map.set(slug, p.categorySlug ?? slug);
    }
    return Array.from(map.keys()).sort();
  }, [products]);

  const availableColors = useMemo(
    () => COLORS.filter((color) => products.some((p) => matchesColor(p, color))),
    [products],
  );

  const availableGenders = useMemo(() => {
    const present = new Set(products.map((p) => p.gender).filter(Boolean) as string[]);
    return GENDERS.filter((g) => present.has(g));
  }, [products]);

  // The URL is the single source of truth, so links from the nav/category grid
  // land pre-filtered and every selection is shareable.
  const filters = useMemo<FilterState>(() => {
    const list = (key: string) =>
      (searchParams?.getAll(key) ?? [])
        .flatMap((v) => v.split(','))
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

    const rawMax = Number(searchParams?.get('maxPrice'));

    return {
      brands: list('brand').filter((b) => brands.some((x) => x.toLowerCase() === b)),
      sizes: list('size').filter((s) => sizes.includes(s)),
      genders: list('gender').filter((g) => GENDERS.includes(g as never)),
      colors: list('color').filter((c) => COLORS.includes(c as never)),
      categories: list('category').filter((c) => categories.includes(c)),
      stockOnly: searchParams?.get('stock') === '1',
      maxPrice:
        Number.isFinite(rawMax) && rawMax > 0
          ? Math.min(rawMax, priceBounds.ceiling)
          : Infinity,
    };
  }, [searchParams, brands, sizes, categories, priceBounds]);

  /** Writes the next filter state to the URL and returns to page 1. */
  const commit = (next: FilterState) => {
    const params = new URLSearchParams();
    if (next.brands.length > 0) params.set('brand', next.brands.join(','));
    if (next.sizes.length > 0) params.set('size', next.sizes.join(','));
    if (next.genders.length > 0) params.set('gender', next.genders.join(','));
    if (next.colors.length > 0) params.set('color', next.colors.join(','));
    if (next.categories.length > 0) params.set('category', next.categories.join(','));
    if (next.stockOnly) params.set('stock', '1');
    if (Number.isFinite(next.maxPrice)) params.set('maxPrice', String(next.maxPrice));

    const query = params.toString();
    if (!pathname) return;
    setPage(1);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggle = <K extends 'brands' | 'sizes' | 'genders' | 'colors' | 'categories'>(
    key: K,
    value: FilterState[K][number],
  ) => {
    const list = filters[key] as unknown[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    commit({ ...filters, [key]: next } as FilterState);
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (filters.brands.length > 0 && !filters.brands.includes((p.brand ?? '').toLowerCase()))
        return false;

      if (p.price > filters.maxPrice) return false;

      if (filters.sizes.length > 0) {
        const productSizes = p.sizes.map((s) => String(s.size));
        if (!filters.sizes.some((s) => productSizes.includes(s))) return false;
      }

      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(p.categorySlug ?? '')
      )
        return false;

      // `unisexe` is a real value, so selecting "homme" excludes unisex models.
      if (filters.genders.length > 0 && !filters.genders.includes(p.gender ?? ''))
        return false;

      if (
        filters.colors.length > 0 &&
        !filters.colors.some((color) => matchesColor(p, color))
      )
        return false;

      if (filters.stockOnly && p.isSoldOut) return false;

      return true;
    });

    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'featured':
        result = [...result].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
        break;
      case 'newest':
      default:
        result = [...result].sort((a, b) => {
          if (a.isNewDrop !== b.isNewDrop) return a.isNewDrop ? -1 : 1;
          return (
            new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime()
          );
        });
    }

    return result;
  }, [products, filters, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const reset = () => {
    commit(EMPTY_FILTERS);
    setPage(1);
  };

  const sortLabels: Record<SortOption, string> = {
    newest: t('sortNewest'),
    'price-asc': t('sortPriceAsc'),
    'price-desc': t('sortPriceDesc'),
    featured: t('sortFeatured'),
  };

  const optionClass = (active: boolean) =>
    `text-[12px] leading-[1.9] transition-colors ${active ? 'font-bold' : ''}`;

  const colorLabel = (c: (typeof COLORS)[number]) => t(`color_${c}` as never);
  const genderLabel = (g: (typeof GENDERS)[number]) => t(`gender_${g}` as never);

  const hasFacets =
    brands.length > 0 ||
    sizes.length > 0 ||
    availableColors.length > 0 ||
    availableGenders.length > 0 ||
    categories.length > 0;

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      {/* Introduction — Figma layout_6NRYDU */}
      <header className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-12 pt-10.5 pb-9.5 lg:px-14">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: Q2M.accentText }}
          >
            {t('route')}
          </span>
          <span className="text-[10px] tracking-[0.16em]" style={{ color: Q2M.inkMute }}>
            {t('collection')}
          </span>
        </div>
        <h1
          className="text-[clamp(40px,5vw,68px)] font-black uppercase leading-[0.95] tracking-[-0.01em]"
          style={{ color: Q2M.ink, maxWidth: 920 }}
        >
          {t('catalogTitle')}
        </h1>
        <p className="text-base leading-[1.55]" style={{ color: Q2M.inkMute, maxWidth: 700 }}>
          {t('catalogLead')}
        </p>
      </header>

      {/* Catalogue — Figma layout_CWHGFJ (row, gap 32) */}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-12 pb-16 lg:flex-row lg:px-14">
        {hasFacets && (
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[250px]">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-extrabold leading-[1.21]"
              style={{ color: Q2M.ink }}
            >
              {t('filters')}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-[10px] tracking-[0.16em] transition-opacity hover:opacity-60"
              style={{ color: Q2M.inkMute }}
            >
              {t('clear')}
            </button>
          </div>

          {brands.length > 1 && (
            <FilterGroup title={t('filterBrand')}>
              {brands.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => toggle('brands', brand)}
                  className={optionClass(filters.brands.includes(brand.toLowerCase()))}
                  style={{ color: filters.brands.includes(brand.toLowerCase()) ? Q2M.accentText : Q2M.inkMute }}
                >
                  {brand.toUpperCase()}
                </button>
              ))}
            </FilterGroup>
          )}

          {sizes.length > 0 && (
            <FilterGroup title={t('filterSize')}>
              <div className="grid w-full grid-cols-4 gap-y-1">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggle('sizes', size)}
                    className={optionClass(filters.sizes.includes(size))}
                    style={{ color: filters.sizes.includes(size) ? Q2M.accentText : Q2M.inkMute }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {availableGenders.length > 0 && (
            <FilterGroup title={t('filterGender')}>
              {availableGenders.map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => toggle('genders', gender)}
                  className={optionClass(filters.genders.includes(gender))}
                  style={{ color: filters.genders.includes(gender) ? Q2M.accentText : Q2M.inkMute }}
                >
                  {genderLabel(gender)}
                </button>
              ))}
            </FilterGroup>
          )}

          {availableColors.length > 0 && (
            <FilterGroup title={t('filterColor')}>
              <div className="grid w-full grid-cols-3 gap-y-1">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => toggle('colors', color)}
                    className={optionClass(filters.colors.includes(color))}
                    style={{ color: filters.colors.includes(color) ? Q2M.accentText : Q2M.inkMute }}
                  >
                    {colorLabel(color)}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {categories.length > 1 && (
            <FilterGroup title={t('filterCategory')}>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggle('categories', category)}
                  className={optionClass(filters.categories.includes(category))}
                  style={{ color: filters.categories.includes(category) ? Q2M.accentText : Q2M.inkMute }}
                >
                  {t(`category_${category}` as never)}
                </button>
              ))}
            </FilterGroup>
          )}

          <FilterGroup title={t('filterPrice')}>
            <div className="flex w-full flex-col gap-2">
              <span className="text-[12px]" style={{ color: Q2M.inkMute }}>
                {t('priceRange', {
                  min: formatCurrency(priceBounds.floor, locale),
                  max: formatCurrency(
                    Number.isFinite(filters.maxPrice) ? filters.maxPrice : priceBounds.ceiling,
                    locale,
                  ),
                })}
              </span>
              <input
                type="range"
                min={priceBounds.floor}
                max={priceBounds.ceiling}
                step={PRICE_STEP}
                value={Number.isFinite(filters.maxPrice) ? filters.maxPrice : priceBounds.ceiling}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  commit({
                    ...filters,
                    maxPrice: next >= priceBounds.ceiling ? Infinity : next,
                  });
                }}
                aria-label={t('filterPrice')}
                className="w-full accent-[#C9A45C]"
              />
            </div>
          </FilterGroup>

          <FilterGroup title={t('filterStock')}>
            <button
              type="button"
              onClick={() => commit({ ...filters, stockOnly: !filters.stockOnly })}
              className={optionClass(filters.stockOnly)}
              style={{ color: filters.stockOnly ? Q2M.accentText : Q2M.inkMute }}
            >
              {t('stockOnly')}
            </button>
          </FilterGroup>
        </aside>
      )}

        {/* Résultats */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Barre de tri */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs" style={{ color: Q2M.inkMute }}>
              {t('count', { count: filtered.length })}
            </span>
            <div className="flex w-[230px] flex-col gap-1.75">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: Q2M.inkMute }}
              >
                {t('sortBy')}
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded px-3.5 pr-9 text-sm outline-none"
                  style={{
                    background: Q2M.bgElevated,
                    border: `1px solid ${Q2M.lineStrong}`,
                    color: Q2M.ink,
                  }}
                >
                  {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                    <option key={key} value={key}>
                      {sortLabels[key]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: Q2M.inkMute }}
                />
              </div>
            </div>
          </div>

          {/* Grille — 3 colonnes, gap 18px / 28px */}
          {visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 md:gap-x-[18px]">
              {visible.map((product) => (
                <Q2MProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-3 py-20 text-center"
              style={{ background: Q2M.bgElevated, borderRadius: 8 }}
            >
              <h3 className="text-2xl font-black" style={{ color: Q2M.ink }}>
                {t('noResults')}
              </h3>
              <p className="max-w-md text-sm" style={{ color: Q2M.inkMute }}>
                {t('noResultsBody')}
              </p>
              <button type="button" onClick={reset} className="q2m-btn-primary mt-2">
                {t('viewAll')}
              </button>
            </div>
          )}

          {/* Pagination — boutons 36×36 */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label={t('previousPage')}
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-9 w-9 items-center justify-center rounded transition-opacity disabled:opacity-30"
                style={{ background: Q2M.bgElevated, border: `1px solid ${Q2M.lineStrong}` }}
              >
                <ChevronLeft size={14} style={{ color: Q2M.ink }} />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="h-9 w-9 rounded text-xs transition-colors"
                  style={
                    n === currentPage
                      ? { background: Q2M.bgDark, color: '#FFFFFF', border: `1px solid ${Q2M.accent}` }
                      : { background: Q2M.bgElevated, color: Q2M.ink, border: `1px solid ${Q2M.lineStrong}` }
                  }
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label={t('nextPage')}
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="flex h-9 w-9 items-center justify-center rounded transition-opacity disabled:opacity-30"
                style={{ background: Q2M.bgElevated, border: `1px solid ${Q2M.line}` }}
              >
                <ChevronRight size={14} style={{ color: Q2M.ink }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}