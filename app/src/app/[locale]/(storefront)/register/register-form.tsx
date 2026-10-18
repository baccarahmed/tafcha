'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { signUp, type AuthActionState, type AuthErrorCode } from '@/app/actions/auth'

const initialState: AuthActionState = { error: null }

const ERROR_KEYS: Record<AuthErrorCode, 'missing' | 'error' | 'exists'> = {
  missing: 'missing',
  invalid: 'error',
  exists: 'exists',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth')

  return (
    <button
      type="submit"
      disabled={pending}
      className="q2m-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t('registerSubmitting') : t('registerSubmit')}
    </button>
  )
}

export default function RegisterForm({ next }: { next: string | null }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [state, formAction] = useActionState(signUp, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            {t('firstName')}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="w-full border border-[var(--q2m-line-strong)] bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-stone focus:border-[var(--q2m-accent)] focus:outline-none"
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            {t('lastName')}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="w-full border border-[var(--q2m-line-strong)] bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-stone focus:border-[var(--q2m-accent)] focus:outline-none"
            placeholder={t('lastNamePlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-[var(--q2m-line-strong)] bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-stone focus:border-[var(--q2m-accent)] focus:outline-none"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border border-[var(--q2m-line-strong)] bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-stone focus:border-[var(--q2m-accent)] focus:outline-none"
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      {state.error && (
        <p className="border border-[var(--q2m-alert)] bg-[var(--q2m-alert-bg)] px-4 py-3 text-sm text-[var(--q2m-alert)]">
          {t(ERROR_KEYS[state.error])}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs text-ink-mute">
        {t('registerNotice')}
      </p>
    </form>
  )
}
