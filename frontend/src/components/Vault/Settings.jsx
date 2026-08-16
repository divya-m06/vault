import { useEffect, useState } from 'react'
import packageJson from '../../../package.json'
import { getAutoLockPreference, updateAutoLockPreference } from '../../vault/vaultService.js'
import { useTheme } from '../../contexts/ThemeContext.jsx'

export function Settings() {
  const [autoLockMinutes, setAutoLockMinutes] = useState(15)
  const { theme, setTheme } = useTheme()

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

  const themeButtonBase =
    'flex items-center gap-2 rounded-md border px-3 py-2 text-label-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-container'
  const themeButtonActive =
    'border-primary-container bg-primary-container text-on-primary dark:border-[#1f7a8c] dark:bg-[#1f3a45] dark:text-[#83d2e6]'
  const themeButtonInactive =
    'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:border-[#3a4050] dark:bg-[#1e2330] dark:text-[#a0aec0] dark:hover:bg-[#252d3d]'

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-headline-md text-on-surface dark:text-[#e4e8f5]">Settings</h2>
        <p className="text-body-md text-on-surface-variant dark:text-[#a0aec0]">Manage your Vault preferences.</p>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-[#2a3040] dark:bg-[#141820]">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant dark:text-[#6b7280]">Appearance</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <div>
              <p className="text-label-md text-on-surface dark:text-[#e4e8f5]">Theme</p>
              <p className="text-body-sm text-on-surface-variant dark:text-[#a0aec0]">Choose between light and dark mode, or follow your system setting.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="settings-theme-light"
                type="button"
                onClick={() => setTheme('light')}
                className={`${themeButtonBase} ${theme === 'light' ? themeButtonActive : themeButtonInactive}`}
                aria-pressed={theme === 'light'}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">light_mode</span>
                <span>Light</span>
              </button>
              <button
                id="settings-theme-dark"
                type="button"
                onClick={() => setTheme('dark')}
                className={`${themeButtonBase} ${theme === 'dark' ? themeButtonActive : themeButtonInactive}`}
                aria-pressed={theme === 'dark'}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">dark_mode</span>
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Vault Behavior ───────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-[#2a3040] dark:bg-[#141820]">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant dark:text-[#6b7280]">Vault Behavior</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <div>
              <p className="text-label-md text-on-surface dark:text-[#e4e8f5]">Auto-lock</p>
              <p className="text-body-sm text-on-surface-variant dark:text-[#a0aec0]">Locks the vault after the selected period of inactivity.</p>
            </div>
            <select
              className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-label-md text-on-surface dark:border-[#3a4050] dark:bg-[#1e2330] dark:text-[#e4e8f5]"
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

      {/* ── Cloud Storage ────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-[#2a3040] dark:bg-[#141820]">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant dark:text-[#6b7280]">Cloud Storage</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <p className="text-body-md text-on-surface dark:text-[#e4e8f5]">Your encrypted vault is stored securely on our servers.</p>
            <p className="mt-2 text-body-sm text-on-surface-variant dark:text-[#a0aec0]">Only you can decrypt your data: the server never sees your master password or encryption keys.</p>
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-[#2a3040] dark:bg-[#141820]">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant dark:text-[#6b7280]">Security</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label-md text-on-surface dark:text-[#e4e8f5]">Vault Encryption</p>
                <p className="text-body-sm text-on-surface-variant dark:text-[#a0aec0]">Client-side AES-GCM encryption is enabled for stored records.</p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-md text-on-surface-variant dark:border-[#3a4050] dark:bg-[#1e2330] dark:text-[#a0aec0]">
                Enabled
              </span>
            </div>
          </div>

          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label-md text-on-surface dark:text-[#e4e8f5]">Master Password</p>
                <p className="text-body-sm text-on-surface-variant dark:text-[#a0aec0]">The master password is used to derive the vault key locally in the browser.</p>
              </div>
              {/* Plain status label — not interactive */}
              <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-md text-on-surface-variant dark:border-[#3a4050] dark:bg-[#1e2330] dark:text-[#a0aec0]">
                Configured
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Vault ──────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-[#2a3040] dark:bg-[#141820]">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
          <h3 className="text-label-bold uppercase tracking-wide text-on-surface-variant dark:text-[#6b7280]">About Vault</h3>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3 dark:border-[#2a3040] dark:bg-[#1a1f2e]">
            <p className="text-headline-sm text-on-surface dark:text-[#e4e8f5]">Vault</p>
            <p className="mt-1 text-body-md text-on-surface-variant dark:text-[#a0aec0]">Cloud-synced password, notes, and file manager.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-body-sm text-on-surface-variant dark:text-[#a0aec0]">
              <span>Storage: Encrypted PostgreSQL</span>
              <span>•</span>
              <span>Client-side AES-GCM encryption</span>
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
