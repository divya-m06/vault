import { useEffect, useState } from 'react'
import packageJson from '../../../package.json'
import { getAutoLockPreference, updateAutoLockPreference } from '../../vault/vaultService.js'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function Settings() {
  const [storageEstimate, setStorageEstimate] = useState(null)
  const [storageError, setStorageError] = useState(null)
  const [autoLockMinutes, setAutoLockMinutes] = useState(15)

  useEffect(() => {
    if (!navigator.storage?.estimate) {
      setStorageEstimate(null)
      return
    }

    navigator.storage.estimate().then((estimate) => {
      setStorageEstimate({
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      })
    }).catch(() => {
      setStorageError('Storage usage is unavailable in this browser.')
    })
  }, [])

  useEffect(() => {
    let active = true
    getAutoLockPreference().then((minutes) => {
      if (active) setAutoLockMinutes(minutes)
    })
    return () => {
      active = false
    }
  }, [])

  const appVersion = packageJson?.version ? packageJson.version : null

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-headline-md text-on-surface">Settings</h2>
        <p className="text-body-md text-on-surface-variant">Manage your local Vault preferences.</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant">Appearance</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label-md text-on-surface">Theme</p>
              <p className="text-body-sm text-on-surface-variant">Light mode is currently supported in Stage 1.</p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-label-md text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">light_mode</span>
              <span>Light</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant">Vault Behavior</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label-md text-on-surface">Auto-lock</p>
              <p className="text-body-sm text-on-surface-variant">Locks the vault after the selected period of inactivity.</p>
            </div>
            <select
              className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-label-md text-on-surface"
              value={autoLockMinutes}
              onChange={async (event) => {
                const value = Number(event.target.value)
                setAutoLockMinutes(value)
                await updateAutoLockPreference(value)
              }}
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={0}>Never</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant">Local Storage</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
            <p className="text-body-md text-on-surface">Vault data is stored locally in this browser using IndexedDB.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Available Offline</span>
              {storageEstimate ? (
                <span>• Storage used: {formatBytes(storageEstimate.used)}</span>
              ) : (
                <span>• Storage usage unavailable in this browser</span>
              )}
            </div>
            <p className="mt-3 text-body-sm text-on-surface-variant">Clearing browser site data may remove locally stored Vault data.</p>
            {storageError && (
              <p className="mt-2 text-body-sm text-on-surface-variant">{storageError}</p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant">Security</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label-md text-on-surface">Vault Encryption</p>
                <p className="text-body-sm text-on-surface-variant">Client-side AES-GCM encryption is enabled for stored records.</p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-md text-on-surface-variant">
                Enabled
              </span>
            </div>
          </div>

          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label-md text-on-surface">Master Password</p>
                <p className="text-body-sm text-on-surface-variant">The master password is used to derive the vault key locally in the browser.</p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-md text-on-surface-variant">
                Configured
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant">About Vault</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
            <p className="text-headline-sm text-on-surface">Vault</p>
            <p className="mt-1 text-body-md text-on-surface-variant">Offline-first password, notes, and file manager.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-body-sm text-on-surface-variant">
              <span>Storage: IndexedDB</span>
              <span>•</span>
              <span>Local database layer: Dexie.js</span>
              {appVersion && (
                <>
                  <span>•</span>
                  <span>Version: {appVersion}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
