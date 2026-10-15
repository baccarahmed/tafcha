import { Skeleton } from '@/components/ui/skeleton'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export default function ProductLoading() {
  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pt-24 pb-16 sm:px-10 lg:flex-row lg:gap-12 lg:px-14">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="hidden flex-col gap-2 lg:flex">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[94px] w-[94px] rounded" />
            ))}
          </div>
          <Skeleton className="relative min-h-[420px] flex-1 rounded lg:h-[590px]" />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4.5 lg:w-[510px]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <Skeleton className="h-10 w-4/5 rounded-sm" />
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="mt-2 h-7 w-36 rounded-sm" />
          <Skeleton className="mt-4 h-12 w-full rounded" />
          <Skeleton className="h-12 w-full rounded" />
          <Skeleton className="mt-4 h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-3/4 rounded-sm" />
        </div>
      </div>
    </main>
  )
}
