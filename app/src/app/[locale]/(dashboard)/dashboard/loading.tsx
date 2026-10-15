import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Hauteurs fixes des 14 barres : un profil plausible sans aleatoire. */
const BAR_HEIGHTS = [22, 38, 15, 56, 44, 30, 68, 52, 25, 61, 47, 33, 72, 40]

function KpiCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <Skeleton className="h-3 w-20 rounded-sm" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-24 rounded-sm" />
      </CardContent>
    </Card>
  )
}

function ListCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28 rounded-sm" />
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-[var(--q2m-line-soft)]">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32 rounded-sm" />
                <Skeleton className="h-3 w-20 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCard key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-4 w-28 rounded-sm" />
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {BAR_HEIGHTS.map((height, index) => (
                <div key={index} className="flex h-full flex-1 items-end">
                  <Skeleton className="w-full rounded-t-sm" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              {BAR_HEIGHTS.map((_, index) => (
                <div key={index} className="flex-1 text-center">
                  {index % 4 === 0 && <Skeleton className="mx-auto h-2.5 w-8 rounded-sm" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28 rounded-sm" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-3.5 w-8 rounded-sm" />
              </div>
            ))}
            <div className="pt-4">
              <Skeleton className="h-1.5 w-full rounded-sm" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard />
        <ListCard />
      </div>
    </div>
  )
}
