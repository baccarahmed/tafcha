import { Skeleton } from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/components/storefront/product-card-skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function DropsLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <header style={{ background: '#151515' }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-5 pt-10.5 pb-9.5 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-9 w-36 rounded" />
          </div>
          <Skeleton className="h-[clamp(34px,5vw,68px)] w-full max-w-[560px] rounded-sm" />
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-10 lg:px-14">
        <Skeleton className="h-[320px] w-full rounded lg:h-[420px]" />

        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4 lg:gap-x-[18px]">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </main>
  )
}
