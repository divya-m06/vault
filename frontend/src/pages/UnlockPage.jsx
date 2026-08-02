import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api/auth.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { initializeOrUnlockVault } from '../vault/vaultService.js'

/**
 * Unlock / auth page — the entry point of Vault.
 *
 * Props:
 *   onUnlock — optional legacy callback for the existing App shell
 *   error — optional legacy error message to display
 */
export function UnlockPage({ onUnlock, error: externalError }) {
  const [mode, setMode] = useState('unlock')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const navigate = useNavigate()
  const { login: storeAuthToken } = useAuth()

  const resetFeedback = () => {
    setFormError('')
    setFormSuccess('')
  }

  const handleUnlockSubmit = async (e) => {
    e.preventDefault()

    if (typeof onUnlock === 'function') {
      if (!password.trim()) return
      setIsSubmitting(true)
      try {
        await onUnlock(password)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter your email and Master Password.')
      return
    }

    resetFeedback()
    setIsSubmitting(true)

    try {
      const data = await loginUser(email.trim(), password)
      storeAuthToken(data.access_token)

      const vaultResult = await initializeOrUnlockVault(password)
      if (!vaultResult?.ok) {
        throw new Error('Unable to initialize your vault securely.')
      }

      setPassword('')
      setConfirmPassword('')
      navigate('/vault')
    } catch (error) {
      setFormError(error.message || 'Unable to unlock your vault right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setFormError('Please complete all fields to create your vault.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Your Master Passwords do not match.')
      return
    }

    resetFeedback()
    setIsSubmitting(true)

    try {
      await registerUser(email.trim(), password)
      setMode('unlock')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFormSuccess('Vault created. Please unlock it with your email and Master Password.')
    } catch (error) {
      setFormError(error.message || 'Unable to create your vault right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModeSwitch = () => {
    resetFeedback()
    setMode((current) => (current === 'unlock' ? 'create' : 'unlock'))
    setPassword('')
    setConfirmPassword('')
  }

  const displayError = formError || externalError || ''

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

      {/* ── Right pane: vault form ───────────────────────────────────── */}
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
            <h1 className="text-headline-lg text-on-surface mb-2">
              {mode === 'unlock' ? 'Unlock your Vault' : 'Create your Vault'}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              {mode === 'unlock'
                ? 'Access your encrypted vault using your email and Master Password.'
                : 'Create your secure encrypted vault using a Master Password.'}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={mode === 'unlock' ? handleUnlockSubmit : handleCreateSubmit}
            className="space-y-5"
            noValidate
          >
            <Input
              id="vault-email"
              label="Email"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />

            <Input
              id="vault-master-password"
              label="Master Password"
              placeholder={mode === 'unlock' ? 'Enter your master password' : 'Choose a master password'}
              showToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'unlock' ? 'current-password' : 'new-password'}
              required
            />

            {mode === 'create' && (
              <Input
                id="vault-confirm-password"
                label="Confirm Master Password"
                placeholder="Confirm your master password"
                showToggle
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            )}

            {displayError && (
              <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container text-body-sm">
                {displayError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-lg border border-success/20 bg-success-container px-4 py-3 text-on-success-container text-body-sm">
                {formSuccess}
              </div>
            )}

            <Button
              id={mode === 'unlock' ? 'unlock-submit-btn' : 'create-submit-btn'}
              type="submit"
              variant="primary"
              className="w-full py-3 text-body-md"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {mode === 'unlock' ? 'lock_open' : 'add_circle'}
              </span>
              {isSubmitting ? (mode === 'unlock' ? 'Unlocking…' : 'Creating…') : mode === 'unlock' ? 'Unlock Vault' : 'Create Vault'}
            </Button>
          </form>

          {/* Mode switch */}
          <div className="mt-7 text-center">
            <button
              type="button"
              className="text-label-md text-primary hover:underline underline-offset-4 transition-colors"
              onClick={handleModeSwitch}
            >
              {mode === 'unlock' ? 'New to Vault?' : 'Already have a Vault?'}{' '}
              <span className="font-medium">{mode === 'unlock' ? 'Create your Vault' : 'Unlock it'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
