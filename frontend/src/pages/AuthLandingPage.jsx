import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm.jsx'
import { RegisterForm } from '../components/auth/RegisterForm.jsx'

export function AuthLandingPage() {
  const [mode, setMode] = useState('login')

  return (
    <div className="flex min-h-screen w-full">
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

      <div className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-8 lg:px-10 relative">
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px] icon-filled" aria-hidden="true">
            shield_lock
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-primary">Vault</span>
        </div>

        <div className="w-full max-w-[460px]">
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  )
}
