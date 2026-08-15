import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { deriveAuthValue, initializeOrUnlockVault } from '../vault/vaultService.js'
/**
 * LoginPage — Unified auth and vault unlock flow.
 *
 * The user enters their email and password.
 * 1. An authValue is derived from the password + email.
 * 2. authValue is sent to the backend for account login.
 * 3. On success, the raw password is used to derive the local vault key.
 * 
 * ZERO-KNOWLEDGE NOTE: Only the derived authValue reaches the network.
 * The raw password is NEVER sent to any endpoint. A backend breach exposing
 * the authValue hash cannot be used to reconstruct the vault key.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter an email address.')
      return
    }

    if (!password.trim()) {
      setError('Please enter your password.')
      return
    }

    setIsSubmitting(true)
    try {
      const emailTrimmed = email.trim()
      const authValue = await deriveAuthValue(password, emailTrimmed)
      const data = await loginUser(emailTrimmed, authValue)
      
      login(data.access_token)
      
      const vaultResult = await initializeOrUnlockVault(password, emailTrimmed)
      if (!vaultResult?.ok) {
        throw new Error('Account login succeeded, but vault unlock failed. Please try again or use the unlock screen.')
      }

      navigate('/vault', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left brand pane (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container dark:bg-[#141820] relative flex-col justify-between overflow-hidden">
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
              <h2 className="text-[50px] font-semibold leading-tight text-on-surface dark:text-[#e4e8f5] tracking-tight mb-5">
                Your digital life,<br />secured.
              </h2>
              <p className="text-body-lg text-on-surface-variant dark:text-[#a0aec0] leading-relaxed max-w-[30rem]">
                Precision-engineered encryption for the modern professional. Access your sensitive data,
                secure notes, and credentials within an isolated, zero-knowledge environment.
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
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi_off</span>
              <span className="text-label-md">Works Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form pane ──────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 bg-surface-container-lowest dark:bg-[#0f1117] flex items-center justify-center p-8 lg:px-10 relative">
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
            <h1 className="text-headline-lg text-on-surface dark:text-[#e4e8f5] mb-2">Sign in to Vault</h1>
            <p className="text-body-md text-on-surface-variant dark:text-[#a0aec0]">
              Enter your account credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="login-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />

            <Input
              id="login-password"
              label="Password"
              placeholder="Enter your password"
              showToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
              id="login-submit-btn"
              type="submit"
              variant="primary"
              className="w-full py-3 text-body-md"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-7 text-center">
            <button
              type="button"
              className="text-label-md text-primary hover:underline underline-offset-4 transition-colors"
              onClick={() => navigate('/register')}
            >
              New to Vault?{' '}
              <span className="font-medium">Create your account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
