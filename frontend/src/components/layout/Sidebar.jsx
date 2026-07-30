import { useEffect, useRef, useState } from 'react'

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
export function Sidebar({ activeItem, onNavSelect, onLock, mobileOpen = false, onMobileClose, onAddSelect }) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const addMenuRef = useRef(null)

  const handleSelect = (id) => {
    if (id === 'lock') {
      onLock?.()
    } else {
      onNavSelect(id)
    }
    onMobileClose?.()
  }

  useEffect(() => {
    if (!isAddMenuOpen) return

    const handlePointerDown = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAddMenuOpen])

  const handleAddSelect = (type) => {
    setIsAddMenuOpen(false)
    onAddSelect?.(type)
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
      <div className="px-3 pt-3 pb-1 shrink-0 relative" ref={addMenuRef}>
        <button
          id="sidebar-add-item-btn"
          className="btn-primary w-full h-9 text-label-md"
          aria-label="Add new vault item"
          aria-expanded={isAddMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsAddMenuOpen((open) => !open)}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
          Add Item
        </button>

        {isAddMenuOpen && (
          <div className="absolute left-3 right-3 top-full z-50 mt-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.35)]" role="menu" aria-label="Add to Vault">
            <div className="border-b border-outline-variant/70 px-2 pb-2 mb-1">
              <p className="text-label-md text-on-surface-variant">Add to Vault</p>
            </div>
            {[
              { id: 'password', label: 'Password', icon: 'lock' },
              { id: 'note', label: 'Secure Note', icon: 'description' },
              { id: 'file', label: 'File', icon: 'folder_open' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handleAddSelect(item.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-md text-on-surface transition-colors hover:bg-secondary-container/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
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
            disabled={item.id === 'lock'}
            className={`nav-item w-full text-left ${activeItem === item.id ? 'nav-item-active' : ''} ${item.id === 'lock' ? 'opacity-70 cursor-not-allowed' : ''}`}
            aria-current={activeItem === item.id ? 'page' : undefined}
            aria-disabled={item.id === 'lock' ? 'true' : undefined}
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
