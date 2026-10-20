'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { Q2M } from '@/lib/q2m-tokens'
import {
  verifyMfaLogin,
  type MfaActionState,
  type MfaErrorCode,
} from '@/app/actions/mfa'

const initialState: MfaActionState = { error: null }

const ERROR_KEYS: Record<NonNullable<MfaErrorCode>, string> = {
  forbidden: 'errForbidden',
  invalid: 'errInvalid',
  rateLimited: 'errRateLimited',
  noSecret: 'errSetup',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('mfa')

  return (
    <button
      type="submit"
      disabled={pending}
      className="q2m-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  )
}

export default function MfaForm({ next }: { next: string }) {
  const t = useTranslations('mfa')
  const locale = useLocale()
  const [state, formAction] = useActionState(verifyMfaLogin, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
          {t('codeLabel')}
        </span>
        <input
          type="text"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          className="q2m-input tracking-[0.4em]"
          style={{ background: Q2M.bgElevated }}
          placeholder="000000"
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
