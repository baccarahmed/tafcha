import { Skeleton } from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/components/storefront/product-card-skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function ShopLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <header className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-5 pt-10.5 pb-9.5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-24 rounded-sm" />
        </div>
        <Skeleton className="h-[clamp(34px,5vw,68px)] w-full max-w-[560px] rounded-sm" />
        <Skeleton className="h-4 w-full max-w-[700px] rounded-sm" />
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pb-16 sm:px-10 lg:flex-row lg:px-14">
        <aside className="hidden w-full shrink-0 flex-col gap-6 lg:flex lg:w-[250px]">
          <Skeleton className="h-6 w-28 rounded-sm" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2.5 border-b pb-[18px]"
              style={{ borderColor: Q2M.line }}
            >
              <Skeleton className="h-2.5 w-20 rounded-sm" />
              <Skeleton className="h-3 w-full rounded-sm" />
              <Skeleton className="h-3 w-4/5 rounded-sm" />
            </div>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <div className="flex w-full flex-col gap-1.75 sm:w-[230px]">
              <Skeleton className="h-2.5 w-16 rounded-sm" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 md:gap-x-[18px]">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
