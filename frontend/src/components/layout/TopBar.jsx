/**
 * Top application bar for the vault main view.
 *
 * Props:
 *   onMenuToggle   — called when the hamburger menu button is clicked (mobile only)
 *   searchValue    — current value of the search input
 *   onSearchChange — called when the search input changes
 */
export function TopBar({ onMenuToggle, searchValue, onSearchChange }) {
  return (
    <header
      className="h-12 flex items-center justify-between gap-4 px-container-padding border-b border-outline-variant bg-surface-container-lowest shrink-0 z-20"
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
            className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none"
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
                       transition-colors duration-150"
          />
        </div>
      </div>

      {/* ── Right: sync status + actions ─────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Sync status badge (hidden on small screens to save space) */}
        <div
          className="hidden sm:flex items-center gap-1.5 text-primary"
          title="Stored locally on this device"
          aria-label="Vault available offline"
        >
          <span className="w-2 h-2 rounded-full bg-primary block" aria-hidden="true" />
          <span className="text-label-md font-medium">Available Offline</span>
        </div>

        <button id="topbar-sync-btn" className="btn-icon" aria-label="Sync vault" title="Sync vault" disabled>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sync</span>
        </button>

        <button id="topbar-account-btn" className="btn-icon cursor-not-allowed opacity-60" aria-label="Account settings" title="Accounts are not available in Stage 1" type="button">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">account_circle</span>
        </button>
      </div>
    </header>
  )
}
