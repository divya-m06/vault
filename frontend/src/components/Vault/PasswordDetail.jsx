import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

/**
 * Detail view for a password entry.
 *
 * Props:
 *   item: The password object to display.
 *   onEdit: (Function) Called when "Edit" is clicked.
 *   onDelete: (Function) Called when "Delete" is clicked.
 *   onBack: (Function) Called to return to the list (used mainly on mobile if no sidebar list is present).
 */
export function PasswordDetail({ item, onEdit, onDelete, onBack }) {
  const [showPassword, setShowPassword] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCopy = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      // Fallback for non-secure contexts if needed
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

  // Format the last updated time. Just a simple localized string for Stage 1.
  const timeString = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  // A simple placeholder for strength
  const getStrengthUI = () => {
    // For Stage 1 we'll just hardcode it to "Strong" visually since we aren't grading passwords yet.
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex w-16 h-1 bg-[#1F7A8C] rounded-full"></span>
        <span className="inline-flex w-16 h-1 bg-[#1F7A8C] rounded-full"></span>
        <span className="inline-flex w-16 h-1 bg-[#1F7A8C] rounded-full"></span>
        <span className="inline-flex w-16 h-1 bg-outline-variant rounded-full"></span>
        <span className="font-label-md text-label-md text-on-surface-variant ml-1">Strong</span>
      </div>
    )
  }

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
              {/* If it's a known service, we could show a logo. For now, a generic icon */}
              <span className="material-symbols-outlined text-[32px]">public</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-[#022B3A] m-0 break-all">{item.name}</h2>
              {item.website && (
                <a 
                  className="font-body-md text-body-md text-primary-container hover:underline flex items-center gap-1 mt-1 inline-flex break-all" 
                  href={item.website.startsWith('http') ? item.website : `https://${item.website}`} 
                  target="_blank" 
                  rel="noreferrer"
                >
                  {item.website.replace(/^https?:\/\//, '')}
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              )}
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

        {/* Detail Body (Form-like presentation) */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          
          {/* Username Field */}
          {item.username && (
            <div className="group">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Username / Email</label>
              <div className="relative flex items-center">
                <div className="w-full min-h-[40px] px-3 py-2 border border-outline-variant rounded-md bg-surface text-body-md font-body-md text-on-surface flex items-center group-hover:border-primary-container transition-colors break-all pr-12">
                  {item.username}
                </div>
                <button 
                  onClick={() => handleCopy(item.username)}
                  className="absolute right-2 p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-primary-container/10 rounded transition-colors" 
                  title="Copy Username"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            </div>
          )}

          {/* Password Field */}
          {item.password && (
            <div className="group">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Password</label>
              <div className="relative flex items-center">
                <div className="w-full min-h-[40px] px-3 py-2 border border-outline-variant rounded-md bg-surface text-mono-label font-mono-label text-on-surface flex items-center group-hover:border-primary-container transition-colors tracking-widest break-all pr-24">
                  {showPassword ? item.password : '•'.repeat(Math.max(8, item.password.length))}
                </div>
                <div className="absolute right-2 flex items-center gap-1 bg-surface pl-2">
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-primary-container/10 rounded transition-colors" 
                    title="Show Password"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant/50 mx-1"></div>
                  <button 
                    onClick={() => handleCopy(item.password)}
                    className="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-primary-container/10 rounded transition-colors" 
                    title="Copy Password"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>
              </div>
              {getStrengthUI()}
            </div>
          )}

          {/* Divider */}
          {(item.notes || (item.username && item.password)) && (
            <hr className="border-outline-variant/50 my-2" />
          )}

          {/* Notes Field */}
          {item.notes && (
            <div className="group">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Secure Notes</label>
              <div className="w-full min-h-[80px] px-3 py-2 border border-outline-variant rounded-md bg-surface text-body-md font-body-md text-on-surface group-hover:border-primary-container transition-colors whitespace-pre-wrap break-words">
                {item.notes}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="mt-auto pt-6 flex flex-wrap items-center justify-between text-body-sm font-body-sm text-outline gap-4">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">update</span>
              Last updated {timeString}
            </div>
            {/* Keeping View History as a static stub for the design */}
            <div className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined text-[14px]">history</span>
              View History
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Delete password?"
        message={<span>“<span className="font-label-bold text-on-surface">{item.name}</span>” will be permanently removed from this device.</span>}
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
