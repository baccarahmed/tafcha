import { Skeleton } from '@/components/ui/skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function CheckoutLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 pt-16 pb-8 sm:px-10 lg:px-14">
        <Skeleton className="h-3 w-20 rounded-sm" />
        <Skeleton className="mt-4 h-12 w-2/3 max-w-[420px] rounded-sm" />
      </section>

      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 pb-24 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:px-14">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-5 w-40 rounded-sm" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-2.5 w-20 rounded-sm" />
                <Skeleton className="h-11 w-full rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-2.5 w-24 rounded-sm" />
                <Skeleton className="h-11 w-full rounded" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-48 rounded" />
        </div>

        <div className="flex flex-col gap-4 border border-line p-6">
          <Skeleton className="h-5 w-32 rounded-sm" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-14 rounded-sm" />
            </div>
          ))}
          <Skeleton className="mt-2 h-px w-full rounded-none" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-6 w-1/2 rounded-sm" />
        </div>
      </section>
    </main>
  )
}
