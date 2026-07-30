import { useState, useEffect } from 'react'

/**
 * A form to create or edit a password entry.
 *
 * Props:
 *   initialData: (Optional) If provided, populates the form for editing.
 *   onSave: (Function) Called with the form data when "Save" is clicked.
 *   onCancel: (Function) Called when "Cancel" is clicked.
 */
export function PasswordForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    website: '',
    notes: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  // Populate form if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        username: initialData.username || '',
        password: initialData.password || '',
        website: initialData.website || '',
        notes: initialData.notes || ''
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Basic validation
    if (!formData.name.trim()) {
      alert('Name / Service is required.')
      return
    }
    onSave(formData)
  }

  const handleGeneratePassword = () => {
    // Simple 16-char generator for Stage 1 (not cryptographically secure, just for UX completeness)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, password: pass }))
  }

  return (
    <div className="flex-1 flex justify-center p-container-padding overflow-y-auto w-full">
      <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-container-padding mt-4">
        
        {/* Top contextual header (from design) - we can place this here or in VaultPage, but keeping it inside the form container makes layout easier */}
        <div className="flex items-center gap-component-gap-md text-on-surface font-headline-sm text-headline-sm mb-2">
          {initialData ? 'Edit Password' : 'New Password'}
        </div>

        {/* Item Details Section */}
        <div className="flex flex-col gap-component-gap-md border border-outline-variant bg-surface-container-lowest rounded-DEFAULT p-container-padding">
          <div className="border-b border-outline-variant pb-3 mb-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Item Details</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-gutter">
            {/* Field: Name/Service */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="name">Name / Service</label>
              <input
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Google, Amazon"
                type="text"
                className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-[36px] px-3"
                required
              />
            </div>

            {/* Field: Username/Email */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="username">Username / Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">person</span>
                <input
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  type="text"
                  className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-[36px] pl-9 pr-3 w-full"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">key</span>
                  <input
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-mono text-mono-label text-on-surface h-[36px] pl-9 pr-10 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface flex items-center justify-center h-full"
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="h-[36px] px-3 border border-outline-variant rounded-xl bg-surface-container-lowest hover:bg-surface-variant text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Generate
                </button>
              </div>
            </div>

            {/* Field: Website URL */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="website">Website URL</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">link</span>
                <input
                  id="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://"
                  type="url"
                  className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-[36px] pl-9 pr-3 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="flex flex-col gap-component-gap-md border border-outline-variant bg-surface-container-lowest rounded-DEFAULT p-container-padding">
          <div className="border-b border-outline-variant pb-3 mb-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Additional Information</h2>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="notes">Secure Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any private notes here..."
              rows="4"
              className="border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary-container focus:ring focus:ring-primary-container/20 font-body-md text-body-md text-on-surface h-auto py-2 px-3 resize-none w-full"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 mt-4 border-t border-outline-variant pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-[36px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-[#BFDBF7] hover:border-[#BFDBF7] transition-colors font-label-md text-label-md flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-[36px] px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center hover:bg-primary transition-colors gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
            Save to Vault
          </button>
        </div>
      </form>
    </div>
  )
}
