import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { initializeOrUnlockVault } from '../vault/vaultService.js'

/**
 * UnlockPage — Step 2 of the two-step auth flow.
 *
 * The user reaches this page only after a valid JWT has been obtained in
 * Step 1 (LoginPage). They now enter their Master Password, which is used
 * purely client-side to derive the AES-256-GCM key via PBKDF2.
 *
 * ZERO-KNOWLEDGE GUARANTEE: The master password typed here is NEVER sent
 * to any network endpoint. It is consumed entirely within vaultService.js
 * (Web Crypto API) and then discarded. The backend never sees it.
 *
 * After successful vault unlock, we navigate to /vault.
 */
export function UnlockPage() {
  const navigate = useNavigate()
  const { logout, accessToken } = useAuth()

  // Optionally show the account email for context, parsed from the JWT payload
  const accountEmail = (() => {
    try {
      return JSON.parse(atob(accessToken.split('.')[1]))?.email ?? null
    } catch {
      return null
    }
  })()

  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!masterPassword.trim()) {
      setError('Please enter your master password.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const vaultResult = await initializeOrUnlockVault(masterPassword, accountEmail)
      if (!vaultResult?.ok) {
        setError('Incorrect master password. Please try again.')
        return
      }
      setMasterPassword('')
      navigate('/vault', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to unlock the vault right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full h-full">
      {/* ── Left brand pane (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container relative flex-col justify-between overflow-hidden">
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
          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined text-primary text-[40px] icon-filled" aria-hidden="true">
              shield_lock
            </span>
            <span className="text-[26px] font-semibold tracking-tight text-primary">Vault</span>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-md">
              <h2 className="text-[50px] font-semibold leading-tight text-on-surface tracking-tight mb-5">
                Your digital life,<br />secured.
              </h2>
              <p className="text-body-lg text-on-surface-variant leading-relaxed max-w-[30rem]">
                Your master password never leaves this device. Only you can decrypt your vault.
              </p>
            </div>
          </div>
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
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_sync</span>
              <span className="text-label-md">Encrypted Cloud Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form pane ──────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-8 lg:px-10 relative">
        {/* Mobile brand header */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px] icon-filled" aria-hidden="true">
            shield_lock
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-primary">Vault</span>
        </div>

        <div className="w-full max-w-[460px]">
          <div className="mb-8 text-center lg:text-left">
            <div
              className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center mb-5 mx-auto lg:mx-0 border border-outline-variant"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-primary text-[24px]">lock_person</span>
            </div>
            <h1 className="text-headline-lg text-on-surface mb-2">Unlock your Vault</h1>
            {accountEmail && (
              <p className="text-body-sm text-on-surface-variant mb-1">
                Signed in as <span className="font-medium text-on-surface">{accountEmail}</span>
              </p>
            )}
            <p className="text-body-md text-on-surface-variant">
              Enter your master password to decrypt your vault.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="unlock-master-password"
              label="Master Password"
              placeholder="Enter your master password"
              showToggle
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container text-body-sm"
              >
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

          {/* Allow the user to sign out and go back to Step 1 */}
          <div className="mt-7 text-center">
            <button
              type="button"
              className="text-label-md text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
              onClick={() => {
                logout()
                // RequireAuth will now redirect to /login
              }}
            >
              Not you? Sign in with a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
