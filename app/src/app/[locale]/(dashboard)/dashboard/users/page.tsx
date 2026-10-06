import { getLocale, getTranslations } from 'next-intl/server'
import { Shield, UserRound } from 'lucide-react'
import { getAdminUsers } from '@/lib/admin-data'
import { getSessionUser } from '@/lib/session'
import { formatCurrency } from '@/lib/utils'
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
          <div
            key={card.label}
            className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-[var(--q2m-ink-stone)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">{t('users')}</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-[var(--q2m-line-soft)]">
                {[t('users'), t('joined'), t('orders'), t('spent'), t('actions')].map(
                  (heading, index) => (
                    <th
                      key={heading}
                      className={`px-2 py-3 text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)] ${
                        index >= 2 && index <= 3 ? 'text-end' : 'text-start'
                      }`}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--q2m-line-soft)] last:border-b-0"
                >
                  <td className="px-2 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--q2m-bone)] text-xs font-semibold text-[var(--q2m-ink-soft)]">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--q2m-ink)]">
                          {user.name || user.email}
                        </span>
                        <span className="block truncate text-xs text-[var(--q2m-ink-stone)]">
                          {user.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3.5 text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                    {user.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-2 py-3.5 text-end text-sm tabular-nums text-[var(--q2m-ink-soft)]">
                    {user.orders}
                  </td>
                  <td className="px-2 py-3.5 text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                    {money(user.spent)}
                  </td>
                  <td className="px-2 py-3.5">
                    <UserRoleControl
                      userId={user.id}
                      isAdmin={user.role === 'ADMIN'}
                      isSelf={user.id === session?.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
            {t('noUsers')}
          </p>
        )}
      </div>
    </div>
  )
}