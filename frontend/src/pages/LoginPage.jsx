import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Please enter an email address.')
      return
    }

    if (!password.trim()) {
      setError('Please enter a password.')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await loginUser(email, password)
      login(data.access_token)
      setSuccess('Login successful. Your session is ready.')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl border border-outline-variant/50 bg-surface-container p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest" aria-hidden="true">
            <span className="material-symbols-outlined text-primary text-[24px]">lock_open</span>
          </div>
          <h1 className="text-headline-lg text-on-surface">Sign in to Vault</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">Enter your credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
          />

          <Input
            id="login-password"
            label="Password"
            placeholder="Enter your password"
            showToggle
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-7 text-center">
          <button
            type="button"
            className="text-label-md text-primary hover:underline underline-offset-4"
            onClick={() => navigate('/register')}
          >
            Need an account? Create one
          </button>
        </div>
      </div>
    </div>
  )
}
