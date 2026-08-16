/**
 * Top application bar for the vault main view.
 *
 * Props:
 *   onMenuToggle   — called when the hamburger menu button is clicked (mobile only)
 *   searchValue    — current value of the search input
 *   onSearchChange — called when the search input changes
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

function parseEmail(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.email ?? null
  } catch {
    return null
  }
}

export function TopBar({ onMenuToggle, searchValue, onSearchChange }) {
  const { accessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const email = accessToken ? parseEmail(accessToken) : null

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return
    const handlePointerDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [dropdownOpen])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="h-12 flex items-center justify-between gap-4 px-container-padding border-b border-outline-variant bg-surface-container-lowest dark:bg-[#141820] dark:border-[#2a3040] shrink-0 z-20"
      role="banner"
    >
      {/* ── Left: mobile hamburger + search ──────────────────────────── */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          id="topbar-menu-btn"
          className="btn-icon md:hidden shrink-0"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">menu</span>
        </button>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <span
            className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none dark:text-[#6b7280]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="topbar-search"
            type="search"
            role="searchbox"
            aria-label="Search vault"
            placeholder="Search vault..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-bright border border-outline-variant rounded-md
                       pl-9 pr-3 py-1.5 text-body-md text-on-surface
                       placeholder:text-on-surface-variant/60
                       focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container
                       transition-colors duration-150
                       dark:bg-[#1a1f2e] dark:border-[#3a4050] dark:text-[#e4e8f5] dark:placeholder:text-[#6b7280]
                       dark:focus:border-[#1f7a8c] dark:focus:ring-[#1f7a8c]"
          />
        </div>
      </div>

      {/* ── Right: sync status + actions ─────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <button id="topbar-sync-btn" className="btn-icon" aria-label="Sync vault" title="Sync vault" disabled>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sync</span>
        </button>

        {/* ── Account / profile dropdown ───────────────────────────── */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="topbar-account-btn"
            className="btn-icon"
            aria-label="Account options"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">account_circle</span>
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_12px_30px_-16px_rgba(15,23,42,0.35)] z-50
                         dark:border-[#2a3040] dark:bg-[#141820] dark:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.7)]"
            >
              {/* Email display */}
              <div className="border-b border-outline-variant px-4 py-3 dark:border-[#2a3040]">
                <p className="text-label-md text-on-surface-variant dark:text-[#6b7280]">Signed in as</p>
                <p
                  className="mt-0.5 truncate text-body-md font-medium text-on-surface dark:text-[#e4e8f5]"
                  title={email ?? ''}
                >
                  {email ?? 'Account'}
                </p>
              </div>

              {/* Log out action */}
              <div className="p-1">
                <button
                  role="menuitem"
                  type="button"
                  id="topbar-logout-btn"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-md text-on-surface transition-colors
                             hover:bg-surface-container
                             dark:text-[#e4e8f5] dark:hover:bg-[#1e2330]
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-[#a0aec0]" aria-hidden="true">logout</span>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
