import { useEffect, useRef, useState } from 'react'
import { UnlockPage } from './pages/UnlockPage.jsx'
import { VaultPage } from './pages/VaultPage.jsx'
import { clearActiveVaultSession, getActiveVaultSession, initializeOrUnlockVault, lockVault } from './vault/vaultService.js'

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
  const [unlockError, setUnlockError] = useState('')
  const autoLockTimerRef = useRef(null)

  const handleLock = async () => {
    await lockVault()
    clearTimeout(autoLockTimerRef.current)
    setView('locked')
  }

  const handleUnlock = async (password) => {
    setUnlockError('')
    try {
      const result = await initializeOrUnlockVault(password)
      if (!result.ok) {
        setUnlockError('Incorrect master password. Please try again.')
        return
      }
      setView('unlocked')
    } catch (error) {
      console.error('Unlock failed:', error)
      setUnlockError('Unable to unlock the vault right now.')
    }
  }

  useEffect(() => {
    if (view !== 'unlocked') {
      clearTimeout(autoLockTimerRef.current)
      return
    }

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
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer))

    return () => {
      clearTimeout(autoLockTimerRef.current)
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [view])

  return (
    <div className="h-full">
      {view === 'locked' ? (
        <UnlockPage onUnlock={handleUnlock} error={unlockError} />
      ) : (
        <VaultPage onLock={handleLock} />
      )}
    </div>
  )
}
