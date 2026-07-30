import { useState } from 'react'
import { Sidebar } from '../components/layout/Sidebar.jsx'
import { TopBar } from '../components/layout/TopBar.jsx'

// ── Dummy data — will be replaced with real IndexedDB data in later stages ──
const DUMMY_ITEMS = [
  { id: '1', type: 'password', name: 'Company Email',          subtitle: 'jdoe@company.com',       modified: 'Today, 09:41 AM'  },
  { id: '2', type: 'note',     name: 'Server SSH Keys',        subtitle: 'Secure Note',             modified: 'Yesterday'        },
  { id: '3', type: 'card',     name: 'Corporate Amex',         subtitle: '**** **** **** 1029',     modified: 'Oct 12, 2023'     },
  { id: '4', type: 'password', name: 'AWS Production Console', subtitle: 'admin@prod.aws',          modified: 'Sep 28, 2023'     },
  { id: '5', type: 'file',     name: 'Q3 Financial Reports.pdf', subtitle: '—',                    modified: 'Sep 15, 2023'     },
]

/** Returns the Material Symbol icon name for each item type */
function itemIcon(type) {
  switch (type) {
    case 'password': return 'language'
    case 'note':     return 'description'
    case 'file':     return 'folder_open'
    case 'card':     return 'credit_card'
    default:         return 'draft'
  }
}

/** Returns a readable item type label for mobile subtitle row */
function itemTypeLabel(type) {
  switch (type) {
    case 'password': return 'Password'
    case 'note':     return 'Secure Note'
    case 'file':     return 'File'
    case 'card':     return 'Card'
    default:         return 'Item'
  }
}

/**
 * Main Vault page — "All Items" view.
 *
 * Props:
 *   onLock — Called when "Lock Vault" is selected (navigates back to unlock screen)
 *
 * Layout:
 * - Desktop (md+): fixed 240px sidebar + full-height main content
 * - Mobile:        top bar with hamburger → off-canvas sidebar drawer
 *                  + bottom navigation bar for primary nav items
 *
 * Stage 0: renders static dummy data. No CRUD, no encryption.
 */
export function VaultPage({ onLock }) {
  const [activeNav, setActiveNav] = useState('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = DUMMY_ITEMS.filter((item) => {
    const q = search.toLowerCase()
    return (
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex h-full overflow-hidden bg-surface">
      {/* Sidebar (desktop fixed / mobile drawer) */}
      <Sidebar
        activeItem={activeNav}
        onNavSelect={setActiveNav}
        onLock={onLock}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 md:ml-sidebar-width h-full overflow-hidden">
        {/* Top bar */}
        <TopBar
          onMenuToggle={() => setMobileMenuOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
        />

        {/* Content canvas */}
        <main
          id="vault-main-content"
          className="flex-1 overflow-y-auto p-container-padding"
          aria-label="Vault items"
        >
          <div className="max-w-[1200px] mx-auto">
            {/* Page heading + New Item button */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-headline-md text-on-surface">
                {activeNav === 'all'       ? 'All Items'    :
                 activeNav === 'passwords' ? 'Passwords'    :
                 activeNav === 'notes'     ? 'Secure Notes' :
                 activeNav === 'files'     ? 'Files'        : 'Settings'}
              </h2>
              <button
                id="vault-new-item-btn"
                className="btn-primary"
                aria-label="Add new vault item"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                <span className="hidden sm:inline">New Item</span>
              </button>
            </div>

            {/* Item table */}
            <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest">
              {/* Table header — hidden on mobile */}
              <div className="hidden sm:grid grid-cols-[40px_1fr_1fr_160px] gap-4 px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
                <div />
                <div className="text-label-bold text-on-surface-variant uppercase tracking-wide">Item Name</div>
                <div className="text-label-bold text-on-surface-variant uppercase tracking-wide">Username / ID</div>
                <div className="text-label-bold text-on-surface-variant uppercase tracking-wide text-right">Last Modified</div>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[40px] block mb-3 text-outline-variant" aria-hidden="true">
                    search_off
                  </span>
                  <p className="text-body-md">No items match your search.</p>
                </div>
              ) : (
                <ul role="list" aria-label="Vault items list">
                  {filtered.map((item) => (
                    <li
                      key={item.id}
                      role="listitem"
                      className="border-b border-outline-variant/60 last:border-b-0 hover:bg-secondary-container/30 transition-colors duration-100 cursor-pointer group"
                    >
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[40px_1fr_1fr_160px] gap-4 px-4 items-center h-10">
                        <span
                          className="material-symbols-outlined text-[20px] text-tertiary-container"
                          aria-hidden="true"
                        >
                          {itemIcon(item.type)}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-body-md font-medium text-on-surface truncate group-hover:text-primary-container transition-colors">
                            {item.name}
                          </span>
                          {item.type === 'note' && (
                            <span className="px-1.5 py-0.5 bg-surface-variant text-on-surface-variant rounded text-[10px] uppercase tracking-widest font-semibold shrink-0">
                              Note
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-mono-label text-on-surface-variant truncate">
                          {item.subtitle}
                        </div>
                        <div className="text-body-sm text-on-surface-variant text-right">
                          {item.modified}
                        </div>
                      </div>

                      {/* Mobile row — stacked, no table columns */}
                      <div className="sm:hidden flex items-center gap-3 px-4 py-3">
                        <span
                          className="material-symbols-outlined text-[22px] text-tertiary-container shrink-0"
                          aria-hidden="true"
                        >
                          {itemIcon(item.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-body-md font-medium text-on-surface truncate">
                            {item.name}
                          </div>
                          <div className="text-body-sm text-on-surface-variant truncate font-mono">
                            {item.subtitle !== '—' ? item.subtitle : itemTypeLabel(item.type)}
                          </div>
                        </div>
                        <div className="text-label-md text-on-surface-variant shrink-0">
                          {item.modified}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Item count footer */}
            <div className="mt-3 text-label-md text-on-surface-variant text-right" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
              {search ? ` matching "${search}"` : ''}
            </div>
          </div>
        </main>

        {/* ── Mobile bottom navigation bar ────────────────────────────── */}
        <nav
          className="md:hidden flex items-center justify-around h-14 border-t border-outline-variant bg-surface-container-lowest shrink-0"
          aria-label="Bottom navigation"
        >
          {[
            { id: 'all',       icon: 'inventory_2', label: 'All'       },
            { id: 'passwords', icon: 'lock',         label: 'Passwords' },
            { id: 'notes',     icon: 'description',  label: 'Notes'     },
            { id: 'files',     icon: 'folder_open',  label: 'Files'     },
          ].map((item) => (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => setActiveNav(item.id)}
              aria-label={item.label}
              aria-current={activeNav === item.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors
                ${activeNav === item.id
                  ? 'text-primary'
                  : 'text-on-surface-variant'
                }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={activeNav === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
