import { getTranslations } from 'next-intl/server'
import { getAdminPromotions } from '@/lib/admin-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PromotionManager from './promotion-manager'

export default async function DashboardPromotionsPage() {
  const t = await getTranslations('dashboard')
  const promotions = await getAdminPromotions()

  return (
    <Card className="border-[var(--q2m-line-soft)]">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
          {t('promotions')}
        </CardTitle>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  )
}