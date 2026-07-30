import { useEffect, useRef } from 'react'

/**
 * Reusable confirmation dialog for destructive actions (e.g., Delete).
 * 
 * Props:
 *   isOpen: (Boolean) Whether the dialog is visible.
 *   title: (String) Dialog header title.
 *   message: (ReactNode) Main descriptive text.
 *   confirmText: (String) Text for the confirm button.
 *   cancelText: (String) Text for the cancel button.
 *   isDestructive: (Boolean) If true, the confirm button uses destructive styling (red).
 *   isProcessing: (Boolean) If true, disables buttons to prevent double submission.
 *   onConfirm: (Function) Called when confirm is clicked.
 *   onCancel: (Function) Called when cancel or backdrop/escape is clicked.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isProcessing = false,
  onConfirm,
  onCancel
}) {
  const dialogRef = useRef(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, isProcessing])

  // Trap focus basic implementation
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      // Small timeout to ensure render before focus
      setTimeout(() => {
        const confirmBtn = dialogRef.current.querySelector('button[data-confirm]')
        if (confirmBtn) confirmBtn.focus()
      }, 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 backdrop-blur-[2px] p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div 
        ref={dialogRef}
        className="w-full max-w-[400px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg flex flex-col overflow-hidden"
      >
        <div className="px-6 py-5">
          <h2 id="confirm-dialog-title" className="font-headline-sm text-headline-sm text-on-surface mb-2">
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="px-6 py-4 bg-surface-bright border-t border-surface-container-high flex justify-end gap-3 items-center">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="h-[36px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-[#BFDBF7] hover:border-[#BFDBF7] transition-colors font-label-md text-label-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          
          <button
            data-confirm
            onClick={onConfirm}
            disabled={isProcessing}
            className={`h-[36px] px-4 rounded-xl font-label-md text-label-md flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
              ${isDestructive 
                ? 'bg-error text-on-error hover:bg-[#93000a]' // using error colors
                : 'bg-primary-container text-on-primary hover:bg-primary'
              }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
