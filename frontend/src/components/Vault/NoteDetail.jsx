import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

/**
 * Detail view for a Secure Note entry.
 *
 * Props:
 *   item: The note object to display.
 *   onEdit: (Function) Called when "Edit" is clicked.
 *   onDelete: (Function) Called when "Delete" is clicked.
 *   onBack: (Function) Called to return to the list (used mainly on mobile).
 */
export function NoteDetail({ item, onEdit, onDelete, onBack }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCopy = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }
  }

  const timeString = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

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
              <span className="material-symbols-outlined text-[32px]">description</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-[#022B3A] m-0 break-all">{item.title}</h2>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Secure Note
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button 
              onClick={onEdit}
              className="h-8 px-3 rounded-md bg-surface border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-[#BFDBF7] hover:border-[#BFDBF7] transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit
            </button>
            <button 
              onClick={() => setIsConfirmOpen(true)}
              className="h-8 px-3 rounded-md bg-surface border border-outline-variant text-error font-label-md text-label-md hover:bg-error-container hover:border-error-container transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          </div>
        </div>

        {/* Detail Body */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          {item.content && (
            <div className="group relative">
              <button 
                onClick={() => handleCopy(item.content)}
                className="absolute top-2 right-2 p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-primary-container/10 rounded transition-colors bg-surface/80" 
                title="Copy Content"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
              <div className="w-full min-h-[120px] px-4 py-4 border border-outline-variant rounded-md bg-surface text-body-lg font-body-lg text-on-surface group-hover:border-primary-container transition-colors whitespace-pre-wrap break-words leading-relaxed">
                {item.content}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="mt-auto pt-6 flex flex-wrap items-center justify-between text-body-sm font-body-sm text-outline gap-4">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">update</span>
              Last updated {timeString}
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Delete note?"
        message={<span>“<span className="font-label-bold text-on-surface">{item.title}</span>” will be permanently removed from this device.</span>}
        confirmText="Delete"
        cancelText="Cancel"
        isProcessing={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true)
          await onDelete(item.id)
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  )
}
