import { forwardRef, useState } from 'react'

/**
 * Input component — styled to Vault's design (white bg, lavender border, teal focus ring).
 *
 * Props:
 *   label      — optional label text rendered above the input
 *   error      — optional error message rendered below the input
 *   showToggle — if true, renders a password visibility toggle button (use for password fields)
 *   id, type   — standard input attributes
 *   ...rest    — any other standard <input> HTML attributes
 *
 * Uses React.forwardRef so parent components can attach a ref to the <input> element.
 */
export const Input = forwardRef(function Input(
  { label, error, showToggle = false, type = 'text', id, className = '', ...props },
  ref
) {
  // tracks whether the password is currently visible (only relevant when showToggle=true)
  const [visible, setVisible] = useState(false)
  const inputType = showToggle ? (visible ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-label-md text-on-surface font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={inputType}
          className={`vault-input
            ${error ? 'border-error focus:ring-error focus:border-error' : ''}
            ${showToggle ? 'pr-10' : ''}
            ${className}`}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {visible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-label-md text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
