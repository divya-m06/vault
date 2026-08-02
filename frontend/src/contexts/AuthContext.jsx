import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'vault_access_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEY)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (accessToken) {
      window.localStorage.setItem(STORAGE_KEY, accessToken)
      return
    }

    window.localStorage.removeItem(STORAGE_KEY)
  }, [accessToken])

  const login = (token) => {
    setAccessToken(token)
  }

  const logout = () => {
    setAccessToken(null)
  }

  const value = useMemo(() => ({
    accessToken,
    isAuthenticated: Boolean(accessToken),
    login,
    logout,
  }), [accessToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
