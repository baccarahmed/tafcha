import { Skeleton } from '@/components/ui/skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function AccountLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 pt-24 pb-16 sm:px-10 lg:px-14">
        <Skeleton className="h-3 w-16 rounded-sm" />
        <Skeleton className="mt-4 h-12 w-2/3 max-w-[480px] rounded-sm" />
        <Skeleton className="mt-6 h-4 w-64 rounded-sm" />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-10 lg:px-14">
        <div className="max-w-2xl border border-line">
          <div className="border-b border-line px-6 py-4">
            <Skeleton className="h-4 w-24 rounded-sm" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4 px-6 py-4">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 max-w-2xl space-y-4">
          <Skeleton className="h-6 w-40 rounded-sm" />
          <Skeleton className="h-28 w-full rounded" />
          <Skeleton className="h-28 w-full rounded" />
        </div>
      </section>
    </main>
  )
}
