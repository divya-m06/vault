import { useState } from 'react'
import { UnlockPage } from './pages/UnlockPage.jsx'
import { VaultPage } from './pages/VaultPage.jsx'

/**
 * App — root component.
 *
 * Manages the single piece of top-level state: whether the vault is
 * "unlocked" (showing the main vault view) or "locked" (showing the
 * unlock/login screen).
 *
 * Stage 0: no real auth. Clicking "Unlock Vault" switches views,
 * "Lock Vault" switches back. Real crypto comes in a later stage.
 */
export default function App() {
  const [view, setView] = useState('locked')

  return (
    <div className="h-full">
      {view === 'locked' ? (
        <UnlockPage onUnlock={() => setView('unlocked')} />
      ) : (
        <VaultPage onLock={() => setView('locked')} />
      )}
    </div>
  )
}
