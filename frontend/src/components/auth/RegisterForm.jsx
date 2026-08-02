import { useMemo, useState } from 'react'
import { registerUser } from '../../api/auth.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'

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

export function RegisterForm({ onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

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

    try {
      await registerUser(email, password)
      setSuccess('Registration successful. You can now sign in.')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      onSwitchToLogin()
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
          error={emailError}
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
          error={passwordError}
          autoComplete="new-password"
        />

        <Input
          id="register-confirm-password"
          label="Confirm Password"
          placeholder="Repeat your password"
          showToggle
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={confirmPasswordError}
          autoComplete="new-password"
        />

        {error && (
          <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-body-sm text-on-error-container">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-success/20 bg-success-container px-4 py-3 text-body-sm text-on-success-container">
            {success}
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
          onClick={onSwitchToLogin}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}
