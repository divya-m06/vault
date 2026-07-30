/**
 * Button component — maps to Vault's design-system button variants.
 *
 * Props:
 *   variant  — 'primary' | 'secondary' | 'icon'  (default: 'primary')
 *   loading  — shows a spinner and disables the button
 *   children — button content
 *   ...rest  — any standard <button> HTML attributes
 */
export function Button({ variant = 'primary', loading = false, children, className = '', disabled, ...props }) {
  const base =
    variant === 'primary'   ? 'btn-primary'   :
    variant === 'secondary' ? 'btn-secondary'  :
                              'btn-icon'

  return (
    <button
      className={`${base} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
          progress_activity
        </span>
      )}
      {children}
    </button>
  )
}
