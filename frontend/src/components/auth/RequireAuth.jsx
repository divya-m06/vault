import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

/**
 * RequireAuth — protects routes that need a valid JWT.
 *
 * If the user has no in-memory access token, redirect them to /login.
 * We preserve the attempted path in location state so LoginPage can
 * optionally redirect back after successful auth.
 *
 * Usage:
 *   <Route path="/unlock" element={<RequireAuth><UnlockPage /></RequireAuth>} />
 */
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
