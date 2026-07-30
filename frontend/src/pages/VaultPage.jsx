import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { Sidebar } from '../components/layout/Sidebar.jsx'
import { TopBar } from '../components/layout/TopBar.jsx'
import { PasswordForm } from '../components/Vault/PasswordForm.jsx'
import { PasswordDetail } from '../components/Vault/PasswordDetail.jsx'
import { NoteForm } from '../components/Vault/NoteForm.jsx'
import { NoteDetail } from '../components/Vault/NoteDetail.jsx'
import { FileForm } from '../components/Vault/FileForm.jsx'
import { FileDetail } from '../components/Vault/FileDetail.jsx'

/** Returns the Material Symbol icon name for each item type */
function itemIcon(type) {
  switch (type) {
    case 'password': return 'language'
    case 'note':     return 'description'
    case 'file':     return 'folder_open'
    default:         return 'draft'
  }
}

/** Formats file size nicely */
function formatSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** 
 * Gets a short type description for files 
 * e.g., "application/pdf" -> "PDF"
 * "image/png" -> "PNG"
 */
function shortFileType(mimeType) {
  if (!mimeType) return 'File'
  if (mimeType.includes('/pdf')) return 'PDF'
  if (mimeType.includes('/png')) return 'PNG'
  if (mimeType.includes('/jpeg') || mimeType.includes('/jpg')) return 'JPEG'
  if (mimeType.includes('/csv')) return 'CSV'
  if (mimeType.includes('text/')) return 'Text'
  
  const parts = mimeType.split('/')
  if (parts.length > 1) {
    return parts[1].toUpperCase().substring(0, 4) // Fallback to first 4 chars of subtype
  }
  return 'File'
}

/**
 * Main Vault page.
 *
 * Stage 1: Uses Dexie.js for local persistence.
 * View state transitions: 'list' <-> 'add_password' | 'add_note' | 'add_file' | 'edit_X' | 'detail'
 */
export function VaultPage({ onLock }) {
  const [activeNav, setActiveNav] = useState('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  // View state management
  const [currentView, setCurrentView] = useState('list') 
  const [selectedItemId, setSelectedItemId] = useState(null)

  // Inline error state for quota/storage issues
  const [storageError, setStorageError] = useState(null)

  // Fetch all collections from Dexie.
  const rawPasswords = useLiveQuery(() => db.passwords.toArray()) || []
  const rawNotes = useLiveQuery(() => db.notes.toArray()) || []
  const rawFiles = useLiveQuery(() => db.files.toArray()) || []

  // Combine and inject types (if missing)
  const allItems = [
    ...rawPasswords.map(p => ({ ...p, type: 'password' })),
    ...rawNotes.map(n => ({ ...n, type: 'note' })),
    ...rawFiles.map(f => ({ ...f, type: 'file' }))
  ]

  // Derived state
  const selectedItem = selectedItemId ? allItems.find(i => i.id === selectedItemId) : null

  // Filter based on activeNav
  let itemsToDisplay = allItems
  if (activeNav === 'passwords') itemsToDisplay = allItems.filter(i => i.type === 'password')
  else if (activeNav === 'notes') itemsToDisplay = allItems.filter(i => i.type === 'note')
  else if (activeNav === 'files') itemsToDisplay = allItems.filter(i => i.type === 'file')

  // Search filter and sort
  const filtered = itemsToDisplay.filter((item) => {
    const q = search.toLowerCase()
    if (!q) return true
    const title = (item.name || item.title || '').toLowerCase()
    const username = (item.username || '').toLowerCase()
    const url = (item.website || '').toLowerCase()
    return title.includes(q) || username.includes(q) || url.includes(q)
  }).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))

  // Determine what type of item to add based on current navigation
  const getAddViewType = () => {
    if (activeNav === 'notes') return 'add_note'
    if (activeNav === 'files') return 'add_file'
    return 'add_password' // default for 'all' and 'passwords'
  }

  // Generic Save Handler for all types
  const handleSave = async (formData, specificType = null) => {
    setStorageError(null)
    try {
      const now = Date.now()
      
      // Determine what type we are operating on
      let opType = specificType
      if (!opType) {
        if (currentView.includes('password')) opType = 'password'
        else if (currentView.includes('note')) opType = 'note'
        else if (currentView.includes('file')) opType = 'file'
      }

      if (currentView.startsWith('add')) {
        const payload = {
          id: crypto.randomUUID(),
          ...formData,
          createdAt: now,
          updatedAt: now
        }
        
        if (opType === 'password') await db.passwords.add(payload)
        else if (opType === 'note') await db.notes.add(payload)
        else if (opType === 'file') await db.files.add(payload)
      } else if (currentView.startsWith('edit') && selectedItem) {
        const payload = {
          ...formData,
          updatedAt: now
        }

        if (selectedItem.type === 'password') await db.passwords.update(selectedItem.id, payload)
        else if (selectedItem.type === 'note') await db.notes.update(selectedItem.id, payload)
        else if (selectedItem.type === 'file') await db.files.update(selectedItem.id, payload)
      }
      
      // Return to list or detail view
      if (currentView.startsWith('add')) {
        setCurrentView('list')
      } else {
        setCurrentView('detail')
      }
    } catch (error) {
      console.error('Failed to save item:', error)
      // Check for QuotaExceededError or general storage failure
      if (error.name === 'QuotaExceededError' || error.message.includes('Quota')) {
        setStorageError('Storage quota exceeded. Your browser does not have enough space to save this file locally.')
      } else {
        setStorageError(`Failed to save: ${error.message || error}`)
      }
    }
  }

  const handleDelete = async (id, type) => {
    setStorageError(null)
    try {
      if (type === 'password') await db.passwords.delete(id)
      else if (type === 'note') await db.notes.delete(id)
      else if (type === 'file') await db.files.delete(id)
      
      setSelectedItemId(null)
      setCurrentView('list')
    } catch (error) {
      console.error('Delete failed:', error)
      setStorageError(`Failed to delete: ${error.message}`)
    }
  }

  // Formatting helpers for the List View
  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getItemDisplayName = (item) => {
    if (item.type === 'note') return item.title
    return item.name // password and file use 'name'
  }

  const getItemDetailsText = (item) => {
    if (item.type === 'password') return item.username || '—'
    if (item.type === 'note') return 'Secure Note'
    if (item.type === 'file') return `${shortFileType(item.type)} · ${formatSize(item.size)}`
    return '—'
  }

  // Renders the main content area based on currentView
  const renderMainContent = () => {
    
    // RENDER FORMS
    if (currentView === 'add_password' || currentView === 'edit_password') {
      return <PasswordForm initialData={currentView === 'edit_password' ? selectedItem : null} onSave={handleSave} onCancel={() => setCurrentView(currentView === 'add_password' ? 'list' : 'detail')} />
    }
    if (currentView === 'add_note' || currentView === 'edit_note') {
      return <NoteForm initialData={currentView === 'edit_note' ? selectedItem : null} onSave={handleSave} onCancel={() => setCurrentView(currentView === 'add_note' ? 'list' : 'detail')} />
    }
    if (currentView === 'add_file') {
      return (
        <div className="flex-1 w-full max-w-[800px] mx-auto flex flex-col relative">
           {storageError && (
            <div className="mx-4 mt-4 p-4 rounded-lg bg-error-container text-on-error-container border border-error/20 flex items-start gap-3 shadow-sm animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-error">error</span>
              <div className="flex-1">
                <p className="font-label-bold text-label-bold mb-1">Upload Failed</p>
                <p className="font-body-sm text-body-sm">{storageError}</p>
              </div>
              <button onClick={() => setStorageError(null)} className="opacity-70 hover:opacity-100">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}
          <FileForm onSave={handleSave} onCancel={() => setCurrentView('list')} />
        </div>
      )
    }

    // RENDER DETAILS
    if (currentView === 'detail' && selectedItem) {
      if (selectedItem.type === 'password') {
        return <PasswordDetail item={selectedItem} onEdit={() => setCurrentView('edit_password')} onDelete={(id) => handleDelete(id, 'password')} onBack={() => { setSelectedItemId(null); setCurrentView('list') }} />
      }
      if (selectedItem.type === 'note') {
        return <NoteDetail item={selectedItem} onEdit={() => setCurrentView('edit_note')} onDelete={(id) => handleDelete(id, 'note')} onBack={() => { setSelectedItemId(null); setCurrentView('list') }} />
      }
      if (selectedItem.type === 'file') {
        return <FileDetail item={selectedItem} onDelete={(id) => handleDelete(id, 'file')} onBack={() => { setSelectedItemId(null); setCurrentView('list') }} />
      }
    }

    // Default 'list' view
    return (
      <div className="max-w-[1200px] mx-auto relative">
        {/* Storage Error Banner on List (if deletion failed) */}
        {storageError && (
          <div className="mb-4 p-4 rounded-lg bg-error-container text-on-error-container border border-error/20 flex items-start gap-3 shadow-sm animate-[fadeIn_0.2s_ease-out]">
            <span className="material-symbols-outlined text-error">error</span>
            <div className="flex-1">
              <p className="font-label-bold text-label-bold mb-1">Operation Failed</p>
              <p className="font-body-sm text-body-sm">{storageError}</p>
            </div>
            <button onClick={() => setStorageError(null)} className="opacity-70 hover:opacity-100">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

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
            className="btn-primary flex items-center gap-2"
            aria-label="Add new vault item"
            onClick={() => {
              setStorageError(null)
              setSelectedItemId(null)
              setCurrentView(getAddViewType())
            }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {activeNav === 'files' ? 'upload_file' : 'add'}
            </span>
            <span className="hidden sm:inline">
              {activeNav === 'files' ? 'Upload File' : 'New Item'}
            </span>
          </button>
        </div>

        {/* Item table */}
        <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm">
          {/* Table header — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[40px_1.5fr_1.5fr_160px] gap-4 px-4 py-2.5 bg-[#F8F9FD] border-b border-outline-variant">
            <div />
            <div className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wide">Item Name</div>
            <div className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wide">Details</div>
            <div className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wide text-right">Last Modified</div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] block mb-4 text-outline-variant" aria-hidden="true">
                {search ? 'search_off' : activeNav === 'files' ? 'cloud_upload' : 'vault'}
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                {search ? 'No items match your search.' : `No ${activeNav} yet.`}
              </h3>
              {!search && (
                <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-sm">
                  {activeNav === 'files' 
                    ? 'Upload documents or images to securely store them offline.'
                    : 'Add items to start securing your digital life.'}
                </p>
              )}
              {!search && (
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => {
                    setSelectedItemId(null)
                    setCurrentView(getAddViewType())
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {activeNav === 'files' ? 'upload_file' : 'add'}
                  </span>
                  {activeNav === 'files' ? 'Upload File' : 'Add Item'}
                </button>
              )}
            </div>
          ) : (
            <ul role="list" aria-label="Vault items list" className="divide-y divide-outline-variant/60">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  role="listitem"
                  onClick={() => {
                    setStorageError(null)
                    setSelectedItemId(item.id)
                    setCurrentView('detail')
                  }}
                  className="hover:bg-secondary-container/20 transition-colors duration-150 cursor-pointer group"
                >
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[40px_1.5fr_1.5fr_160px] gap-4 px-4 items-center h-[52px]">
                    <span
                      className="material-symbols-outlined text-[20px] text-tertiary-container group-hover:text-primary transition-colors"
                      aria-hidden="true"
                    >
                      {itemIcon(item.type)}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-body-md text-body-md font-medium text-on-surface truncate group-hover:text-primary-container transition-colors" title={getItemDisplayName(item)}>
                        {getItemDisplayName(item)}
                      </span>
                    </div>
                    <div className={`truncate ${item.type === 'password' ? 'font-mono text-mono-label' : 'font-body-sm text-body-sm'} text-on-surface-variant`} title={getItemDetailsText(item)}>
                      {getItemDetailsText(item)}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant text-right">
                      {formatTime(item.updatedAt || item.createdAt)}
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
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="font-body-md text-body-md font-medium text-on-surface truncate">
                        {getItemDisplayName(item)}
                      </div>
                      <div className={`truncate ${item.type === 'password' ? 'font-mono text-[11px]' : 'font-body-sm text-[12px]'} text-on-surface-variant leading-tight mt-0.5`}>
                        {getItemDetailsText(item)}
                      </div>
                    </div>
                    <div className="font-label-md text-label-md text-on-surface-variant shrink-0 text-right ml-2">
                      {formatTime(item.updatedAt || item.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Item count footer */}
        {filtered.length > 0 && (
          <div className="mt-3 font-label-md text-label-md text-on-surface-variant text-right" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            {search ? ` matching "${search}"` : ''}
          </div>
        )}
      </div>
    )
  }

  // Handle navigation from sidebar to ensure we go back to list and clear search
  const handleNavSelect = (id) => {
    setActiveNav(id)
    setCurrentView('list')
    setSearch('')
    setStorageError(null)
  }

  return (
    <div className="flex h-full overflow-hidden bg-surface">
      {/* Sidebar (desktop fixed / mobile drawer) */}
      <Sidebar
        activeItem={activeNav}
        onNavSelect={handleNavSelect}
        onLock={onLock}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 md:ml-sidebar-width h-full overflow-hidden relative">
        {/* Top bar */}
        <TopBar
          onMenuToggle={() => setMobileMenuOpen(true)}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val)
            if (currentView !== 'list') setCurrentView('list')
          }}
        />

        {/* Content canvas */}
        <main
          id="vault-main-content"
          className="flex-1 overflow-y-auto p-container-padding bg-surface"
          aria-label="Vault content"
        >
          {renderMainContent()}
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
              onClick={() => handleNavSelect(item.id)}
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
