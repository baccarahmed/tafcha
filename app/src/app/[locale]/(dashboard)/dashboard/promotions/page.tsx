import { getTranslations } from 'next-intl/server'
import { getAdminPromotions } from '@/lib/admin-data'
import PromotionManager from './promotion-manager'

export default async function DashboardPromotionsPage() {
  const t = await getTranslations('dashboard')
  const promotions = await getAdminPromotions()

  return (
    <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
      <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
        {t('promotions')}
      </h2>

      <div className="mt-6">
        <PromotionManager
          promotions={promotions.map((promotion) => ({
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            type: promotion.type,
            percentage: promotion.percentage,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            isActive: promotion.isActive,
            targets: promotion.targets,
            announcementText: promotion.announcementText,
          }))}
        />
      </div>
    </div>
  )
}