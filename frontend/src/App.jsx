import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UnlockPage } from './pages/UnlockPage.jsx'
import { VaultPage } from './pages/VaultPage.jsx'
import { getActiveVaultSession, initializeOrUnlockVault, lockVault } from './vault/vaultService.js'

/**
 * App — route-aware shell for the original unlock/lock flow.
 *
 * The existing lock callback now flows through the router so the vault
 * page can call the original lockVault() logic and return to UnlockPage.
 */
export default function App() {
  const [unlockError, setUnlockError] = useState('')
  const autoLockTimerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isVaultView = location.pathname === '/vault'

  const handleLock = async () => {
    await lockVault()
    clearTimeout(autoLockTimerRef.current)
    navigate('/unlock')
  }

  const handleUnlock = async (password) => {
    setUnlockError('')
    try {
      const result = await initializeOrUnlockVault(password)
      if (!result.ok) {
        setUnlockError('Incorrect master password. Please try again.')
        return
      }
      navigate('/vault')
    } catch (error) {
      console.error('Unlock failed:', error)
      setUnlockError('Unable to unlock the vault right now.')
    }
  }

  useEffect(() => {
    if (!isVaultView) {
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
  }, [isVaultView])

  return (
    <div className="h-full">
      {isVaultView ? (
        <VaultPage onLock={handleLock} />
      ) : (
        <UnlockPage onUnlock={handleUnlock} error={unlockError} />
      )}
    </div>
  )
}
