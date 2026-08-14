import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearActiveVaultSession } from '../vault/vaultService.js'

// ---------------------------------------------------------------------------
// SECURITY NOTE — Why we do NOT use localStorage for the JWT
// ---------------------------------------------------------------------------
// Storing a bearer token in localStorage (or sessionStorage) exposes it to any
// JavaScript running on this origin, including injected code from a compromised
// dependency (XSS). A stolen token can be replayed from any machine until it
// expires.
//
// We store the token exclusively in React state (module-level memory). It is
// never written to any Web Storage, cookie, or IndexedDB key. Consequences:
//   • The token is lost on page refresh or tab close → user must re-login.
//   • The token cannot be read by any script outside this React tree.
// This is the correct trade-off for a security-focused vault product and mirrors
// how browser-based password managers (e.g. Bitwarden web vault) behave.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Legacy clean-up
// ---------------------------------------------------------------------------
// An earlier version of AuthContext persisted the JWT under this key.
// We wipe it unconditionally on every page load so old sessions can't linger.
const LEGACY_STORAGE_KEY = 'vault_access_token'
if (typeof window !== 'undefined') {
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/**
 * Parse the numeric `exp` claim from a JWT without verifying the signature.
 * Verification is the backend's responsibility; we only need the value to
 * schedule client-side expiry checks.
 * Returns a Date, or null if the token is malformed.
 */
function parseExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (typeof payload.exp !== 'number') return null
    return new Date(payload.exp * 1000) // JWT exp is in seconds
  } catch {
    return null
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Token lives only in React state. Never written to any persistent storage.
  const [accessToken, setAccessToken] = useState(null)
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null) // Date | null

  const expiryTimerRef = useRef(null)

  // ------------------------------------------------------------------
  // Token expiry enforcement
  // ------------------------------------------------------------------
  // We use two complementary mechanisms:
  //
  //  1. setTimeout — fires once, ~at expiry time.
  //  2. visibilitychange + focus — backstop for tabs that were sleeping
  //     (browsers throttle/suspend timers in backgrounded tabs; a user
  //     returning to a tab after hours would otherwise find the vault
  //     still open on an expired token).
  //
  // Both paths call the same handleExpiry() function.
  // ------------------------------------------------------------------

  const handleExpiry = useCallback(() => {
    // Clear the vault session — this mirrors lockVault() without the navigate
    // (navigation is handled by the RequireAuth guard reacting to accessToken === null)
    clearActiveVaultSession()
    setAccessToken(null)
    setTokenExpiresAt(null)
  }, [])

  const scheduleExpiryTimer = useCallback((expiresAt) => {
    clearTimeout(expiryTimerRef.current)
    if (!expiresAt) return

    const msUntilExpiry = expiresAt.getTime() - Date.now()
    if (msUntilExpiry <= 0) {
      // Already expired (e.g., received an old token somehow)
      handleExpiry()
      return
    }
    expiryTimerRef.current = window.setTimeout(handleExpiry, msUntilExpiry)
  }, [handleExpiry])

  // Visibility / focus backstop — check token freshness whenever the tab
  // becomes visible or focused, guarding against timer throttling.
  useEffect(() => {
    const checkExpiry = () => {
      if (tokenExpiresAt && Date.now() >= tokenExpiresAt.getTime()) {
        handleExpiry()
      }
    }

    document.addEventListener('visibilitychange', checkExpiry)
    window.addEventListener('focus', checkExpiry)
    return () => {
      document.removeEventListener('visibilitychange', checkExpiry)
      window.removeEventListener('focus', checkExpiry)
    }
  }, [tokenExpiresAt, handleExpiry])

  // Cancel timer on unmount
  useEffect(() => () => clearTimeout(expiryTimerRef.current), [])

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const login = useCallback((token) => {
    const expiresAt = parseExpiry(token)
    setAccessToken(token)
    setTokenExpiresAt(expiresAt)
    scheduleExpiryTimer(expiresAt)
  }, [scheduleExpiryTimer])

  const logout = useCallback(() => {
    clearTimeout(expiryTimerRef.current)
    clearActiveVaultSession() // Lock the vault too — logout = full session wipe
    setAccessToken(null)
    setTokenExpiresAt(null)
  }, [])

  const value = useMemo(() => ({
    accessToken,
    tokenExpiresAt,
    isAuthenticated: Boolean(accessToken),
    login,
    logout,
  }), [accessToken, tokenExpiresAt, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
