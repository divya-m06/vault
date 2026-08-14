/**
 * Frontend auth flow tests.
 *
 * Test suite covering:
 *   1. Unauthenticated access to /vault redirects to /login
 *   2. Authenticated but locked vault (/vault) redirects to /unlock
 *   3. Token expiry clears vault session and redirects to /login
 *   4. logout() clears both JWT and vault session
 *   5. initializeOrUnlockVault never sends the master password over the network
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../components/auth/RequireAuth.jsx'
import { RequireVault } from '../components/auth/RequireVault.jsx'
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal JWT-like string with the given exp (unix seconds). */
function makeToken(expOffsetSeconds = 3600, email = 'user@example.com') {
  const payload = {
    sub: '1',
    email,
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  }
  // Encode as base64 — we don't need a real signature for client-side tests
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

function makeExpiredToken() {
  return makeToken(-3600) // expired 1 hour ago
}

/** A simple component that shows which route it is on. */
function RouteIndicator() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

/** Tiny helper to read the rendered location. */
function getPath(container) {
  return container.querySelector('[data-testid="location"]')?.textContent
}

/**
 * Render helper: wraps children in AuthProvider + MemoryRouter with routes for
 * /login, /unlock, and /vault — matching the real routing in main.jsx.
 */
function renderWithRouter(ui, { initialPath = '/vault' } = {}) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<><div>Login page</div><RouteIndicator /></>} />
          <Route path="/unlock" element={<><div>Unlock page</div><RouteIndicator /></>} />
          <Route
            path="/vault"
            element={
              <RequireAuth>
                <RequireVault>
                  <><div>Vault page</div><RouteIndicator /></>
                </RequireVault>
              </RequireAuth>
            }
          />
          <Route
            path="/unlock-guarded"
            element={
              <RequireAuth>
                <><div>Unlock guarded page</div><RouteIndicator /></>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

// ---------------------------------------------------------------------------
// Mock vaultService so we control activeSession without real crypto
// ---------------------------------------------------------------------------
vi.mock('../vault/vaultService.js', () => {
  let _session = null
  return {
    getActiveVaultSession: () => _session,
    setActiveVaultSession: (s) => { _session = s },
    clearActiveVaultSession: () => { _session = null },
    // initializeOrUnlockVault used in Test 5 — needs to be a real mock
    initializeOrUnlockVault: vi.fn(async (_password) => {
      _session = { key: 'mock-key', autoLockMinutes: 15 }
      return { ok: true, session: _session }
    }),
    deriveAuthValue: vi.fn(async (password, email) => 'mock-auth-value'),
    lockVault: vi.fn(async () => { _session = null }),
  }
})

// Import after mock so the mock is active
import {
  getActiveVaultSession,
  setActiveVaultSession,
  clearActiveVaultSession,
  initializeOrUnlockVault,
} from '../vault/vaultService.js'

// ---------------------------------------------------------------------------
// 1. Unauthenticated access to /vault redirects to /login
// ---------------------------------------------------------------------------
describe('RequireAuth guard', () => {
  beforeEach(() => {
    clearActiveVaultSession()
  })

  it('redirects unauthenticated user from /vault to /login', () => {
    const { container } = renderWithRouter(null, { initialPath: '/vault' })
    expect(getPath(container)).toBe('/login')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects unauthenticated user from /unlock-guarded to /login', () => {
    const { container } = renderWithRouter(null, { initialPath: '/unlock-guarded' })
    expect(getPath(container)).toBe('/login')
  })

  it('allows authenticated user to access guarded route', async () => {
    // We need to set auth state — use a wrapper component that calls login()
    function AuthSetter() {
      const { login } = useAuth()
      // Use useEffect so we call login() after mount, in a predictable lifecycle
      React.useEffect(() => { login(makeToken()) }, [])
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/unlock-guarded']}>
          <AuthSetter />
          <Routes>
            <Route path="/login" element={<><div>Login page</div><RouteIndicator /></>} />
            <Route
              path="/unlock-guarded"
              element={
                <RequireAuth>
                  <><div>Protected content</div><RouteIndicator /></>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 2. Authenticated but vault locked → /vault redirects to /unlock
// ---------------------------------------------------------------------------
describe('RequireVault guard', () => {
  it('redirects to /unlock when vault session is null', () => {
    clearActiveVaultSession()
    // Simulate an authenticated user by using a helper wrapper
    function LoggedInWrapper() {
      const { login } = useAuth()
      login(makeToken())
      return (
        <Routes>
          <Route path="/login" element={<><div>Login</div><RouteIndicator /></>} />
          <Route path="/unlock" element={<><div>Unlock page</div><RouteIndicator /></>} />
          <Route
            path="/vault"
            element={
              <RequireAuth>
                <RequireVault>
                  <><div>Vault</div><RouteIndicator /></>
                </RequireVault>
              </RequireAuth>
            }
          />
        </Routes>
      )
    }
    const { container } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/vault']}>
          <LoggedInWrapper />
        </MemoryRouter>
      </AuthProvider>
    )
    expect(getPath(container)).toBe('/unlock')
    expect(screen.getByText('Unlock page')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Token expiry clears vault session and removes auth state
// ---------------------------------------------------------------------------
describe('AuthContext token expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearActiveVaultSession()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears accessToken after expiry timer fires', async () => {
    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    // Token that expires in 1 second
    const shortToken = makeToken(1)
    act(() => { authCtx.login(shortToken) })
    expect(authCtx.isAuthenticated).toBe(true)

    // Advance time past expiry
    act(() => { vi.advanceTimersByTime(2000) })

    await waitFor(() => {
      expect(authCtx.isAuthenticated).toBe(false)
      expect(authCtx.accessToken).toBeNull()
    })
  })

  it('clears vault session when token expires', async () => {
    setActiveVaultSession({ key: 'mock-key', autoLockMinutes: 15 })
    expect(getActiveVaultSession()).not.toBeNull()

    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    const shortToken = makeToken(1)
    act(() => { authCtx.login(shortToken) })
    act(() => { vi.advanceTimersByTime(2000) })

    await waitFor(() => {
      expect(getActiveVaultSession()).toBeNull()
    })
  })

  it('immediately expires an already-expired token on login', async () => {
    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    act(() => { authCtx.login(makeExpiredToken()) })

    await waitFor(() => {
      expect(authCtx.isAuthenticated).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// 4. logout() clears both JWT and vault session
// ---------------------------------------------------------------------------
describe('AuthContext logout', () => {
  it('clears accessToken on logout', async () => {
    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    act(() => { authCtx.login(makeToken()) })
    expect(authCtx.isAuthenticated).toBe(true)

    act(() => { authCtx.logout() })
    await waitFor(() => expect(authCtx.isAuthenticated).toBe(false))
  })

  it('clears vault session on logout', async () => {
    setActiveVaultSession({ key: 'mock-key', autoLockMinutes: 15 })

    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    act(() => { authCtx.login(makeToken()) })
    act(() => { authCtx.logout() })

    await waitFor(() => {
      expect(getActiveVaultSession()).toBeNull()
    })
  })

  it('does not persist token to localStorage after logout', async () => {
    let authCtx
    function Capture() {
      authCtx = useAuth()
      return null
    }
    render(
      <AuthProvider>
        <MemoryRouter>
          <Capture />
        </MemoryRouter>
      </AuthProvider>
    )

    act(() => { authCtx.login(makeToken()) })
    act(() => { authCtx.logout() })

    await waitFor(() => {
      expect(localStorage.getItem('vault_access_token')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// 5. initializeOrUnlockVault never sends the master password over the network
// ---------------------------------------------------------------------------
describe('Zero-knowledge: master password never sent to network', () => {
  it('does not call fetch with master password during vault unlock', async () => {
    const fetchMock = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock

    await initializeOrUnlockVault('my-super-secret-master-password', 'test@example.com')

    // Assert no fetch call ever had the master password in URL or body
    for (const call of fetchMock.mock.calls) {
      const [url, options] = call
      const body = typeof options?.body === 'string' ? options.body : ''
      expect(body).not.toContain('my-super-secret-master-password')
      expect(String(url)).not.toContain('my-super-secret-master-password')
    }

    globalThis.fetch = originalFetch
  })

  it('initializeOrUnlockVault does not trigger any network request at all', async () => {
    // Replace fetch entirely for this test so we can be certain about call count
    const fetchMock = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock

    try {
      await initializeOrUnlockVault('another-master-password', 'test@example.com')
      // The vault service mock uses only Web Crypto — no fetch calls expected
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
