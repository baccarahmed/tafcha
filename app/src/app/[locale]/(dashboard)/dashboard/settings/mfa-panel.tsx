'use client'

import { useEffect, useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Q2M } from '@/lib/q2m-tokens'
import {
  confirmMfaSetup,
  disableMfa,
  startMfaSetup,
  type MfaActionState,
  type MfaErrorCode,
  type MfaSetupState,
} from '@/app/actions/mfa'

const ERROR_KEYS: Record<NonNullable<MfaErrorCode>, string> = {
  forbidden: 'errForbidden',
  invalid: 'errInvalid',
  rateLimited: 'errRateLimited',
  noSecret: 'errSetup',
}

function AlertError({ code }: { code: NonNullable<MfaErrorCode> }) {
  const t = useTranslations('mfa')
  return (
    <p
      role="alert"
      className="border px-4 py-3 text-xs font-semibold"
      style={{ borderColor: Q2M.alert, color: Q2M.alert }}
    >
      {t(ERROR_KEYS[code])}
    </p>
  )
}

function InlineSubmit({ labelKey, pendingKey }: { labelKey: string; pendingKey: string }) {
  const { pending } = useFormStatus()
  const t = useTranslations('mfa')
  return (
    <button
      type="submit"
      disabled={pending}
      className="q2m-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(pendingKey) : t(labelKey)}
    </button>
  )
}

const INITIAL: MfaActionState = { error: null }

/**
 * Panneau 2FA du back-office (VULN-001) :
 *  - inactif → generer la clé (affichee uniquement ici) puis confirmer un
 *    code pour activer ;
 *  - actif → badge + desactivation exigeant un code TOTP.
 * L'etat `enabled` initial vient du serveur (reglages) ; les transitions
 * passent par les server actions puis `router.refresh()` pour resynchroniser
 * la page.
 */
export default function MfaPanel({
  accountEmail,
  initialEnabled,
}: {
  accountEmail: string
  initialEnabled: boolean
}) {
  const t = useTranslations('mfa')
  const router = useRouter()

  const [setup, setSetup] = useState<MfaSetupState | null>(null)
  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState<NonNullable<MfaErrorCode> | null>(null)

  const [confirmState, confirmAction] = useActionState(confirmMfaSetup, INITIAL)
  const [disableState, disableAction] = useActionState(disableMfa, INITIAL)

  // Etat derive plutot que synchronise par effet (regle
  // react-hooks/set-state-in-effect) : une desactivation reussie gagne tant
  // que le refresh n'a pas atterri, une activation reussie prend le relais
  // ensuite. Le `key` pose sur le panneau (page reglages) remet les etats
  // d'action a zero a chaque bascule reelle du serveur, donc les deux `ok`
  // ne survivent jamais ensemble au-dela d'un aller-retour.
  const active = disableState.ok ? false : confirmState.ok ? true : initialEnabled

  // Resynchronisation serveur apres chaque transition : pas de setState ici,
  // uniquement le refresh du routeur.
  const mfaChanged = confirmState.ok === true || disableState.ok === true
  useEffect(() => {
    if (mfaChanged) router.refresh()
  }, [mfaChanged, router])

  // La desactivation efface le secret affiche : sans cela, un bloc de
  // configuration perime ressurgirait (il serait alors rejete cote serveur
  // par `noSecret`, ce qui priverait l'admin d'erreur exploitable).
  const submitDisable = (formData: FormData) => {
    setSetup(null)
    return disableAction(formData)
  }

  async function handleStart() {
    setStartBusy(true)
    setStartError(null)
    try {
      const result = await startMfaSetup()
      if (result.ok) setSetup(result)
      else setStartError(result.error ?? 'invalid')
    } catch {
      setStartError('invalid')
    } finally {
      setStartBusy(false)
    }
  }

  return (
    <section
      className="mt-8 border p-6"
      style={{ borderColor: Q2M.lineStrong, background: Q2M.bgElevated }}
    >
      <p className="q2m-eyebrow mb-2">{t('panelTitle')}</p>
      <p className="mb-5 text-sm leading-relaxed text-ink-mute">{t('panelDescription')}</p>

      {!active && !setup && (
        <div className="flex flex-col gap-3">
          {startError && <AlertError code={startError} />}
          <button
            type="button"
            onClick={handleStart}
            disabled={startBusy}
            className="q2m-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {startBusy ? t('enabling') : t('enable')}
          </button>
        </div>
      )}

      {!active && setup && setup.ok && setup.secret && (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed">{t('setupHelp')}</p>

          <div className="border p-4" style={{ borderColor: Q2M.lineStrong }}>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
              {t('secretLabel')}
            </p>
            <code className="block break-all text-sm tracking-[0.2em]">{setup.secret}</code>
            <p className="mt-2 text-[11px] text-ink-mute">
              {t('accountHint', { account: accountEmail })}
            </p>
          </div>

          <form action={confirmAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
                {t('confirmLabel')}
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
                placeholder="000000"
              />
            </label>
            {confirmState.error && <AlertError code={confirmState.error} />}
            <InlineSubmit labelKey="confirm" pendingKey="confirming" />
          </form>

          <button
            type="button"
            onClick={() => setSetup(null)}
            className="self-start text-xs font-semibold text-ink-mute underline underline-offset-4"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      {active && (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center gap-3 border px-4 py-3"
            style={{ borderColor: Q2M.lineStrong }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: Q2M.accent }}
              aria-hidden
            />
            <div>
              <p className="text-xs font-extrabold tracking-[0.12em]">{t('activeBadge')}</p>
              <p className="text-[11px] text-ink-mute">{t('activeDescription')}</p>
            </div>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-ink-mute underline underline-offset-4">
              {t('disableSummary')}
            </summary>
            <form action={submitDisable} className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold tracking-[0.16em] text-ink-mute">
                  {t('disableLabel')}
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
                  placeholder="000000"
                />
              </label>
              {disableState.error && <AlertError code={disableState.error} />}
              <InlineSubmit labelKey="disable" pendingKey="disabling" />
            </form>
          </details>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-mute">{t('lostDevice')}</p>
    </section>
  )
}
