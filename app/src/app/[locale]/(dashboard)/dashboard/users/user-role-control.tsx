'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Shield, ShieldOff } from 'lucide-react'
import { setUserRoleAction } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Bascule du role d'un compte.
 *
 * Deux gardes coter serveur : impossible de se retirer ses propres droits, et
 * impossible de retrograder le dernier administrateur. Le composant se contente
 * donc de traduire le refus, l'action reste seule jugee de ce qui est permis.
 */
export default function UserRoleControl({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string
  isAdmin: boolean
  isSelf: boolean
}) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggle() {
    setError(null)

    startTransition(async () => {
      const result = await setUserRoleAction(
        userId,
        isAdmin ? 'CUSTOMER' : 'ADMIN'
      )

      if (!result.ok) {
        setError(result.field)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    })
  }

  const label = isAdmin ? t('role') : t('customer')

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          'uppercase',
          isAdmin
            ? 'border-[var(--q2m-accent)] bg-[var(--q2m-accent)]/10 text-[var(--q2m-accent-text)]'
            : 'border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]'
        )}
      >
        {label}
        {isSelf && ` · ${t('you')}`}
      </Badge>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={pending || isSelf}
        onClick={toggle}
        title={isSelf ? t('cannotChangeOwnRole') : isAdmin ? t('revokeAdmin') : t('grantAdmin')}
        aria-label={isAdmin ? t('revokeAdmin') : t('grantAdmin')}
        className={cn(
          'h-7 w-7 text-[var(--q2m-ink-stone)]',
          isAdmin
            ? 'hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)]'
            : 'hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent-text)]'
        )}
      >
        {isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
      </Button>

      {saved && (
        <Check className="h-3.5 w-3.5 text-[var(--q2m-status-open)]" />
      )}

      {error && (
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--q2m-alert)]">
          <AlertCircle className="h-3 w-3" />
          {t(`manageError_${error}`)}
        </span>
      )}
    </div>
  )
}