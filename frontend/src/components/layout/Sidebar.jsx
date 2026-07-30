// Navigation items shown in the main section of the sidebar
const NAV_ITEMS = [
  { id: 'all',       label: 'All Items',    icon: 'inventory_2' },
  { id: 'passwords', label: 'Passwords',    icon: 'lock'        },
  { id: 'notes',     label: 'Secure Notes', icon: 'description' },
  { id: 'files',     label: 'Files',        icon: 'folder_open' },
]

// Items pinned to the bottom of the sidebar
const FOOTER_ITEMS = [
  { id: 'settings', label: 'Settings',   icon: 'settings'  },
  { id: 'lock',     label: 'Lock Vault', icon: 'lock_open' },
]

/**
 * Sidebar navigation component.
 *
 * Props:
 *   activeItem    — id of the currently selected nav item
 *   onNavSelect   — called with the item id when a nav item is clicked
 *   onLock        — called when "Lock Vault" is clicked
 *   mobileOpen    — controls the mobile drawer visibility
 *   onMobileClose — called when the mobile backdrop is clicked
 *
 * Layout behaviour:
 *   Desktop (md+) → fixed 240px column, always visible
 *   Mobile (<md)  → off-canvas drawer that slides in over a dimmed backdrop
 */
export function Sidebar({ activeItem, onNavSelect, onLock, mobileOpen = false, onMobileClose }) {
  const handleSelect = (id) => {
    if (id === 'lock') {
      onLock?.()
    } else {
      onNavSelect(id)
    }
    onMobileClose?.()
  }

  const sidebarContent = (
    <aside className="flex flex-col h-full bg-surface-container border-r border-outline-variant w-sidebar-width">
      {/* ── Brand header ───────────────────────────────────────────── */}
      <div className="px-4 py-4 flex items-center gap-3 border-b border-outline-variant shrink-0">
        <div
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-headline-sm font-bold select-none"
        >
          V
        </div>
        <div>
          <p className="text-headline-sm text-on-surface font-semibold leading-tight">Vault</p>
          <p className="text-label-md text-on-surface-variant">Professional</p>
        </div>
      </div>

      {/* ── Add Item button ─────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <button
          id="sidebar-add-item-btn"
          className="btn-primary w-full h-9 text-label-md"
          aria-label="Add new vault item"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
          Add Item
        </button>
      </div>

      {/* ── Main navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => handleSelect(item.id)}
            className={`nav-item w-full text-left ${activeItem === item.id ? 'nav-item-active' : ''}`}
            aria-current={activeItem === item.id ? 'page' : undefined}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={activeItem === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className="text-body-md">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer navigation ──────────────────────────────────────── */}
      <div className="px-2 py-2 border-t border-outline-variant space-y-0.5 shrink-0">
        {FOOTER_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => handleSelect(item.id)}
            className="nav-item w-full text-left"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-body-md">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — fixed, always visible */}
      <div className="hidden md:flex fixed top-0 left-0 h-full z-30">
        {sidebarContent}
      </div>

      {/* Mobile drawer — conditionally rendered */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="fixed top-0 left-0 h-full z-50 md:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
