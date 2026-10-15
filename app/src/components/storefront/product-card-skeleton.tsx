import { Skeleton } from '@/components/ui/skeleton'
import { Q2M } from '@/lib/q2m-tokens'

/**
 * Silhouette d'une `Q2MProductCard` : même cadre image (`319/300`), même
 * empilement de texte. Sert de placeholder pendant le rendu serveur de la
 * vitrine (shop, recherche, drops) sans déclencher de framer-motion.
 */
export function ProductCardSkeleton() {
  return (
    <div className="group relative">
      <div
        className="relative aspect-[319/300] w-full overflow-hidden border border-transparent p-3.5"
        style={{ background: Q2M.bone, borderRadius: 8 }}
      >
        <Skeleton className="h-full w-full rounded-[4px]" />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-3 w-14 rounded-sm" />
          <Skeleton className="h-4 w-12 rounded-sm" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-sm" />
        <Skeleton className="h-3.5 w-2/3 rounded-sm" />
      </div>
    </div>
  )
}

/**
 * Grille de cartes en attente. `className` permet d'aligner la grille sur la
 * page cible (shop en 3 colonnes, recherche en 4, etc.).
 */
export function ProductGridSkeleton({
  count = 6,
  className = 'grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-[18px]',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
