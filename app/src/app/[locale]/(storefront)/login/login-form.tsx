'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { Q2M } from '@/lib/q2m-tokens'
import { signIn, type AuthActionState, type AuthErrorCode } from '@/app/actions/auth'

const initialState: AuthActionState = { error: null }

const ERROR_KEYS: Record<AuthErrorCode, 'missing' | 'error'> = {
  missing: 'missing',
  invalid: 'error',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth')

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 text-xs font-extrabold tracking-[0.16em] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: Q2M.accent, color: Q2M.bg }}
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  )
}

export default function LoginForm({ next }: { next?: string | null }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [state, formAction] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
          {t('email')}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="border bg-transparent px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
          style={{ borderColor: Q2M.lineStrong }}
          placeholder={t('emailPlaceholder')}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
          {t('password')}
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="border bg-transparent px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
          style={{ borderColor: Q2M.lineStrong }}
          placeholder="••••••••"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="border px-4 py-3 text-xs font-semibold"
          style={{ borderColor: Q2M.alert, color: Q2M.alert }}
        >
          {t(ERROR_KEYS[state.error])}
        </p>
      )}

      <div className="mt-2">
        <SubmitButton />
      </div>
    </form>
  )
}