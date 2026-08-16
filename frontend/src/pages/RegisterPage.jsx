import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { deriveAuthValue } from '../vault/vaultService.js'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordValidationMessage(password) {
  if (!password) {
    return 'Please enter a password.'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  return ''
}

function getFriendlyErrorMessage(error) {
  const message = error?.message || ''

  if (message.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.'
  }

  if (message.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }

  return 'We could not create your account right now. Please try again.'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false })

  const emailError = useMemo(() => {
    if (!email.trim()) {
      return 'Please enter an email address.'
    }

    if (!emailRegex.test(email.trim().toLowerCase())) {
      return 'Please enter a valid email address.'
    }

    return ''
  }, [email])

  const passwordError = useMemo(() => getPasswordValidationMessage(password), [password])

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) {
      return 'Please confirm your password.'
    }

    if (password && password !== confirmPassword) {
      return 'Passwords do not match.'
    }

    return ''
  }, [confirmPassword, password])

  // Field errors only surface once the user has interacted with the field (blur)
  // or attempted to submit — never on initial mount.
  const markTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  const visibleError = (field, message) => (hasSubmitted || touched[field]) ? message : ''

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setHasSubmitted(true)

    if (emailError) {
      setError(emailError)
      return
    }

    if (passwordError) {
      setError(passwordError)
      return
    }

    if (confirmPasswordError) {
      setError(confirmPasswordError)
      return
    }

    setIsSubmitting(true)

    const emailTrimmed = email.trim()

    try {
      const authValue = await deriveAuthValue(password, emailTrimmed)
      await registerUser(emailTrimmed, authValue)

      // Success — no automatic login. Send the user straight to the login page
      // with the email pre-filled and a persistent notice (via route state).
      navigate('/login', {
        replace: true,
        state: { email: emailTrimmed, message: 'Account created. Please sign in.' },
      })
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl border border-outline-variant/50 bg-surface-container p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest" aria-hidden="true">
            <span className="material-symbols-outlined text-primary text-[24px]">person_add</span>
          </div>
          <h1 className="text-headline-lg text-on-surface">Create your account</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">Register to continue with Vault.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="register-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={markTouched('email')}
            error={visibleError('email', emailError)}
            autoComplete="email"
            autoFocus
          />

          <Input
            id="register-password"
            label="Password"
            placeholder="Enter your password"
            showToggle
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={markTouched('password')}
            error={visibleError('password', passwordError)}
            autoComplete="new-password"
          />

          <Input
            id="register-confirm-password"
            label="Confirm Password"
            placeholder="Repeat your password"
            showToggle
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={markTouched('confirmPassword')}
            error={visibleError('confirmPassword', confirmPasswordError)}
            autoComplete="new-password"
          />

          {error && (
            <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full py-3 text-body-md" loading={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="mt-7 text-center">
          <button
            type="button"
            className="text-label-md text-primary hover:underline underline-offset-4"
            onClick={() => navigate('/login')}
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
