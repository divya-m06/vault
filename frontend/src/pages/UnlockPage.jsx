import { useState } from 'react'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'

/**
 * Unlock / Login page — the entry point of Vault.
 *
 * Props:
 *   onUnlock — Called when the form is submitted
 *
 * Layout:
 * - Desktop (lg+): two-column split
 *     Left  → brand + tagline + abstract background + trust badges
 *     Right → master-password form
 * - Mobile: single column (right pane only), brand logo at top
 *
 * Stage 0: submitting the form calls onUnlock() with no real validation.
 */
export function UnlockPage({ onUnlock, error }) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return
    setIsSubmitting(true)
    try {
      await onUnlock(password)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full h-full">
      {/* ── Left pane: brand + messaging (desktop only) ──────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container relative flex-col justify-between overflow-hidden">
        {/* Decorative background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 80%, rgba(31,122,140,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(169,237,255,0.15) 0%, transparent 55%),
              radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196,232,252,0.2) 0%, transparent 65%)
            `,
          }}
        />

        <div className="relative z-10 flex min-h-full flex-col px-16 pt-16 pb-12">
          {/* Brand logo */}
          <div className="flex items-center gap-3.5">
            <span
              className="material-symbols-outlined text-primary text-[40px] icon-filled"
              aria-hidden="true"
            >
              shield_lock
            </span>
            <span className="text-[26px] font-semibold tracking-tight text-primary">Vault</span>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {/* Marketing copy */}
            <div className="max-w-md">
              <h2 className="text-[50px] font-semibold leading-tight text-on-surface tracking-tight mb-5">
                Your digital life,<br />secured.
              </h2>
              <p className="text-body-lg text-on-surface-variant leading-relaxed max-w-[30rem]">
                Precision-engineered encryption for the modern professional. Access your sensitive data,
                secure notes, and credentials within an isolated, zero-knowledge environment.
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap gap-8 border-t border-outline-variant/40 pt-7 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified_user</span>
              <span className="text-label-md">End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">fingerprint</span>
              <span className="text-label-md">Zero-Knowledge Architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi_off</span>
              <span className="text-label-md">Works Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right pane: login form ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-8 lg:px-10 relative">
        {/* Mobile brand header — only visible below lg */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary text-[28px] icon-filled"
            aria-hidden="true"
          >
            shield_lock
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-primary">Vault</span>
        </div>

        {/* Form container */}
        <div className="w-full max-w-[460px]">
          {/* Heading */}
          <div className="mb-8 text-center lg:text-left">
            {/* Lock icon badge */}
            <div
              className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center mb-5 mx-auto lg:mx-0 border border-outline-variant"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-primary text-[24px]">lock_person</span>
            </div>
            <h1 className="text-headline-lg text-on-surface mb-2">Unlock your vault</h1>
            <p className="text-body-md text-on-surface-variant">
              Enter your Master Password to proceed.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="master-password"
              label="Master Password"
              placeholder="Enter your master password"
              showToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />

            {error && (
              <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container text-body-sm">
                {error}
              </div>
            )}

            <Button
              id="unlock-submit-btn"
              type="submit"
              variant="primary"
              className="w-full py-3 text-body-md"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock_open</span>
              {isSubmitting ? 'Unlocking…' : 'Unlock Vault'}
            </Button>
          </form>

          {/* Help link */}
          <div className="mt-7 text-center">
            <a
              href="#"
              className="text-label-md text-primary hover:underline underline-offset-4 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Need help accessing your vault?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
