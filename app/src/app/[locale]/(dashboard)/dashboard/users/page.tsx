import { getLocale, getTranslations } from 'next-intl/server'
import { Shield, UserRound } from 'lucide-react'
import { getAdminUsers } from '@/lib/admin-data'
import { getSessionUser } from '@/lib/session'
import { formatCurrency } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import UserRoleControl from './user-role-control'

export default async function DashboardUsersPage() {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const [users, session] = await Promise.all([getAdminUsers(), getSessionUser()])

  const admins = users.filter((user) => user.role === 'ADMIN')
  const lifetimeValue = users.reduce((sum, user) => sum + user.spent, 0)

  const cards = [
    { label: t('totalUsers'), value: String(users.length), icon: UserRound },
    { label: t('administrators'), value: String(admins.length), icon: Shield },
    { label: t('lifetimeValue'), value: money(lifetimeValue), icon: UserRound },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-[var(--q2m-line-soft)]">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-[var(--q2m-ink-stone)]" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[var(--q2m-line-soft)]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('users')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
              {t('noUsers')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users')}</TableHead>
                    <TableHead>{t('joined')}</TableHead>
                    <TableHead className="text-end">{t('orders')}</TableHead>
                    <TableHead className="text-end">{t('spent')}</TableHead>
                    <TableHead className="text-end">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-[var(--q2m-bone)] text-xs font-semibold text-[var(--q2m-ink-soft)]">
                            <AvatarFallback>
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-[var(--q2m-ink)]">
                              {user.name || user.email}
                            </span>
                            <span className="block truncate text-xs text-[var(--q2m-ink-stone)]">
                              {user.email}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                        {user.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-end text-sm tabular-nums text-[var(--q2m-ink-soft)]">
                        {user.orders}
                      </TableCell>
                      <TableCell className="text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                        {money(user.spent)}
                      </TableCell>
                      <TableCell>
                        <UserRoleControl
                          userId={user.id}
                          isAdmin={user.role === 'ADMIN'}
                          isSelf={user.id === session?.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}