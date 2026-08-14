import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VaultPage } from './pages/VaultPage.jsx'
import { getActiveVaultSession, lockVault } from './vault/vaultService.js'
import { useAuth } from './contexts/AuthContext.jsx'

/**
 * VaultShell — thin wrapper rendered at /vault.
 *
 * Responsibilities:
 *   • Auto-lock the vault after N minutes of inactivity.
 *   • Provide onLock() to VaultPage, which clears both the vault
 *     session AND the JWT (full logout on manual lock).
 *
 * Route guards (RequireAuth + RequireVault in main.jsx) already ensure
 * this component only mounts when the user is authenticated and the vault
 * is unlocked. No additional auth logic lives here.
 */
export default function VaultShell() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const autoLockTimerRef = useRef(null)

  /**
   * onLock — called by VaultPage when the user clicks "Lock Vault".
   *
   * Design decision: manual lock = full logout.
   * Rationale: A lingering JWT with no vault session is an awkward half-state.
   * Requiring re-login after a manual lock is the cleaner, safer choice.
   * JWT expiry auto-lock (in AuthContext) also lands here via the same logout().
   */
  const handleLock = async () => {
    clearTimeout(autoLockTimerRef.current)
    await lockVault()
    logout() // clears JWT + vault session; navigate is driven by RequireAuth re-evaluating
    navigate('/login', { replace: true })
  }

  // Auto-lock on inactivity
  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(autoLockTimerRef.current)
      const minutes = getActiveVaultSession()?.autoLockMinutes ?? 15
      if (!Number.isFinite(minutes) || minutes <= 0) return
      autoLockTimerRef.current = window.setTimeout(() => {
        void handleLock()
      }, minutes * 60 * 1000)
    }

    resetTimer()
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer))

    return () => {
      clearTimeout(autoLockTimerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <VaultPage onLock={handleLock} />
}
