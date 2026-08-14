import { Navigate } from 'react-router-dom'
import { getActiveVaultSession } from '../../vault/vaultService.js'

/**
 * RequireVault — protects routes that need an active, unlocked vault session.
 *
 * This guard sits inside RequireAuth (JWT is already verified at that layer).
 * If the user has a valid JWT but hasn't entered their master password yet —
 * or the vault was locked via auto-lock — redirect them to /unlock.
 *
 * Usage:
 *   <Route
 *     path="/vault"
 *     element={
 *       <RequireAuth>
 *         <RequireVault>
 *           <VaultPage />
 *         </RequireVault>
 *       </RequireAuth>
 *     }
 *   />
 */
export function RequireVault({ children }) {
  const session = getActiveVaultSession()

  if (!session) {
    return <Navigate to="/unlock" replace />
  }

  return children
}
