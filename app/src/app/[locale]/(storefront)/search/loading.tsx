import { Skeleton } from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/components/storefront/product-card-skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function SearchLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 pt-24 pb-10 sm:px-10 lg:px-14">
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className="mt-4 h-12 w-1/2 max-w-[420px] rounded-sm" />
        <Skeleton className="mt-6 h-4 w-full max-w-xl rounded-sm" />
        <Skeleton className="mt-10 h-14 w-full max-w-2xl rounded" />
        <Skeleton className="mt-5 h-3 w-32 rounded-sm" />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-10 lg:px-14">
        <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-[18px]">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </main>
  )
}
