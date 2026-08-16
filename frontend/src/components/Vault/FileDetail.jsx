import { useState, useEffect } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

/**
 * Detail view for a File entry.
 *
 * Props:
 *   item: The file object to display (from the encrypted vault).
 *   onDelete: (Function) Called when "Delete" is clicked.
 *   onBack: (Function) Called to return to the list (used mainly on mobile).
 */
export function FileDetail({ item, onDelete, onBack }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Create an object URL when the component mounts and the blob is available
    let url = null
    if (item && item.blob) {
      url = URL.createObjectURL(item.blob)
      setObjectUrl(url)
    }

    // Cleanup: revoke the URL when the component unmounts to free memory
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [item])

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const timeString = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  // Basic check if it's an image we can preview directly
  const isImage = item.mimeType && item.mimeType.startsWith('image/')

  return (
    <div className="flex-1 flex flex-col p-container-padding overflow-y-auto w-full max-w-[800px] mx-auto">
      
      {/* Mobile back button */}
      <button 
        className="lg:hidden flex items-center gap-2 text-primary font-headline-sm text-headline-sm mb-4"
        onClick={onBack}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
        Back to list
      </button>

      <section className="flex flex-col bg-surface-bright border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {/* Detail Header */}
        <div className="px-6 py-6 border-b border-outline-variant bg-[#F8F9FD] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-surface border border-outline-variant flex items-center justify-center shrink-0 shadow-sm overflow-hidden text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px]">{isImage ? 'image' : 'draft'}</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-lg text-headline-lg text-[#022B3A] m-0 truncate" title={item.name}>{item.name}</h2>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-2">
                <span>{item.mimeType || 'Unknown Type'}</span>
                <span>&bull;</span>
                <span>{formatSize(item.size)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start shrink-0">
            {objectUrl && (
              <a 
                href={objectUrl} 
                download={item.name}
                className="h-8 px-3 rounded-md bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-1.5 no-underline"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download
              </a>
            )}
            <button 
              onClick={() => setIsConfirmOpen(true)}
              className="h-8 px-3 rounded-md bg-surface border border-outline-variant text-error font-label-md text-label-md hover:bg-error-container hover:border-error-container transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          </div>
        </div>

        {/* Detail Body (Preview) */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center bg-surface-container-lowest min-h-[300px]">
          {isImage && objectUrl ? (
            <div className="max-w-full max-h-[500px] rounded-lg overflow-hidden border border-outline-variant shadow-sm flex items-center justify-center bg-surface-container-highest">
              <img src={objectUrl} alt={item.name} className="max-w-full max-h-[500px] object-contain" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-on-surface-variant max-w-sm text-center">
              <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">description</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">No Preview Available</h3>
              <p className="font-body-md text-body-md">
                Preview is not available for this file type in Stage 1. Download the file to view its contents securely.
              </p>
              {objectUrl && (
                <a 
                  href={objectUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-6 px-4 py-2 border border-outline-variant rounded-lg text-primary hover:bg-primary-container/10 transition-colors font-label-md text-label-md inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Open in Browser
                </a>
              )}
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="px-6 py-4 border-t border-outline-variant bg-[#F8F9FD] flex flex-wrap items-center justify-between text-body-sm font-body-sm text-outline gap-4">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">update</span>
            Added to Vault {timeString}
          </div>
        </div>
      </section>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Delete file?"
        message={<span><span className="font-label-bold text-on-surface">{item.name}</span> will be permanently removed from your vault.</span>}
        confirmText="Delete"
        cancelText="Cancel"
        isProcessing={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true)
          try {
            await onDelete(item.id)
          } catch {
            // Parent (VaultPage) surfaces the failure; ensure dialog closes.
          } finally {
            setIsDeleting(false)
            setIsConfirmOpen(false)
          }
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  )
}
